# Environment Setup Guide

## Issue: Supabase Connection Failed

The backend server is failing to connect to Supabase because the environment variables are not configured.

## Solution

1. **Create a `.env` file** in the `backend` directory with the following content:

```env
# Supabase Configuration
SUPABASE_URL=https://oyopcgdyfgtzurtkfkje.supabase.co
SUPABASE_KEY=your_supabase_anon_key_here
SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Server Configuration
PORT=3001
NODE_ENV=development

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:8081
```

2. **Get your Supabase credentials:**
   - Go to your Supabase project dashboard
   - Navigate to Settings > API
   - Copy the "anon public" key
   - Replace `your_supabase_anon_key_here` with your actual key

3. **Restart the backend server:**
   ```bash
   cd backend
   node server.js
   ```

## Alternative: Use Direct Database Connection

If Supabase continues to have issues, you can temporarily use a direct PostgreSQL connection by modifying the `backend/config/supabase.js` file to use the `database.js` configuration instead.

## Current Status

- ✅ Frontend (Expo) is running on http://localhost:8081
- ❌ Backend server cannot start due to missing environment variables
- ✅ Application functionality is implemented and ready to test once backend is running
