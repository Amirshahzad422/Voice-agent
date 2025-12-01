# Voice Meeting Agent - Project Summary

## ✅ Completed Features

### Core Functionality
- ✅ Voice-only interface (no typing required)
- ✅ Speech-to-Text using browser Web Speech API
- ✅ Text-to-Speech using browser Speech Synthesis API
- ✅ LangChain-powered conversational agent
- ✅ Meeting scheduling with natural conversation
- ✅ List upcoming meetings
- ✅ Reschedule meetings by voice

### User Flows Implemented

#### 1. Main Greeting
- Agent greets user by name on page load
- Name is saved in localStorage for future visits

#### 2. Schedule New Meeting
- User says "Schedule a meeting" or similar
- Agent asks conversationally (one question at a time):
  - Meeting title/purpose
  - Date & time (IST timezone)
  - Duration
  - Optional notes
- Agent confirms all details in one sentence
- User confirms → Meeting saved

#### 3. List Meetings
- User says "What meetings do I have?" or "Show my calendar"
- Agent reads upcoming meetings in order
- Agent asks if user wants to reschedule

#### 4. Reschedule Meeting
- User says "Move [meeting] to [new time]" or "Reschedule [meeting]"
- Agent identifies the meeting
- Agent confirms new time
- Meeting updated in database

## Tech Stack

- **Frontend**: React 18 + Vite
- **Backend**: Node.js + Express
- **AI/LLM**: LangChain + OpenAI GPT-4
- **Voice STT**: Browser Web Speech API
- **Voice TTS**: Browser Speech Synthesis API
- **Database**: Supabase (PostgreSQL) with mock fallback

## Project Structure

```
voice-meeting-agent/
├── client/                    # React frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── VoiceAgent.jsx    # Main voice interface
│   │   │   └── VoiceAgent.css
│   │   ├── App.jsx              # Name input & routing
│   │   ├── App.css
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── server/                     # Node.js backend
│   ├── index.js               # Express API server
│   ├── agent.js               # LangChain agent logic
│   ├── db.js                  # Database abstraction
│   ├── schema.sql             # Supabase schema
│   └── package.json
├── package.json               # Root package.json
├── README.md                  # Full documentation
├── SETUP.md                   # Quick setup guide
└── .gitignore
```

## API Endpoints

- `GET /api/meetings` - Get all meetings
- `POST /api/meetings` - Create a new meeting
- `PUT /api/meetings/:id` - Update a meeting
- `DELETE /api/meetings/:id` - Delete a meeting
- `POST /api/chat` - Main agent endpoint (processes voice input)

## Meeting Data Structure

```json
{
  "title": "Q4 Planning",
  "datetime": "2025-12-05T15:00:00+05:30",
  "duration_minutes": 60,
  "notes": "Discuss budget and roadmap",
  "created_at": "2025-11-21T10:00:00Z"
}
```

## Key Implementation Details

### Voice Interface
- Uses browser's native Web Speech API (Chrome/Edge recommended)
- Real-time speech recognition with visual feedback
- Text-to-speech for agent responses
- Status indicators (listening, processing, speaking)

### LangChain Agent
- Uses OpenAI GPT-4 for natural conversation
- Extracts meeting details from conversational input
- Handles date/time parsing with IST timezone
- Maintains conversation context

### Database
- Supabase integration for production
- Mock in-memory database for development (no setup required)
- Automatic fallback if Supabase not configured

## Getting Started

1. Install dependencies: `npm run install:all`
2. Configure `.env` in `server/` directory (see SETUP.md)
3. Run: `npm run dev`
4. Open http://localhost:3000 in Chrome/Edge

## Browser Compatibility

- ✅ Chrome/Edge: Full support (recommended)
- ⚠️ Firefox: Limited speech recognition
- ⚠️ Safari: Limited speech recognition

## Next Steps / Future Enhancements

- [ ] Add wake word detection ("Hey Assistant")
- [ ] Implement streaming responses for faster feedback
- [ ] Add voice activity detection (VAD)
- [ ] Support multiple users with authentication
- [ ] Add meeting reminders/notifications
- [ ] Export calendar to Google Calendar/iCal
- [ ] Add meeting participants/attendees
- [ ] Voice commands for canceling meetings
- [ ] Multi-language support

## Notes

- The agent uses LangChain for all conversation logic (as required)
- Mock database allows development without Supabase setup
- All voice processing happens client-side (no external STT/TTS APIs needed)
- OpenAI API key is required for the LangChain agent to function


