# Git Repository & Deployment Checklist

## 🔍 Your Repository

**Repository URL:** https://github.com/bjorndimsey/InternshipGo

**Status:** ✅ Public repository with 21 commits

---

## ✅ Pre-Deployment Checklist

### Step 1: Check What Needs to Be Committed

**Before deploying, make sure all important changes are committed:**

```bash
# On your local machine (not on server)
cd /path/to/your/InternshipGo

# Check git status
git status
```

**What SHOULD be committed:**
- ✅ Code changes (`.ts`, `.tsx`, `.js` files)
- ✅ Configuration files (except secrets)
- ✅ Package files (`package.json`, `package-lock.json`)
- ✅ Documentation updates
- ✅ New features and bug fixes

**What should NOT be committed:**
- ❌ `.env` files (contains secrets)
- ❌ `node_modules/` (dependencies)
- ❌ Build files (`web-build/`, `dist/`)
- ❌ Personal API keys
- ❌ Database passwords

---

## 📋 Step 2: Commit and Push Changes

**If you have uncommitted changes:**

```bash
# Check what's changed
git status

# Add all changes (or specific files)
git add .

# Or add specific files:
# git add lib/api.ts
# git add backend/server.js

# Commit with message
git commit -m "Update API URL for production deployment"

# Push to GitHub
git push origin main
```

**Verify on GitHub:**
- Go to https://github.com/bjorndimsey/InternshipGo
- Check if your latest changes are there

---

## 📋 Step 3: Update API URL Before Committing

**Important: Update API URL in your codebase for production:**

### Option A: Use Environment Variable (Recommended)

**Update `lib/api.ts`:**

```typescript
// Use environment variable with fallback
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 
                     process.env.API_BASE_URL || 
                     'http://localhost:3001/api';
```

**Create `.env` file (DO NOT COMMIT THIS):**
```env
EXPO_PUBLIC_API_URL=https://your-domain.com/api
```

**Add to `.gitignore`:**
```bash
# Make sure .env is in .gitignore
echo ".env" >> .gitignore
echo ".env.local" >> .gitignore
echo ".env.production" >> .gitignore
```

### Option B: Hardcode Production URL (Not Recommended)

**Only if you can't use environment variables:**

```typescript
// lib/api.ts
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://your-domain.com/api'
  : 'http://localhost:3001/api';
```

**Then commit:**
```bash
git add lib/api.ts
git commit -m "Update API URL for production"
git push origin main
```

---

## 📋 Step 4: Clone Repository on Server

**Now on your Ubuntu server, clone the repository:**

```bash
# Navigate to web directory
cd /var/www

# Clone your repository
git clone https://github.com/bjorndimsey/InternshipGo.git

# Navigate to project
cd InternshipGo

# Verify it cloned correctly
ls -la
```

**You should see:**
- `backend/` folder
- `lib/` folder
- `package.json`
- All your project files

---

## 📋 Step 5: Setup Environment Files on Server

**Create `.env` files on server (these are NOT in git):**

### Backend `.env`:

```bash
# Navigate to backend
cd /var/www/InternshipGo/backend

# Create .env file
nano .env
```

**Add your production values:**
```env
# Server Configuration
PORT=3001
NODE_ENV=production

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_supabase_anon_key_here
SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Frontend URL
FRONTEND_URL=https://your-domain.com

# JWT Secret (generate random string)
JWT_SECRET=your-super-secret-jwt-key-change-this

# Database (if using direct connection)
DB_HOST=db.your-project.supabase.co
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=your_supabase_password
DB_SSL=true
```

**Save:** `Ctrl+X`, `Y`, `Enter`

### Frontend `.env` (if using environment variables):

```bash
# Navigate to project root
cd /var/www/InternshipGo

# Create .env file
nano .env
```

**Add:**
```env
EXPO_PUBLIC_API_URL=https://your-domain.com/api
```

**Save:** `Ctrl+X`, `Y`, `Enter`

---

## 📋 Step 6: Verify .gitignore is Correct

**Check your `.gitignore` file includes:**

```bash
# On your local machine
cat .gitignore
```

**Should include:**
```
.env
.env.local
.env.production
node_modules/
web-build/
dist/
.expo/
*.log
```

**If not, update it:**
```bash
# Add to .gitignore
echo ".env" >> .gitignore
echo ".env.local" >> .gitignore
echo ".env.production" >> .gitignore
echo "web-build/" >> .gitignore

# Commit the .gitignore update
git add .gitignore
git commit -m "Update .gitignore for production"
git push origin main
```

---

## 🔄 Deployment Workflow

### Development → Production Flow:

```
1. Local Development
   ├── Make changes
   ├── Test locally
   └── Commit changes

2. Push to GitHub
   ├── git push origin main
   └── Verify on GitHub

3. Server Deployment
   ├── git pull origin main (on server)
   ├── Update .env files (on server only)
   ├── npm install
   ├── Build application
   └── Restart services
```

---

## 📋 Complete Deployment Steps

### On Your Local Machine:

```bash
# 1. Check current status
git status

# 2. Add any changes
git add .

# 3. Commit changes
git commit -m "Prepare for production deployment"

# 4. Push to GitHub
git push origin main
```

### On Your Server:

```bash
# 1. Clone repository (first time only)
cd /var/www
git clone https://github.com/bjorndimsey/InternshipGo.git
cd InternshipGo

# 2. Setup backend
cd backend
npm install
nano .env  # Add your production values
pm2 start server.js --name internshipgo-api
pm2 save

# 3. Setup frontend
cd /var/www/InternshipGo
npm install
nano .env  # Add EXPO_PUBLIC_API_URL if using env vars
npm run web -- --no-dev --minify

# 4. Deploy web files
cp -r web-build/* /var/www/internshipgo-web/
chown -R www-data:www-data /var/www/internshipgo-web

# 5. Configure Nginx (as per previous guide)
# 6. Setup SSL certificate
```

---

## 🔄 Updating After Deployment

**When you make changes later:**

### On Local Machine:
```bash
# Make changes
# Test locally
git add .
git commit -m "Description of changes"
git push origin main
```

### On Server:
```bash
# Navigate to project
cd /var/www/InternshipGo

# Pull latest changes
git pull origin main

# Rebuild if needed
cd backend
npm install  # If package.json changed
pm2 restart internshipgo-api

# Rebuild frontend if needed
cd /var/www/InternshipGo
npm install  # If package.json changed
npm run web -- --no-dev --minify
cp -r web-build/* /var/www/internshipgo-web/
```

---

## ⚠️ Important Security Notes

### Never Commit:

1. **`.env` files** - Contains secrets
2. **API keys** - Supabase keys, Cloudinary keys
3. **Database passwords** - Supabase passwords
4. **JWT secrets** - Authentication secrets
5. **Private keys** - SSH keys, SSL certificates

### Always Commit:

1. **Code changes** - All `.ts`, `.tsx`, `.js` files
2. **Configuration templates** - `env.example` (without secrets)
3. **Package files** - `package.json`, `package-lock.json`
4. **Documentation** - README, guides

---

## 📝 Create env.example Template

**Create a template file (this CAN be committed):**

```bash
# On local machine
cd /path/to/InternshipGo

# Create env.example for backend
cd backend
nano env.example
```

**Add (without actual values):**
```env
# Server Configuration
PORT=3001
NODE_ENV=production

# Supabase Configuration
SUPABASE_URL=your_supabase_url_here
SUPABASE_KEY=your_supabase_key_here
SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Frontend URL
FRONTEND_URL=https://your-domain.com

# JWT Secret
JWT_SECRET=your-jwt-secret-here
```

**Commit this:**
```bash
git add backend/env.example
git commit -m "Add environment variable template"
git push origin main
```

---

## ✅ Quick Checklist

**Before deploying:**

- [ ] All code changes committed
- [ ] Changes pushed to GitHub
- [ ] `.env` files are in `.gitignore`
- [ ] `env.example` template created (optional)
- [ ] API URL updated for production
- [ ] Repository is up to date on GitHub

**On server:**

- [ ] Repository cloned
- [ ] `.env` files created (with production values)
- [ ] Dependencies installed
- [ ] Backend started with PM2
- [ ] Frontend built
- [ ] Nginx configured
- [ ] SSL certificate installed

---

## 🚀 Quick Start Commands

### First Time Setup on Server:

```bash
# Clone repository
cd /var/www
git clone https://github.com/bjorndimsey/InternshipGo.git
cd InternshipGo

# Setup backend
cd backend
npm install
nano .env  # Add your production config
pm2 start server.js --name internshipgo-api
pm2 save
pm2 startup

# Setup frontend
cd /var/www/InternshipGo
npm install
nano .env  # Add EXPO_PUBLIC_API_URL if needed
npm run web -- --no-dev --minify
mkdir -p /var/www/internshipgo-web
cp -r web-build/* /var/www/internshipgo-web/
chown -R www-data:www-data /var/www/internshipgo-web
```

---

## 📚 Your Repository Structure

Based on https://github.com/bjorndimsey/InternshipGo:

**What's in your repo:**
- ✅ `backend/` - Backend API code
- ✅ `lib/` - API service and utilities
- ✅ `screens/` - Frontend screens
- ✅ `components/` - React components
- ✅ `users/` - User-specific pages
- ✅ `package.json` - Dependencies
- ✅ `app.json` - Expo configuration

**Ready to deploy!** ✅

---

## 🎯 Next Steps

1. **Check git status** on your local machine
2. **Commit any pending changes**
3. **Push to GitHub**
4. **Clone on server** using the commands above
5. **Follow deployment steps** from previous guides

**Your repository is ready!** Just make sure everything is committed and pushed before deploying. 🚀

