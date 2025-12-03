# Voice Meeting Scheduling Agent

A fully functional voice-only meeting scheduling agent prototype. Users interact entirely through voice - no typing required.

## Features

### Core Voice Features
- 🎤 **Voice-only interface** - Speak naturally to interact
- 📅 **Schedule meetings** - Conversational meeting creation with conflict detection
- 📋 **List meetings** - Hear your upcoming meetings
- 🔄 **Reschedule meetings** - Move meetings with voice commands
- 🗑️ **Delete meetings** - Cancel meetings by voice
- 🔍 **Search meetings** - Find specific meetings by title or notes
- 🤖 **AI-powered** - Uses LangChain with OpenAI for natural conversations

### Enhanced UI Features
- 📊 **Visual Meeting Cards** - Beautiful card-based meeting display
- 📆 **Calendar View** - Visual representation of your schedule
- 🌙 **Dark Mode** - Easy on the eyes during late hours
- ⚙️ **Settings Panel** - Customize your experience
- 📥 **Export to ICS** - Export meetings to any calendar app

### Advanced Features
- 🔁 **Continuous Listening Mode** - Keep the mic active for hands-free operation
- 🎛️ **Voice Settings** - Adjust speech rate, pitch, and volume
- ⚠️ **Conflict Detection** - Warns about scheduling conflicts
- 👥 **Meeting Participants** - Track who's attending (schema ready)
- 🏷️ **Categories** - Organize meetings (work, personal, urgent)

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
3. **Explore the tabs**:
   - **Voice Tab**: Main voice interaction interface
   - **Meetings Tab**: Visual cards of all your meetings
   - **Calendar Tab**: Calendar view (coming soon)
   - **Settings Tab**: Customize voice and appearance
4. **Grant microphone access** when prompted
5. **Click "Start Listening"** and speak naturally:
   - "Schedule a meeting"
   - "What meetings do I have?"
   - "Reschedule the Q4 planning to next week"
   - "Delete the standup meeting"
   - "Find meetings about budget"

### Voice Commands

#### Scheduling
- "Schedule a meeting"
- "Set up a meeting"
- "Create a new meeting"

#### Viewing
- "What meetings do I have?"
- "Show my calendar"
- "List my meetings"

#### Modifying
- "Reschedule [meeting name] to [new time]"
- "Move the [meeting name] to next week"

#### Deleting
- "Delete the [meeting name]"
- "Cancel my [meeting name]"
- "Remove the [meeting name]"

#### Searching
- "Find meetings about [topic]"
- "Search for [meeting name]"

## UI Features

### Tabs Navigation
The app now features a modern tabbed interface:

1. **Voice Tab** 🎤
   - Main voice interaction interface
   - Real-time status indicator
   - Conversation history
   - Microphone controls
   - Voice feedback

2. **Meetings Tab** 📋
   - Visual meeting cards with actions
   - Edit, reschedule, or delete meetings with one click
   - Export all meetings to ICS format
   - Past meetings shown with reduced opacity
   - Meeting details: time, duration, notes, participants

3. **Calendar Tab** 📆
   - Visual calendar representation (coming soon)
   - Month/week/day views

4. **Settings Tab** ⚙️
   - **Dark Mode**: Toggle between light and dark themes
   - **Continuous Listening**: Keep mic active for hands-free operation
   - **Voice Settings**:
     - Speech Rate: 0.5x to 2x
     - Pitch: 0.5 to 2.0
     - Volume: 0% to 100%
   - Test voice button

### Meeting Cards
Each meeting is displayed as a beautiful card showing:
- Day of week and date
- Time and duration
- Meeting title and notes
- Participants (if any)
- Category badge (work, personal, urgent)
- Quick action buttons (reschedule, edit, delete)

### Export Functionality
- Export all meetings to ICS (iCalendar) format
- Import into Google Calendar, Outlook, Apple Calendar, etc.
- One-click download

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

### Flow 4: Delete Meeting

1. User: "Delete the standup meeting" or "Cancel the Q4 planning"
2. Agent identifies the meeting
3. Agent confirms deletion
4. Meeting removed from database

### Flow 5: Search Meetings

1. User: "Find meetings about budget" or "Search for team sync"
2. Agent searches through meeting titles and notes
3. Agent reads matching meetings
4. User can take action on found meetings

### Flow 6: Visual Management

1. User switches to "Meetings" tab
2. Views all meetings as visual cards
3. Clicks action buttons to:
   - Reschedule (switches to voice tab with prompt)
   - Edit meeting details
   - Delete meeting
4. Export meetings to calendar app

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
  "id": "uuid-here",
  "title": "Q4 Planning",
  "datetime": "2025-12-05T15:00:00+05:30",
  "duration_minutes": 60,
  "notes": "Discuss budget and roadmap",
  "participants": ["john@example.com", "sarah@example.com"],
  "category": "work",
  "location": "Conference Room A",
  "reminder_minutes": 15,
  "is_recurring": false,
  "recurrence_pattern": null,
  "created_at": "2025-11-21T10:00:00Z",
  "updated_at": "2025-11-21T10:00:00Z"
}
```

### Field Descriptions

- `title`: Meeting title/subject
- `datetime`: ISO 8601 datetime with timezone
- `duration_minutes`: Duration in minutes
- `notes`: Optional meeting notes/description
- `participants`: Array of participant names/emails
- `category`: One of: work, personal, urgent, other
- `location`: Physical location or virtual meeting link
- `reminder_minutes`: Minutes before meeting to send reminder
- `is_recurring`: Boolean for recurring meetings
- `recurrence_pattern`: Pattern like "daily", "weekly", "monthly"

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


