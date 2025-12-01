import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { meetingAgent } from './agent.js';
import { getMeetings, createMeeting, updateMeeting, deleteMeeting } from './db.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Get all meetings
app.get('/api/meetings', async (req, res) => {
  try {
    const result = await getMeetings();
    if (result.error) throw result.error;
    res.json(result.data || []);
  } catch (error) {
    console.error('Error fetching meetings:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create a new meeting
app.post('/api/meetings', async (req, res) => {
  try {
    const { title, datetime, duration_minutes, notes } = req.body;

    if (!title || !datetime || !duration_minutes) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await createMeeting({
      title,
      datetime,
      duration_minutes,
      notes: notes || null,
      created_at: new Date().toISOString()
    });

    if (result.error) throw result.error;
    res.json(result.data);
  } catch (error) {
    console.error('Error creating meeting:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update a meeting (for rescheduling)
app.put('/api/meetings/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, datetime, duration_minutes, notes } = req.body;

    const updateData = {};
    if (title) updateData.title = title;
    if (datetime) updateData.datetime = datetime;
    if (duration_minutes) updateData.duration_minutes = duration_minutes;
    if (notes !== undefined) updateData.notes = notes;

    const result = await updateMeeting(id, updateData);

    if (result.error) throw result.error;
    res.json(result.data);
  } catch (error) {
    console.error('Error updating meeting:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete a meeting
app.delete('/api/meetings/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await deleteMeeting(id);

    if (result.error) throw result.error;
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting meeting:', error);
    res.status(500).json({ error: error.message });
  }
});

// Main agent endpoint - processes voice input
app.post('/api/chat', async (req, res) => {
  try {
    const { message, conversationHistory } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const response = await meetingAgent.invoke({
      input: message,
      conversationHistory: conversationHistory || []
    });

    res.json({
      response: response.output,
      conversationState: response.conversationState || {}
    });
  } catch (error) {
    console.error('Error processing chat:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

