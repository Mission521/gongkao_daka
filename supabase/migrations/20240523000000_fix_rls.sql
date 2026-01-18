-- Enable RLS for tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE clockins ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- Users policies
-- Allow everyone to view basic user info (for displaying names in feeds)
DROP POLICY IF EXISTS "Users are viewable by everyone" ON users;
CREATE POLICY "Users are viewable by everyone" 
ON users FOR SELECT 
USING (true);

-- Allow users to update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON users;
CREATE POLICY "Users can update own profile" 
ON users FOR UPDATE 
USING (auth.uid() = id);

-- Allow users to insert their own profile (usually handled by triggers but good to have)
DROP POLICY IF EXISTS "Users can insert own profile" ON users;
CREATE POLICY "Users can insert own profile" 
ON users FOR INSERT 
WITH CHECK (auth.uid() = id);


-- Clockins policies
-- Allow everyone to view all clockins (public feed)
DROP POLICY IF EXISTS "Clockins are viewable by everyone" ON clockins;
CREATE POLICY "Clockins are viewable by everyone" 
ON clockins FOR SELECT 
USING (true);

-- Allow authenticated users to insert clockins
DROP POLICY IF EXISTS "Authenticated users can insert clockins" ON clockins;
CREATE POLICY "Authenticated users can insert clockins" 
ON clockins FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Allow users to update/delete their own clockins
DROP POLICY IF EXISTS "Users can update own clockins" ON clockins;
CREATE POLICY "Users can update own clockins" 
ON clockins FOR UPDATE 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own clockins" ON clockins;
CREATE POLICY "Users can delete own clockins" 
ON clockins FOR DELETE 
USING (auth.uid() = user_id);


-- Announcements policies
-- Allow everyone to view announcements
DROP POLICY IF EXISTS "Announcements are viewable by everyone" ON announcements;
CREATE POLICY "Announcements are viewable by everyone" 
ON announcements FOR SELECT 
USING (true);

-- Allow authenticated users (for now, ideally admins) to insert/update/delete announcements
-- Assuming we trust all logged-in users for this small app, or we can check a specific user ID if needed.
-- For now, let's allow all authenticated users to manage announcements as requested.
DROP POLICY IF EXISTS "Authenticated users can insert announcements" ON announcements;
CREATE POLICY "Authenticated users can insert announcements" 
ON announcements FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can update announcements" ON announcements;
CREATE POLICY "Authenticated users can update announcements" 
ON announcements FOR UPDATE 
USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can delete announcements" ON announcements;
CREATE POLICY "Authenticated users can delete announcements" 
ON announcements FOR DELETE 
USING (auth.role() = 'authenticated');
