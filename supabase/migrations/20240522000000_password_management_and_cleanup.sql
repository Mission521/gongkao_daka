-- Enable pgcrypto for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Create password change logs table
CREATE TABLE IF NOT EXISTS public.password_change_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create message cleanup logs table
CREATE TABLE IF NOT EXISTS public.message_cleanup_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    deleted_count INTEGER,
    status TEXT, -- 'success', 'error'
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for logs
ALTER TABLE public.password_change_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_cleanup_logs ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own logs (optional)
CREATE POLICY "Users can view their own password logs" ON public.password_change_logs
    FOR SELECT USING (auth.uid() = user_id);

-- Allow insert from authenticated users (for client-side logging)
CREATE POLICY "Users can insert their own password logs" ON public.password_change_logs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Cleanup logs might be admin only, but for now let's allow read for all authenticated (or restrict)
CREATE POLICY "Authenticated can view cleanup logs" ON public.message_cleanup_logs
    FOR SELECT TO authenticated USING (true);

-- 3. Function to reset password to default 'daka123456'
-- WARNING: This function allows resetting any user's password if they know the email.
-- In a production environment, this should be restricted to admins or require additional verification.
CREATE OR REPLACE FUNCTION public.reset_password_to_default(user_email TEXT)
RETURNS TABLE (success BOOLEAN, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER -- Run as owner (postgres) to access auth.users
AS $$
DECLARE
    target_user_id UUID;
BEGIN
    -- Check if user exists
    SELECT id INTO target_user_id FROM auth.users WHERE email = user_email;
    
    IF target_user_id IS NULL THEN
        RETURN QUERY SELECT false, '用户不存在';
        RETURN;
    END IF;

    -- Update password to 'daka123456'
    -- Note: Supabase uses bcrypt. We need pgcrypto extension.
    -- If pgcrypto is not enabled, enable it: CREATE EXTENSION IF NOT EXISTS pgcrypto;
    
    UPDATE auth.users
    SET encrypted_password = crypt('daka123456', gen_salt('bf'))
    WHERE id = target_user_id;

    -- Log the action
    INSERT INTO public.password_change_logs (user_id, action)
    VALUES (target_user_id, 'password_reset_by_forgot_function');

    RETURN QUERY SELECT true, '密码已重置';
END;
$$;

-- 4. Function to cleanup old notifications
CREATE OR REPLACE FUNCTION public.delete_old_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_rows INTEGER;
BEGIN
    -- Delete notifications older than 5 days
    WITH deleted AS (
        DELETE FROM public.notifications
        WHERE created_at < (now() - INTERVAL '5 days')
        RETURNING *
    )
    SELECT count(*) INTO deleted_rows FROM deleted;

    -- Log the cleanup
    INSERT INTO public.message_cleanup_logs (deleted_count, status)
    VALUES (deleted_rows, 'success');

EXCEPTION WHEN OTHERS THEN
    -- Log error
    INSERT INTO public.message_cleanup_logs (deleted_count, status, error_message)
    VALUES (0, 'error', SQLERRM);
END;
$$;

-- 5. Schedule the cleanup task (requires pg_cron extension)
-- Enable pg_cron if not enabled (usually requires superuser, might fail in some environments if not pre-installed)
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule to run daily at 3:00 AM
-- SELECT cron.schedule('daily-message-cleanup', '0 3 * * *', 'SELECT public.delete_old_notifications()');

-- Grant execute permission to anon and authenticated for the reset function (since it's used in Forgot Password page)
GRANT EXECUTE ON FUNCTION public.reset_password_to_default(TEXT) TO anon, authenticated;
