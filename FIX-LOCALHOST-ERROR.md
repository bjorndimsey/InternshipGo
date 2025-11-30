# Fix: localhost:3001 Connection Refused Error

## 🔍 Understanding the Error

**Error:** `localhost:3001/api/auth/login:1 Failed to load resource: net::ERR_CONNECTION_REFUSED`

**What this means:**
- Your deployed website is still trying to connect to `localhost:3001`
- This happens because the frontend was built **before** the API URL was fixed
- OR the environment variable wasn't available during the build

**Why it happens:**
- Expo/React Native Web bakes environment variables into the JavaScript bundle at **build time**
- If you build without the `.env` file, it uses the fallback URL
- The old build is still deployed on your server

---

## ✅ Solution: Rebuild Frontend with Correct Environment Variable

### Step 1: Verify `.env` File Exists on Server

**SSH into your server:**

```bash
ssh root@your-server-ip

# Navigate to project
cd /var/www/InternshipGo

# Check if .env exists
ls -la .env

# If it doesn't exist, create it
nano .env
```

**Add this content:**
```env
EXPO_PUBLIC_API_URL=https://internshipgo.site/api
```

**Save:** `Ctrl+X`, `Y`, `Enter`

**Verify the content:**
```bash
cat .env
```

**Should show:**
```
EXPO_PUBLIC_API_URL=https://internshipgo.site/api
```

---

### Step 2: Pull Latest Code (if not already done)

```bash
# Make sure you have the latest code with API URL fixes
cd /var/www/InternshipGo
git pull origin main

# Verify lib/api.ts has the environment variable code
grep "EXPO_PUBLIC_API_URL" lib/api.ts
```

**Should show:**
```typescript
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 
                     process.env.API_BASE_URL || 
                     'https://internshipgo.site/api';
```

---

### Step 3: Rebuild Frontend with Environment Variable

**Important:** The environment variable must be available during the build!

```bash
# Make sure you're in project root
cd /var/www/InternshipGo

# Verify .env file is there
cat .env

# Install dependencies (if needed)
npm install

# Build with environment variable
# The EXPO_PUBLIC_API_URL will be read from .env file
npx expo export --platform web
```

**Expected output:**
```
✔ Finished in X seconds
✔ Output directory: dist
```

**Verify the build picked up the environment variable:**
```bash
# Check if the built file contains your domain (not localhost)
grep -r "internshipgo.site" dist/ | head -5

# Should show your domain, NOT localhost
```

---

### Step 4: Deploy the New Build

```bash
# Remove old build files
rm -rf /var/www/internshipgo-web/*

# Copy new build
cp -r /var/www/InternshipGo/dist/* /var/www/internshipgo-web/

# Set correct permissions
chown -R www-data:www-data /var/www/internshipgo-web
chmod -R 755 /var/www/internshipgo-web

# Verify files are there
ls -la /var/www/internshipgo-web/ | head -10
```

---

### Step 5: Clear Browser Cache

**The browser might be caching the old JavaScript files:**

1. **Hard Refresh:**
   - Chrome/Edge: `Ctrl + Shift + R` or `Ctrl + F5`
   - Firefox: `Ctrl + Shift + R`
   - Safari: `Cmd + Shift + R`

2. **Clear Cache Completely:**
   - Open DevTools (F12)
   - Right-click the refresh button
   - Select "Empty Cache and Hard Reload"

3. **Or use Incognito/Private Mode:**
   - Open a new incognito/private window
   - Visit `https://internshipgo.site`
   - This bypasses cache

---

### Step 6: Verify It's Fixed

**1. Check Network Tab:**
- Open browser DevTools (F12)
- Go to Network tab
- Try to login
- Check the API request URL
- **Should show:** `https://internshipgo.site/api/auth/login`
- **Should NOT show:** `localhost:3001`

**2. Check Console:**
- Open DevTools Console tab
- Should NOT see `ERR_CONNECTION_REFUSED` errors
- Should NOT see `localhost:3001` in any errors

**3. Test Login:**
- Try logging in
- Should connect to your production API
- Should work correctly

---

## 🔍 Troubleshooting

### Issue: Still seeing localhost after rebuild

**Check 1: Verify .env file is in the right place**
```bash
# Should be in project root
cd /var/www/InternshipGo
pwd  # Should show /var/www/InternshipGo
ls -la .env  # Should exist
```

**Check 2: Verify environment variable is being read**
```bash
# Check if Expo can read it
cd /var/www/InternshipGo
node -e "require('dotenv').config(); console.log(process.env.EXPO_PUBLIC_API_URL)"
```

**If it doesn't work, install dotenv:**
```bash
npm install dotenv
```

**Check 3: Manually set environment variable during build**
```bash
# Set it explicitly during build
EXPO_PUBLIC_API_URL=https://internshipgo.site/api npx expo export --platform web
```

---

### Issue: Build still uses localhost

**Solution: Check the fallback in lib/api.ts**

The fallback should be your production URL, not localhost:

```typescript
// lib/api.ts - Line 3-5
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 
                     process.env.API_BASE_URL || 
                     'https://internshipgo.site/api';  // ✅ Correct fallback
```

**NOT:**
```typescript
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 
                     'http://localhost:3001/api';  // ❌ Wrong fallback
```

---

### Issue: Environment variable not working with Expo

**Expo requires `EXPO_PUBLIC_` prefix for web builds:**

```env
# ✅ Correct
EXPO_PUBLIC_API_URL=https://internshipgo.site/api

# ❌ Wrong (won't work for web)
API_BASE_URL=https://internshipgo.site/api
```

---

### Issue: Browser still shows old build

**Force clear cache:**

1. **Chrome:**
   - Settings → Privacy and Security → Clear browsing data
   - Select "Cached images and files"
   - Time range: "All time"
   - Clear data

2. **Or use command line (on server):**
   ```bash
   # Add cache-busting headers to Nginx
   # Edit Nginx config
   nano /etc/nginx/sites-available/internshipgo
   ```

   **Add to location block:**
   ```nginx
   location / {
       root /var/www/internshipgo-web;
       index index.html;
       
       # Add cache control
       add_header Cache-Control "no-cache, no-store, must-revalidate";
       add_header Pragma "no-cache";
       add_header Expires "0";
   }
   ```

   **Reload Nginx:**
   ```bash
   nginx -t
   systemctl reload nginx
   ```

---

## ✅ Quick Fix Checklist

- [ ] `.env` file exists in `/var/www/InternshipGo/`
- [ ] `.env` contains `EXPO_PUBLIC_API_URL=https://internshipgo.site/api`
- [ ] Latest code pulled from Git (`git pull origin main`)
- [ ] Frontend rebuilt (`npx expo export --platform web`)
- [ ] New build copied to `/var/www/internshipgo-web/`
- [ ] Browser cache cleared
- [ ] Tested in incognito/private mode
- [ ] Network tab shows `https://internshipgo.site/api` (not localhost)

---

## 🎯 Expected Result

**After fixing:**
- ✅ Website loads correctly
- ✅ API calls go to `https://internshipgo.site/api`
- ✅ No `ERR_CONNECTION_REFUSED` errors
- ✅ Login works
- ✅ All features work correctly

---

## 📝 Summary

**The problem:** Old build with localhost URL is still deployed

**The solution:** 
1. Create `.env` file with `EXPO_PUBLIC_API_URL`
2. Rebuild frontend
3. Deploy new build
4. Clear browser cache

**Key point:** Environment variables must be available **during build time**, not just runtime!

