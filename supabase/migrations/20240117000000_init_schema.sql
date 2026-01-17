-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Create clockins table
CREATE TABLE IF NOT EXISTS clockins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  images JSON DEFAULT '[]',
  clockin_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_user_date UNIQUE(user_id, clockin_date)
);

CREATE INDEX IF NOT EXISTS idx_clockins_user_id ON clockins(user_id);
CREATE INDEX IF NOT EXISTS idx_clockins_date ON clockins(clockin_date DESC);

-- Create announcements table
CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_announcements_created_at ON announcements(created_at DESC);

-- Grant permissions
GRANT SELECT ON users TO anon;
GRANT ALL PRIVILEGES ON users TO authenticated;

GRANT SELECT ON clockins TO anon;
GRANT ALL PRIVILEGES ON clockins TO authenticated;

GRANT SELECT ON announcements TO anon;
GRANT ALL PRIVILEGES ON announcements TO authenticated;

-- RLS Policies
ALTER TABLE clockins ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid errors on re-run
DROP POLICY IF EXISTS "Users can view all clockins" ON clockins;
DROP POLICY IF EXISTS "Users can insert own clockins" ON clockins;
DROP POLICY IF EXISTS "Users can update own clockins" ON clockins;

CREATE POLICY "Users can view all clockins" ON clockins FOR SELECT USING (true);
CREATE POLICY "Users can insert own clockins" ON clockins FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own clockins" ON clockins FOR UPDATE USING (auth.uid() = user_id);

-- Storage bucket setup
INSERT INTO storage.buckets (id, name, public)
VALUES ('clockin-images', 'clockin-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Public Access"
  ON storage.objects FOR SELECT
  USING ( bucket_id = 'clockin-images' );

CREATE POLICY "Authenticated users can upload"
  ON storage.objects FOR INSERT
  WITH CHECK ( bucket_id = 'clockin-images' AND auth.role() = 'authenticated' );
