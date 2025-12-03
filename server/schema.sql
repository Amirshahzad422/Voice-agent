-- Supabase PostgreSQL Schema for meetings table
-- Run this in your Supabase SQL editor if using Supabase

CREATE TABLE IF NOT EXISTS meetings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  datetime TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL,
  notes TEXT,
  participants TEXT[], -- Array of participant names/emails
  category TEXT CHECK (category IN ('work', 'personal', 'urgent', 'other')),
  location TEXT, -- Meeting location or virtual link
  reminder_minutes INTEGER DEFAULT 15, -- Minutes before meeting to remind
  is_recurring BOOLEAN DEFAULT FALSE,
  recurrence_pattern TEXT, -- daily, weekly, monthly, etc.
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
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


