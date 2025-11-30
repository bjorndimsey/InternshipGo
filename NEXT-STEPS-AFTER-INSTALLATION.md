# Next Steps After Installation - Complete Guide

## ✅ What You've Completed

From your terminal, I can see:
- ✅ **PM2 installed** (version 6.0.14) - Process manager ready
- ✅ **Nginx installed** (version 1.24.0) - Web server ready
- ✅ **Node.js installed** - Backend runtime ready

**Great progress! Now let's deploy your application.**

---

## 📋 Step 1: Clone Your Repository

**Get your code onto the server:**

```bash
# Navigate to web directory
cd /var/www

# Clone your repository (replace with your actual repo URL)
# Option A: If using HTTPS
git clone https://github.com/yourusername/InternshipGo.git

# Option B: If using SSH key (recommended)
git clone git@github.com:yourusername/InternshipGo.git

# Navigate to project
cd InternshipGo
```

**If you don't have a Git repository yet:**
```bash
# Create directory structure
mkdir -p /var/www/internshipgo
cd /var/www/internshipgo

# You'll need to upload your files manually or create a repo first
```

---

## 📋 Step 2: Setup Backend API

**Configure your backend:**

```bash
# Navigate to backend folder
cd /var/www/InternshipGo/backend

# Install dependencies
npm install

# This may take a few minutes...
```

**Create environment file:**
```bash
# Create .env file
nano .env
```

**Add this configuration (replace with your actual values):**
```env
# Server Configuration
PORT=3001
NODE_ENV=production

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_supabase_anon_key_here
SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Frontend URL (replace with your domain)
FRONTEND_URL=https://your-domain.com

# JWT Secret (generate a random string - keep this secret!)
JWT_SECRET=your-super-secret-jwt-key-change-this-to-random-string

# Database Configuration (if using direct PostgreSQL)
DB_HOST=db.your-project.supabase.co
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=your_supabase_password
DB_SSL=true
```

**Save and exit:**
- Press `Ctrl+X`
- Press `Y` to confirm
- Press `Enter` to save

**Get your Supabase credentials:**
1. Go to https://supabase.com
2. Open your project
3. Go to Settings → API
4. Copy the URL and keys
5. Go to Settings → Database
6. Copy connection details

---

## 📋 Step 3: Start Backend with PM2

**Start your backend API:**

```bash
# Start backend
pm2 start server.js --name internshipgo-api

# Check status
pm2 status

# View logs
pm2 logs internshipgo-api
```

**You should see:**
```
🚀 Server running on port 3001
```

**Save PM2 configuration:**
```bash
# Save current process list
pm2 save

# Setup PM2 to start on server reboot
pm2 startup
```

**Copy and run the command it outputs** (usually something like):
```bash
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u root --hp /root
```

**Test if backend is running:**
```bash
# Test health endpoint
curl http://localhost:3001/health

# Or test any endpoint
curl http://localhost:3001/api/health
```

**Expected response:** JSON with server status

---

## 📋 Step 4: Update API URL in Web Codebase

**Before building, update the API URL:**

```bash
# Navigate to project root
cd /var/www/InternshipGo

# Edit API configuration
nano lib/api.ts
```

**Find this line:**
```typescript
const API_BASE_URL = 'http://localhost:3001/api';
```

**Change to (replace with your domain):**
```typescript
const API_BASE_URL = 'https://your-domain.com/api';
```

**Or use environment variable (better approach):**
```typescript
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://your-domain.com/api';
```

**Save and exit:** `Ctrl+X`, `Y`, `Enter`

---

## 📋 Step 5: Build Web Frontend

**Build your web application:**

```bash
# Make sure you're in project root
cd /var/www/InternshipGo

# Install dependencies (if not done)
npm install

# Build web version
npm run web -- --no-dev --minify

# Or using Expo CLI:
# npx expo export:web
```

**This will create a `web-build` folder with your static files.**

**If build fails, try:**
```bash
# Install Expo CLI globally
npm install -g expo-cli

# Then build
npx expo export:web
```

---

## 📋 Step 6: Deploy Web Files to Nginx

**Copy build files to Nginx directory:**

```bash
# Create web directory
mkdir -p /var/www/internshipgo-web

# Copy build files
cp -r web-build/* /var/www/internshipgo-web/

# Set proper permissions
chown -R www-data:www-data /var/www/internshipgo-web
chmod -R 755 /var/www/internshipgo-web
```

**Verify files are there:**
```bash
ls -la /var/www/internshipgo-web
```

**You should see:** `index.html` and other web files

---

## 📋 Step 7: Configure Nginx

**Create Nginx configuration:**

```bash
# Create config file
nano /etc/nginx/sites-available/internshipgo
```

**Add this configuration (replace `your-domain.com` with your actual domain):**
```nginx
# Upstream for backend API
upstream backend_api {
    server localhost:3001;
}

server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    root /var/www/internshipgo-web;
    index index.html;

    # Serve web frontend
    location / {
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }

    # Proxy API requests to backend
    location /api {
        proxy_pass http://backend_api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Static assets caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

**Save and exit:** `Ctrl+X`, `Y`, `Enter`

**Enable the site:**
```bash
# Create symbolic link
ln -s /etc/nginx/sites-available/internshipgo /etc/nginx/sites-enabled/

# Remove default site (optional)
rm /etc/nginx/sites-enabled/default

# Test Nginx configuration
nginx -t
```

**You should see:**
```
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

**Reload Nginx:**
```bash
systemctl reload nginx
```

---

## 📋 Step 8: Configure Domain DNS

**Point your domain to your server:**

1. **Get your server IP:**
   ```bash
   hostname -I
   # Or check from your terminal: 72.62.64.141
   ```

2. **Update DNS records** in your domain registrar:
   - **A Record**: `@` → `72.62.64.141` (or your server IP)
   - **A Record**: `www` → `72.62.64.141` (or your server IP)

3. **Wait for DNS propagation** (5 minutes to 48 hours)

**Test DNS:**
```bash
# Check if DNS is pointing to your server
nslookup your-domain.com
```

**You should see your server IP in the response.**

---

## 📋 Step 9: Setup SSL Certificate (HTTPS)

**Get free SSL certificate:**

```bash
# Get SSL certificate (replace with your domain)
certbot --nginx -d your-domain.com -d www.your-domain.com
```

**Follow the prompts:**
1. Enter your email address
2. Agree to terms of service (A)
3. Choose whether to share email (your choice)
4. Choose redirect HTTP to HTTPS (option 2 - recommended)

**Test auto-renewal:**
```bash
certbot renew --dry-run
```

**Your site is now accessible at:** `https://your-domain.com` ✅

---

## 📋 Step 10: Verify Everything Works

**Check all services:**

```bash
# Check backend status
pm2 status

# Check backend logs
pm2 logs internshipgo-api --lines 20

# Check Nginx status
systemctl status nginx

# Test backend API
curl http://localhost:3001/health

# Test website
curl http://localhost
```

**Test from browser:**
- Visit: `https://your-domain.com`
- Should see your web application
- Test API: `https://your-domain.com/api/health`

---

## 🔧 Quick Commands Reference

### PM2 Management:
```bash
# View all processes
pm2 status

# View logs
pm2 logs internshipgo-api

# Restart backend
pm2 restart internshipgo-api

# Stop backend
pm2 stop internshipgo-api

# Monitor resources
pm2 monit
```

### Nginx Management:
```bash
# Reload configuration
systemctl reload nginx

# Restart Nginx
systemctl restart nginx

# Check status
systemctl status nginx

# View error logs
tail -f /var/log/nginx/error.log
```

### View Logs:
```bash
# Backend logs
pm2 logs internshipgo-api

# Nginx access logs
tail -f /var/log/nginx/access.log

# Nginx error logs
tail -f /var/log/nginx/error.log

# System logs
journalctl -u nginx -f
```

---

## 🐛 Troubleshooting

### Backend not starting?
```bash
# Check logs
pm2 logs internshipgo-api

# Check if port 3001 is in use
netstat -tulpn | grep 3001

# Restart backend
pm2 restart internshipgo-api

# Check if .env file exists and is correct
cat backend/.env
```

### Nginx not working?
```bash
# Check configuration syntax
nginx -t

# Check error logs
tail -f /var/log/nginx/error.log

# Check if Nginx is running
systemctl status nginx

# Restart Nginx
systemctl restart nginx
```

### Can't access website?
```bash
# Check firewall
ufw status

# Allow HTTP/HTTPS (if firewall is active)
ufw allow 80/tcp
ufw allow 443/tcp

# Check if domain DNS is correct
nslookup your-domain.com

# Test locally first
curl http://localhost
```

### API not responding?
```bash
# Check if backend is running
pm2 status

# Check backend logs
pm2 logs internshipgo-api

# Test API directly
curl http://localhost:3001/api/health

# Check CORS settings in backend
```

---

## ✅ Deployment Checklist

- [ ] Repository cloned to `/var/www/InternshipGo`
- [ ] Backend dependencies installed (`npm install` in backend folder)
- [ ] Backend `.env` file created with correct values
- [ ] Backend started with PM2 (`pm2 start server.js`)
- [ ] PM2 configured to start on boot (`pm2 startup`)
- [ ] API URL updated in `lib/api.ts`
- [ ] Web frontend built (`npm run web` or `npx expo export:web`)
- [ ] Web files copied to `/var/www/internshipgo-web`
- [ ] Nginx configuration created
- [ ] Nginx site enabled and tested
- [ ] Domain DNS configured
- [ ] SSL certificate installed
- [ ] Website accessible via HTTPS
- [ ] API responding correctly

---

## 🎉 You're Almost Done!

**After completing these steps:**
1. ✅ Your backend API will be running
2. ✅ Your website will be live
3. ✅ Everything will be secured with HTTPS
4. ✅ Services will auto-start on server reboot

**Next:**
- Update your mobile codebase API URL to `https://your-domain.com/api`
- Test all features
- Monitor with `pm2 monit`

**Congratulations! Your InternshipGo platform is being deployed!** 🚀

