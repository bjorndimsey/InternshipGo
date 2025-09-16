# Supabase Environment Setup

## 1. Get Your Supabase Key

1. Go to your Supabase project dashboard
2. Navigate to **Settings > API**
3. Copy the **anon/public** key

## 2. Set Environment Variable

You need to set the `SUPABASE_KEY` environment variable. You can do this in several ways:

### Option A: Set in your terminal (Windows PowerShell)
```powershell
$env:SUPABASE_KEY="your-supabase-anon-key-here"
npm start
```

### Option B: Create a .env file (if not blocked)
Create `backend/.env`:
```env
SUPABASE_KEY=your-supabase-anon-key-here
```

### Option C: Set in your system environment variables
1. Open System Properties > Environment Variables
2. Add new variable: `SUPABASE_KEY` = `your-supabase-anon-key-here`
3. Restart your terminal

## 3. Run Database Schema

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `backend/database/schema.sql`
4. Execute the SQL to create the tables

## 4. Test the Connection

Start the server:
```bash
npm start
```

You should see:
```
✅ Supabase connection test successful
✅ Supabase database connected successfully
🚀 Server running on port 3001
```

## 5. Test Registration

The registration should now work with your Supabase database!
