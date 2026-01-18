-- Drop the unique constraint that limits users to one clock-in per day
ALTER TABLE clockins DROP CONSTRAINT IF EXISTS unique_user_date;
