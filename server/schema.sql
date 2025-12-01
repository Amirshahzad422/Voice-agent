-- Supabase PostgreSQL Schema for meetings table
-- Run this in your Supabase SQL editor if using Supabase

CREATE TABLE IF NOT EXISTS meetings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  datetime TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_meetings_datetime ON meetings(datetime);

-- Enable Row Level Security (optional, adjust as needed)
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;

-- Policy to allow all operations (adjust for production)
CREATE POLICY "Allow all operations" ON meetings
  FOR ALL
  USING (true)
  WITH CHECK (true);


