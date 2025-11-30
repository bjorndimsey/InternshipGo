# Deploy Evidence Page Fixes

## Changes Made:
1. **Frontend**: Fixed `EvidencesPage.tsx` (coordinator & admin coordinator)
   - Added `selectedDate` to dependency array
   - Added better error handling and logging

2. **Backend**: Fixed `evidenceController.js`
   - Fixed date calculation bug for month filtering

---

## Deployment Steps (Run on SSH Server)

### Step 1: Pull Latest Code

```bash
cd /var/www/InternshipGo
git pull origin main
```

### Step 2: Restart Backend (for backend changes)

```bash
cd /var/www/InternshipGo/backend
pm2 restart all
# OR
pm2 restart internshipgo-backend
```

**Check backend status:**
```bash
pm2 status
pm2 logs --lines 50
```

### Step 3: Rebuild Frontend (for frontend changes)

```bash
cd /var/www/InternshipGo

# Make sure .env exists with API URL
cat .env
# Should show: EXPO_PUBLIC_API_URL=https://internshipgo.site/api

# Rebuild frontend
EXPO_PUBLIC_API_URL=https://internshipgo.site/api npx expo export --platform web
```

**Wait for build to complete** (2-5 minutes)

### Step 4: Deploy New Frontend Build

```bash
# Remove old build
rm -rf /var/www/internshipgo-web/*

# Copy new build
cp -r /var/www/InternshipGo/dist/* /var/www/internshipgo-web/

# Set permissions
chown -R www-data:www-data /var/www/internshipgo-web
chmod -R 755 /var/www/internshipgo-web
```

### Step 5: Reload Nginx

```bash
# Test configuration
nginx -t

# Reload if test passes
systemctl reload nginx
```

### Step 6: Verify Deployment

1. **Check backend is running:**
   ```bash
   pm2 status
   curl http://localhost:3001/api/health
   ```

2. **Check frontend files:**
   ```bash
   ls -la /var/www/internshipgo-web/ | head -10
   ```

3. **Test in browser:**
   - Go to `https://internshipgo.site`
   - Login as coordinator
   - Navigate to Evidences page
   - Check browser console (F12) for logs
   - Try changing month in calendar view

---

## Quick One-Liner (All Steps)

```bash
cd /var/www/InternshipGo && \
git pull origin main && \
cd backend && pm2 restart all && \
cd .. && \
EXPO_PUBLIC_API_URL=https://internshipgo.site/api npx expo export --platform web && \
rm -rf /var/www/internshipgo-web/* && \
cp -r dist/* /var/www/internshipgo-web/ && \
chown -R www-data:www-data /var/www/internshipgo-web && \
systemctl reload nginx && \
echo "✅ Deployment complete!"
```

---

## What Changed:

### Frontend Changes:
- ✅ Evidences now refetch when month/year changes
- ✅ Better error handling and console logging
- ✅ Null checks for intern ID

### Backend Changes:
- ✅ Fixed date calculation for month filtering
- ✅ Better date range calculation (start/end of month)

---

## Troubleshooting

### If evidences still don't show:

1. **Check browser console (F12):**
   - Look for API calls to `/api/evidences/intern/...`
   - Check for errors
   - Verify response data

2. **Check backend logs:**
   ```bash
   pm2 logs --lines 100
   ```
   - Look for evidence controller logs
   - Check for errors

3. **Verify intern selection:**
   - Make sure an intern is selected
   - Check if interns are being fetched correctly

4. **Check date filtering:**
   - Try different months
   - Check if evidences exist for selected month

---

**Note:** Only the frontend needs rebuilding. The backend just needs a restart (PM2).

