-- Create access_logs table
CREATE TABLE access_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  action VARCHAR(255) NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE access_logs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert logs
CREATE POLICY "Authenticated users can insert logs" 
ON access_logs FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Allow admins (or everyone for now for simplicity of debugging) to view logs
-- In a real app, strict restriction is needed.
CREATE POLICY "Users can view own logs" 
ON access_logs FOR SELECT 
USING (auth.uid() = user_id);
