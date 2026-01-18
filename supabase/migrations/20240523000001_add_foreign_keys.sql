-- Cleanup orphan clockins records
DELETE FROM clockins
WHERE user_id NOT IN (SELECT id FROM users);

-- Cleanup orphan announcements records
DELETE FROM announcements
WHERE author_id NOT IN (SELECT id FROM users);

-- Add foreign key for clockins
ALTER TABLE clockins
ADD CONSTRAINT clockins_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES users(id)
ON DELETE CASCADE;

-- Add foreign key for announcements
ALTER TABLE announcements
ADD CONSTRAINT announcements_author_id_fkey
FOREIGN KEY (author_id)
REFERENCES users(id)
ON DELETE SET NULL;
