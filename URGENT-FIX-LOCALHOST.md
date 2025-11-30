# 🚨 URGENT: Fix localhost Error - Step by Step

## The Problem

Your deployed website is still using the **old build** that has `localhost:3001` hardcoded. Even though your source code is fixed, the **deployed JavaScript files** on the server still have the old URL.

**This is why incognito mode doesn't help** - the problem is on the server, not your browser cache.

---

## ✅ IMMEDIATE FIX (Run These Commands on Your Server)

### Step 1: SSH into Your Server

```bash
ssh root@your-server-ip
```

### Step 2: Navigate to Project and Check Current State

```bash
cd /var/www/InternshipGo

# Check if .env exists
ls -la .env

# Check current code
cat lib/api.ts | head -10
```

### Step 3: Create/Update .env File

```bash
# Create or edit .env file
nano .env
```

**Add this EXACT content:**
```env
EXPO_PUBLIC_API_URL=https://internshipgo.site/api
```

**Save:** `Ctrl+X`, then `Y`, then `Enter`

**Verify:**
```bash
cat .env
```

**Should show:**
```
EXPO_PUBLIC_API_URL=https://internshipgo.site/api
```

### Step 4: Pull Latest Code (if not already done)

```bash
# Pull latest code from GitHub
git pull origin main

# Verify the API URL code is correct
grep -A 3 "API_BASE_URL" lib/api.ts
```

**Should show:**
```typescript
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 
                     process.env.API_BASE_URL || 
                     'https://internshipgo.site/api';
```

### Step 5: Install Dependencies (if needed)

```bash
# Make sure all dependencies are installed
npm install
```

### Step 6: Rebuild Frontend with Environment Variable

**IMPORTANT:** Set the environment variable explicitly during build:

```bash
# Method 1: Set it inline (RECOMMENDED)
EXPO_PUBLIC_API_URL=https://internshipgo.site/api npx expo export --platform web

# OR Method 2: Load from .env file
# First install dotenv-cli if not installed
npm install -g dotenv-cli
dotenv -e .env npx expo export --platform web
```

**Wait for build to complete** (this may take 2-5 minutes)

**Expected output:**
```
✔ Finished in X seconds
✔ Output directory: dist
```

### Step 7: Verify the Build Contains Correct URL

```bash
# Check if the built JavaScript contains your domain (not localhost)
grep -r "internshipgo.site" dist/ | head -3

# Should show your domain

# Verify it does NOT contain localhost:3001
grep -r "localhost:3001" dist/ | head -3

# Should show NOTHING (or very few results if in comments)
```

### Step 8: Deploy the New Build

```bash
# Backup old build (optional, but recommended)
mv /var/www/internshipgo-web /var/www/internshipgo-web-backup-$(date +%Y%m%d-%H%M%S)

# Create web directory if it doesn't exist
mkdir -p /var/www/internshipgo-web

# Copy new build
cp -r /var/www/InternshipGo/dist/* /var/www/internshipgo-web/

# Set correct permissions
chown -R www-data:www-data /var/www/internshipgo-web
chmod -R 755 /var/www/internshipgo-web

# Verify files are there
ls -la /var/www/internshipgo-web/ | head -10
```

### Step 9: Reload Nginx

```bash
# Test Nginx configuration
nginx -t

# If test passes, reload
systemctl reload nginx

# Check status
systemctl status nginx
```

### Step 10: Test the Fix

**1. Open your website:**
```
https://internshipgo.site
```

**2. Open Browser DevTools (F12):**
- Go to **Network** tab
- Clear network log
- Try to login
- Look at the API request URL

**3. Check the Request URL:**
- ✅ **CORRECT:** `https://internshipgo.site/api/auth/login`
- ❌ **WRONG:** `http://localhost:3001/api/auth/login`

**4. If still showing localhost:**
- Check browser cache (Ctrl+Shift+R)
- Or use incognito mode
- Check the JavaScript file directly:
  ```
  https://internshipgo.site/index-*.js
  ```
  - Open in browser
  - Search for "localhost:3001"
  - Should NOT find it

---

## 🔍 Alternative: If Environment Variable Doesn't Work

**If the build still uses localhost, temporarily hardcode the URL:**

### Option 1: Edit lib/api.ts Directly on Server

```bash
cd /var/www/InternshipGo
nano lib/api.ts
```

**Change line 3-5 to:**
```typescript
const API_BASE_URL = 'https://internshipgo.site/api';
```

**Save and rebuild:**
```bash
npx expo export --platform web
cp -r dist/* /var/www/internshipgo-web/
systemctl reload nginx
```

**⚠️ Note:** This is a temporary fix. You should use environment variables for production.

---

## 🐛 Debugging: Check What's Actually Deployed

**See what URL is in the deployed JavaScript:**

```bash
# On server, check the deployed files
grep -r "localhost:3001" /var/www/internshipgo-web/ | head -5

# If this shows results, the old build is still deployed
# If it shows nothing, the new build is deployed
```

**Check the built files before deploying:**

```bash
# Check the dist folder
grep -r "localhost:3001" /var/www/InternshipGo/dist/ | head -5

# If this shows results, the build didn't work correctly
# If it shows nothing, the build is correct
```

---

## ✅ Verification Checklist

After completing the steps above:

- [ ] `.env` file exists with `EXPO_PUBLIC_API_URL=https://internshipgo.site/api`
- [ ] Latest code pulled from Git
- [ ] Frontend rebuilt with `npx expo export --platform web`
- [ ] Built files copied to `/var/www/internshipgo-web/`
- [ ] Nginx reloaded
- [ ] Browser DevTools Network tab shows `https://internshipgo.site/api` (not localhost)
- [ ] Login works correctly
- [ ] No `ERR_CONNECTION_REFUSED` errors

---

## 🎯 Quick Command Summary

**Copy and paste this entire block on your server:**

```bash
cd /var/www/InternshipGo && \
echo "EXPO_PUBLIC_API_URL=https://internshipgo.site/api" > .env && \
cat .env && \
git pull origin main && \
EXPO_PUBLIC_API_URL=https://internshipgo.site/api npx expo export --platform web && \
rm -rf /var/www/internshipgo-web/* && \
cp -r dist/* /var/www/internshipgo-web/ && \
chown -R www-data:www-data /var/www/internshipgo-web && \
systemctl reload nginx && \
echo "✅ Deployment complete! Check https://internshipgo.site"
```

---

## 📞 Still Not Working?

**If you still see localhost after all these steps:**

1. **Check the actual JavaScript file:**
   - Open `https://internshipgo.site` in browser
   - View page source
   - Find the main JavaScript file (usually `index-*.js`)
   - Open it
   - Search for "localhost:3001"
   - If found, the build didn't work

2. **Try hardcoding the URL temporarily:**
   - Edit `lib/api.ts` on server
   - Change to: `const API_BASE_URL = 'https://internshipgo.site/api';`
   - Rebuild and redeploy

3. **Check Nginx is serving the right files:**
   ```bash
   # Check Nginx config
   cat /etc/nginx/sites-available/internshipgo | grep root
   
   # Should show: root /var/www/internshipgo-web;
   ```

4. **Verify backend is running:**
   ```bash
   pm2 status
   curl http://localhost:3001/api/health
   ```

---

**The key is: You MUST rebuild the frontend on the server with the environment variable set!**

