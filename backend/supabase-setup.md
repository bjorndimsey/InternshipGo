# Supabase Setup Guide

## 1. Get Supabase Connection Details

1. Go to your Supabase project dashboard
2. Navigate to Settings > Database
3. Copy the connection details:
   - Host
   - Database name
   - Port (usually 5432)
   - Username (usually 'postgres')
   - Password

## 2. Create Environment File

Create a `.env` file in the `backend` directory with your Supabase credentials:

```env
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:8081

# Supabase Database Configuration
DB_HOST=db.your-project-ref.supabase.co
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=your-supabase-password
DB_SSL=true

# JWT Secret (for future authentication)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## 3. Run Database Schema

1. Connect to your Supabase database using the SQL editor
2. Copy and paste the contents of `backend/database/schema.sql`
3. Execute the SQL to create the tables

## 4. Test Connection

Start the backend server:
```bash
cd backend
npm start
```

You should see:
```
Connected to PostgreSQL database
Database schema initialized successfully
🚀 Server running on port 3001
```

## 5. Test Registration

The registration should now work with your Supabase database!
