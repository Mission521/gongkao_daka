-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the cleanup task to run daily at 3:00 AM
-- We use a DO block to avoid error if the job already exists (though cron.schedule usually updates)
SELECT cron.schedule(
    'daily-message-cleanup',
    '0 3 * * *',
    'SELECT public.delete_old_notifications()'
);
