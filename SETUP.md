# Quick Setup Guide

## Step 1: Install Dependencies

```bash
npm run install:all
```

## Step 2: Configure Environment

Create `server/.env` file:

```env
OPENAI_API_KEY=your_openai_api_key_here
SUPABASE_URL=your_supabase_url_here
SUPABASE_ANON_KEY=your_supabase_anon_key_here
PORT=3001
```

**Note**: 
- `OPENAI_API_KEY` is **required** for the LangChain agent to work
- `SUPABASE_URL` and `SUPABASE_ANON_KEY` are **optional** - the app will use a mock database if not provided

## Step 3: Set Up Database (Optional)

If using Supabase, run the SQL from `server/schema.sql` in your Supabase SQL editor.

## Step 4: Run the Application

```bash
npm run dev
```

This starts both:
- Backend server on http://localhost:3001
- Frontend app on http://localhost:3000

## Step 5: Open in Browser

Open http://localhost:3000 in Chrome or Edge (for best speech recognition support).

Enter your name and start speaking!

## Troubleshooting

- **"Speech recognition not supported"**: Use Chrome or Edge browser
- **"OpenAI API error"**: Check your API key in `server/.env`
- **"Cannot connect to server"**: Make sure backend is running on port 3001


