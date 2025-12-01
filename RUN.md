# How to Run the Voice Meeting Agent

## Quick Start (3 Steps)

### Step 1: Set Up Environment Variables

Create a file called `.env` in the `server/` folder:

```bash
cd server
touch .env
```

Then add your OpenAI API key to `server/.env`:

```env
OPENAI_API_KEY=sk-your-actual-api-key-here
PORT=3001
```

**Important**: 
- You MUST have an OpenAI API key (get one from https://platform.openai.com/api-keys)
- Supabase is optional - the app will use a mock database if you don't provide it

### Step 2: Run the Application

From the root directory (`/Users/amir/Desktop/uzair`), run:

```bash
npm run dev
```

This will start:
- ✅ Backend server on http://localhost:3001
- ✅ Frontend app on http://localhost:3000

### Step 3: Open in Browser

Open **http://localhost:3000** in **Chrome or Edge** (required for speech recognition).

Enter your name when prompted and start speaking!

---

## Alternative: Run Separately

If you prefer to run them in separate terminals:

**Terminal 1 (Backend):**
```bash
cd server
npm run dev
```

**Terminal 2 (Frontend):**
```bash
cd client
npm run dev
```

---

## What to Say

Once the app is running, try these voice commands:

- **"Schedule a meeting"** - Start creating a new meeting
- **"What meetings do I have?"** - List all your meetings
- **"Show my calendar"** - Same as above
- **"Reschedule the Q4 planning to next week"** - Move a meeting
- **"Move the sync meeting to tomorrow 4 PM"** - Reschedule by time

---

## Troubleshooting

### ❌ "Speech recognition not supported"
**Solution**: Use Chrome or Edge browser (Safari/Firefox have limited support)

### ❌ "OpenAI API error" or "Invalid API key"
**Solution**: 
1. Check that `server/.env` exists
2. Verify your OpenAI API key is correct
3. Make sure you have credits in your OpenAI account

### ❌ "Cannot connect to server" or CORS errors
**Solution**: 
1. Make sure backend is running on port 3001
2. Check terminal for errors
3. Try restarting both servers

### ❌ Port already in use
**Solution**: 
- Change `PORT=3001` in `server/.env` to a different port (e.g., `PORT=3002`)
- Update `client/vite.config.js` proxy target to match

---

## Need Help?

1. Check that all dependencies installed: `npm run install:all`
2. Verify `.env` file exists in `server/` folder
3. Make sure you're using Chrome or Edge browser
4. Check terminal output for error messages


