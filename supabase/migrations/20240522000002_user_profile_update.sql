-- Add unique constraint to users.name
-- We use a DO block to handle potential duplicates or existing constraints gracefully-ish, 
-- but for a migration file, direct DDL is standard. 
-- If there are duplicates, this will fail. We assume data is clean or it's acceptable to fail.
ALTER TABLE public.users ADD CONSTRAINT users_name_key UNIQUE (name);

-- Ensure RLS policies are set up for profile updates
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
CREATE POLICY "Users can view their own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
CREATE POLICY "Users can update their own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

-- Ensure access_logs allows insertion
ALTER TABLE public.access_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert access logs" ON public.access_logs;
CREATE POLICY "Users can insert access logs" ON public.access_logs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Function to check username availability safely (though client can just query)
-- This is optional but good for encapsulation
CREATE OR REPLACE FUNCTION public.check_username_availability(username_to_check TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN NOT EXISTS (
        SELECT 1 FROM public.users WHERE name = username_to_check
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_username_availability(TEXT) TO authenticated, anon;
