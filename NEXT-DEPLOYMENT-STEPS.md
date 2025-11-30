# Next Steps for Deployment - After API URL Fixes

## ✅ What You've Just Completed

- ✅ Fixed all hardcoded `localhost:3001` API calls
- ✅ Updated `lib/api.ts` to use environment variables
- ✅ Fixed TypeScript errors in all ProfilePage files
- ✅ Added OTP and password reset methods to apiService

---

## 📋 Step 1: Commit and Push Your Changes

**On your local machine:**

```bash
# Navigate to your project
cd C:\Users\admin\Capstone\InternshipGo

# Check what's changed
git status

# Add all changes
git add .

# Commit with descriptive message
git commit -m "Fix API URLs: Replace localhost with environment variables for production deployment"

# Push to GitHub
git push origin main
```

**Verify on GitHub:**
- Go to https://github.com/bjorndimsey/InternshipGo
- Check that your latest commit is there

---

## 📋 Step 2: Pull Changes on Server

**SSH into your server and pull the latest code:**

```bash
# SSH into your server
ssh root@your-server-ip

# Navigate to project directory
cd /var/www/InternshipGo

# Pull latest changes
git pull origin main

# Verify the changes
git log --oneline -5
```

---

## 📋 Step 3: Verify Environment Variables on Server

**Check that `.env` file exists in project root:**

```bash
# Check if .env exists
cd /var/www/InternshipGo
ls -la .env

# If it doesn't exist, create it
nano .env
```

**Add this content:**
```env
EXPO_PUBLIC_API_URL=https://internshipgo.site/api
```

**Save:** `Ctrl+X`, `Y`, `Enter`

---

## 📋 Step 4: Rebuild Frontend with Correct API URL

**Build the frontend with the updated code:**

```bash
# Make sure you're in project root
cd /var/www/InternshipGo

# Install any new dependencies (if package.json changed)
npm install

# Build the frontend for production
npx expo export --platform web

# This will create a 'dist' folder with the built files
```

**Expected output:**
```
✔ Finished in X seconds
```

---

## 📋 Step 5: Deploy the New Build

**Copy the new build to your web directory:**

```bash
# Remove old build (backup first if needed)
rm -rf /var/www/internshipgo-web/*

# Copy new build
cp -r /var/www/InternshipGo/dist/* /var/www/internshipgo-web/

# Set correct permissions
chown -R www-data:www-data /var/www/internshipgo-web
chmod -R 755 /var/www/internshipgo-web
```

---

## 📋 Step 6: Restart Services (if needed)

**Restart Nginx to ensure it's serving the new files:**

```bash
# Test Nginx configuration
nginx -t

# If test passes, reload Nginx
systemctl reload nginx

# Check Nginx status
systemctl status nginx
```

**Restart backend (if you made backend changes):**

```bash
# Restart PM2 process
pm2 restart internshipgo-api

# Check status
pm2 status
pm2 logs internshipgo-api --lines 50
```

---

## 📋 Step 7: Test Your Deployment

**1. Test the website:**
```bash
# Open in browser
https://internshipgo.site
```

**2. Test API connection:**
- Open browser DevTools (F12)
- Go to Network tab
- Try logging in
- Check that API calls go to `https://internshipgo.site/api` (NOT localhost)

**3. Test from command line:**
```bash
# Test API health endpoint
curl https://internshipgo.site/api/health

# Test API directly
curl https://internshipgo.site/api/auth/login \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test"}'
```

---

## 📋 Step 8: Verify SSL Certificate

**Check SSL certificate status:**

```bash
# Check certificate expiration
certbot certificates

# Test SSL configuration
openssl s_client -connect internshipgo.site:443 -servername internshipgo.site
```

**If certificate issues persist:**
```bash
# Renew certificate manually
certbot renew --dry-run

# If dry-run works, renew for real
certbot renew
```

---

## 📋 Step 9: Monitor and Debug

**Check logs if something isn't working:**

```bash
# Backend logs
pm2 logs internshipgo-api --lines 100

# Nginx error logs
tail -f /var/log/nginx/error.log

# Nginx access logs
tail -f /var/log/nginx/access.log

# Check if backend is running
curl http://localhost:3001/api/health
```

---

## 🔍 Troubleshooting Common Issues

### Issue: Still seeing localhost in browser
**Solution:**
1. Clear browser cache (Ctrl+Shift+Delete)
2. Hard refresh (Ctrl+F5)
3. Check browser DevTools → Network tab to see actual API calls
4. Verify `.env` file has correct URL
5. Rebuild frontend: `npx expo export --platform web`

### Issue: CORS errors
**Solution:**
1. Check backend CORS configuration in `backend/server.js`
2. Ensure `FRONTEND_URL=https://internshipgo.site` in backend `.env`
3. Restart backend: `pm2 restart internshipgo-api`

### Issue: 404 errors on API calls
**Solution:**
1. Check Nginx configuration for `/api` proxy
2. Verify backend is running: `pm2 status`
3. Test backend directly: `curl http://localhost:3001/api/health`

### Issue: SSL certificate errors
**Solution:**
1. Check DNS propagation: `nslookup internshipgo.site`
2. Verify A record points to correct IP
3. Wait 10-30 minutes for DNS propagation
4. Use `certbot certonly --standalone` if needed

---

## ✅ Deployment Checklist

- [ ] Changes committed and pushed to GitHub
- [ ] Changes pulled on server
- [ ] `.env` file created/updated with `EXPO_PUBLIC_API_URL`
- [ ] Frontend rebuilt with `npx expo export --platform web`
- [ ] New build copied to `/var/www/internshipgo-web`
- [ ] Nginx reloaded
- [ ] Backend restarted (if needed)
- [ ] Website accessible at `https://internshipgo.site`
- [ ] API calls going to `https://internshipgo.site/api` (not localhost)
- [ ] Login functionality working
- [ ] SSL certificate valid
- [ ] No CORS errors in browser console

---

## 🎉 After Deployment

**Once everything is working:**

1. **Test all features:**
   - User registration
   - Login (email and Google)
   - Password reset
   - Profile updates
   - All user dashboards

2. **Monitor performance:**
   ```bash
   pm2 monit
   ```

3. **Set up monitoring (optional):**
   - PM2 monitoring
   - Nginx access logs
   - Error tracking

4. **Update mobile app:**
   - Update API URL in mobile codebase to `https://internshipgo.site/api`
   - Rebuild mobile app

---

## 📞 Quick Reference Commands

```bash
# Pull latest code
cd /var/www/InternshipGo && git pull origin main

# Rebuild frontend
npx expo export --platform web

# Deploy frontend
cp -r dist/* /var/www/internshipgo-web/

# Restart services
pm2 restart internshipgo-api
systemctl reload nginx

# Check status
pm2 status
systemctl status nginx

# View logs
pm2 logs internshipgo-api
tail -f /var/log/nginx/error.log
```

---

**You're almost there! Follow these steps and your application will be fully deployed! 🚀**

