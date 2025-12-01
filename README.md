# Voice Meeting Scheduling Agent

A fully functional voice-only meeting scheduling agent prototype. Users interact entirely through voice - no typing required.

## Features

- 🎤 **Voice-only interface** - Speak naturally to interact
- 📅 **Schedule meetings** - Conversational meeting creation
- 📋 **List meetings** - Hear your upcoming meetings
- 🔄 **Reschedule meetings** - Move meetings with voice commands
- 🤖 **AI-powered** - Uses LangChain with OpenAI for natural conversations

## Tech Stack

- **Frontend**: React + Vite
- **Backend**: Node.js (Express)
- **AI/LLM**: LangChain + OpenAI GPT-4
- **Voice STT**: Browser Web Speech API
- **Voice TTS**: Browser Speech Synthesis API
- **Database**: Supabase (PostgreSQL) or Mock DB for development

## Prerequisites

- Node.js 18+ and npm
- OpenAI API key
- (Optional) Supabase account for production database

## Setup Instructions

### 1. Install Dependencies

```bash
npm run install:all
```

This will install dependencies for root, server, and client.

### 2. Configure Environment Variables

Create a `.env` file in the `server/` directory:

```bash
cd server
cp .env.example .env
```

Edit `server/.env` and add your credentials:

```env
OPENAI_API_KEY=your_openai_api_key_here
SUPABASE_URL=your_supabase_url_here  # Optional
SUPABASE_ANON_KEY=your_supabase_anon_key_here  # Optional
PORT=3001
```

**Note**: If you don't provide Supabase credentials, the app will use a mock in-memory database for development.

### 3. Set Up Supabase Database (Optional)

If using Supabase, create a table called `meetings`:

```sql
CREATE TABLE meetings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  datetime TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 4. Run the Application

Start both server and client in development mode:

```bash
npm run dev
```

Or run them separately:

```bash
# Terminal 1 - Backend
npm run dev:server

# Terminal 2 - Frontend
npm run dev:client
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001

## Usage

1. **Open the app** in your browser (Chrome or Edge recommended for best speech recognition support)
2. **Enter your name** on first load (saved in localStorage)
3. **Click "Start Listening"** or wait for the greeting
4. **Speak naturally**:
   - "Schedule a meeting"
   - "What meetings do I have?"
   - "Reschedule the Q4 planning to next week"

## User Flows

### Flow 1: Schedule a New Meeting

1. User: "Schedule a meeting"
2. Agent asks one question at a time:
   - Meeting title/purpose
   - Date & time (IST timezone)
   - Duration
   - Optional notes
3. Agent confirms all details
4. User confirms → Meeting saved

### Flow 2: List Meetings

1. User: "What meetings do I have?" or "Show my calendar"
2. Agent reads all upcoming meetings in order
3. Agent asks if user wants to reschedule anything

### Flow 3: Reschedule Meeting

1. User: "Move the Q4 planning to next week" or "Reschedule the sync with John to tomorrow 4 PM"
2. Agent identifies the meeting
3. Agent confirms new time
4. Meeting updated in database

## Project Structure

```
voice-meeting-agent/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/
│   │   │   └── VoiceAgent.jsx
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── package.json
├── server/                 # Node.js backend
│   ├── index.js           # Express server
│   ├── agent.js           # LangChain agent logic
│   ├── db.js              # Database abstraction
│   └── package.json
├── package.json           # Root package.json
└── README.md
```

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

## Browser Compatibility

- **Chrome/Edge**: Full support (recommended)
- **Firefox**: Limited speech recognition support
- **Safari**: Limited speech recognition support

## Development Notes

- The app uses browser's native Web Speech API for STT (no external API needed)
- Browser's Speech Synthesis API for TTS (no external API needed)
- LangChain handles all conversation logic and meeting management
- Mock database available for development without Supabase

## Troubleshooting

1. **Speech recognition not working**: Use Chrome or Edge browser
2. **API errors**: Check your OpenAI API key in `server/.env`
3. **Database errors**: Ensure Supabase credentials are correct, or use mock DB
4. **CORS errors**: Ensure backend is running on port 3001

## License

MIT


