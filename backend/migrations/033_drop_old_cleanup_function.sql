-- Drop previous auto-delete cleanup function and any pg_cron job
DO $$
BEGIN
    -- 1. Unschedule cron job if pg_cron is enabled
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        PERFORM cron.unschedule(jobid) 
        FROM cron.job 
        WHERE command ILIKE '%cleanup_old_messages%' OR jobname ILIKE '%cleanup_old_messages%';
    END IF;
END $$;

-- 2. Drop the old function
DROP FUNCTION IF EXISTS public.cleanup_old_messages() CASCADE;
