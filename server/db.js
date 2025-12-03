import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('Supabase credentials not found. Using mock database.');
}

export const supabaseClient = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null;

// Mock database for development/testing
const mockMeetings = [];

export const mockDb = {
  async getMeetings() {
    return { data: [...mockMeetings], error: null };
  },

  async createMeeting(meeting) {
    const newMeeting = {
      id: Date.now().toString(),
      ...meeting,
      participants: meeting.participants || [],
      category: meeting.category || 'other',
      location: meeting.location || null,
      reminder_minutes: meeting.reminder_minutes || 15,
      is_recurring: meeting.is_recurring || false,
      recurrence_pattern: meeting.recurrence_pattern || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    mockMeetings.push(newMeeting);
    return { data: newMeeting, error: null };
  },

  async updateMeeting(id, updates) {
    const index = mockMeetings.findIndex(m => m.id === id);
    if (index === -1) {
      return { data: null, error: { message: 'Meeting not found' } };
    }
    mockMeetings[index] = { 
      ...mockMeetings[index], 
      ...updates,
      updated_at: new Date().toISOString()
    };
    return { data: mockMeetings[index], error: null };
  },

  async deleteMeeting(id) {
    const index = mockMeetings.findIndex(m => m.id === id);
    if (index === -1) {
      return { error: { message: 'Meeting not found' } };
    }
    mockMeetings.splice(index, 1);
    return { error: null };
  }
};

// Database helper functions
export async function getMeetings() {
  if (supabaseClient) {
    return await supabaseClient
      .from('meetings')
      .select('*')
      .order('datetime', { ascending: true });
  }
  return await mockDb.getMeetings();
}

export async function createMeeting(meetingData) {
  if (supabaseClient) {
    return await supabaseClient
      .from('meetings')
      .insert([meetingData])
      .select()
      .single();
  }
  return await mockDb.createMeeting(meetingData);
}

export async function updateMeeting(id, updates) {
  if (supabaseClient) {
    return await supabaseClient
      .from('meetings')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
  }
  return await mockDb.updateMeeting(id, updates);
}

export async function deleteMeeting(id) {
  if (supabaseClient) {
    return await supabaseClient
      .from('meetings')
      .delete()
      .eq('id', id);
  }
  return await mockDb.deleteMeeting(id);
}

