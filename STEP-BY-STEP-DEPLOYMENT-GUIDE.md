# Step-by-Step Deployment Guide - Starting from SSH Login

## 🎯 You're Here: Successfully Logged In via SSH

**Current Status:**
- ✅ Ubuntu 24.04.3 LTS installed
- ✅ SSH connection established
- ✅ Root access confirmed
- ✅ Ready to deploy!

---

## 📋 Step 1: Update System (IMPORTANT!)

**First, update your system to get latest security patches:**

```bash
# Update package list
apt update

# Upgrade all packages
apt upgrade -y

# Install essential tools
apt install -y curl wget git build-essential
```

**Why:** Your terminal shows "25 updates can be applied immediately" - let's get those!

---

## 📋 Step 2: Install Node.js 20.x

**Install Node.js for your Backend API:**

```bash
# Add NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -

# Install Node.js
apt install -y nodejs

# Verify installation
node -v   # Should show v20.x.x
npm -v    # Should show 10.x.x
```

**Expected Output:**
```
v20.18.0  (or similar)
10.8.2    (or similar)
```

---

## 📋 Step 3: Install PM2 (Process Manager)

**PM2 keeps your backend running 24/7:**

```bash
# Install PM2 globally
npm install -g pm2

# Verify installation
pm2 -v
```

**Expected Output:**
```
5.3.0  (or similar)
```

---

## 📋 Step 4: Install Nginx (Web Server)

**Nginx will serve your web frontend and proxy API requests:**

```bash
# Install Nginx
apt install -y nginx

# Start Nginx
systemctl start nginx

# Enable Nginx to start on boot
systemctl enable nginx

# Check status
systemctl status nginx
```

**Verify it's working:**
```bash
# Test Nginx
curl http://localhost
```

**You should see:** Nginx welcome page HTML

---

## 📋 Step 5: Install Certbot (SSL Certificates)

**For free HTTPS certificates (Let's Encrypt):**

```bash
# Install Certbot
apt install -y certbot python3-certbot-nginx
```

---

## 📋 Step 6: Clone Your Repository

**Get your code onto the server:**

```bash
# Navigate to web directory
cd /var/www

# Clone your repository (replace with your actual repo URL)
git clone https://github.com/yourusername/InternshipGo.git

# Or if using SSH key:
# git clone git@github.com:yourusername/InternshipGo.git

# Navigate to project
cd InternshipGo
```

**If you don't have Git repository yet:**
```bash
# Create directory
mkdir -p /var/www/internshipgo
cd /var/www/internshipgo
```

---

## 📋 Step 7: Setup Backend API

**Configure and start your backend:**

```bash
# Navigate to backend
cd /var/www/InternshipGo/backend

# Install dependencies
npm install

# Create .env file
nano .env
```

**Add this to .env file:**
```env
# Server Configuration
PORT=3001
NODE_ENV=production

# Supabase Configuration
SUPABASE_URL=your_supabase_url_here
SUPABASE_KEY=your_supabase_key_here
SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Frontend URL (your domain)
FRONTEND_URL=https://your-domain.com

# JWT Secret (generate a random string)
JWT_SECRET=your-super-secret-jwt-key-change-this
```

**Save and exit:** `Ctrl+X`, then `Y`, then `Enter`

**Start backend with PM2:**
```bash
# Start backend
pm2 start server.js --name internshipgo-api

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Follow the command it outputs (usually: sudo env PATH=... pm2 startup systemd -u root --hp /root)
```

**Check if it's running:**
```bash
pm2 status
pm2 logs internshipgo-api
```

**You should see:** `🚀 Server running on port 3001`

---

## 📋 Step 8: Build and Deploy Web Frontend

**Build your web codebase:**

```bash
# Navigate to project root
cd /var/www/InternshipGo

# Install dependencies
npm install

# Update API URL in lib/api.ts first!
nano lib/api.ts
```

**Change this line:**
```typescript
// Change from:
const API_BASE_URL = 'http://localhost:3001/api';

// To:
const API_BASE_URL = 'https://your-domain.com/api';
```

**Build web version:**
```bash
# Build for web
npm run web -- --no-dev --minify

# Or using Expo:
# npx expo export:web
```

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

---

## 📋 Step 9: Configure Nginx

**Create Nginx configuration:**

```bash
# Create config file
nano /etc/nginx/sites-available/internshipgo
```

**Add this configuration:**
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

**Save and exit:** `Ctrl+X`, then `Y`, then `Enter`

**Enable the site:**
```bash
# Create symbolic link
ln -s /etc/nginx/sites-available/internshipgo /etc/nginx/sites-enabled/

# Remove default site (optional)
rm /etc/nginx/sites-enabled/default

# Test Nginx configuration
nginx -t
```

**You should see:** `nginx: configuration file /etc/nginx/nginx.conf test is successful`

**Reload Nginx:**
```bash
systemctl reload nginx
```

---

## 📋 Step 10: Configure Domain DNS

**Point your domain to your server:**

1. **Get your server IP:**
   ```bash
   # Your IP is shown in terminal: 72.62.64.141
   hostname -I
   ```

2. **Update DNS records** (in your domain registrar):
   - **A Record**: `@` → `72.62.64.141`
   - **A Record**: `www` → `72.62.64.141`

3. **Wait for DNS propagation** (5 minutes to 48 hours)

**Test DNS:**
```bash
# Check if DNS is pointing to your server
nslookup your-domain.com
```

---

## 📋 Step 11: Setup SSL Certificate (HTTPS)

**Get free SSL certificate from Let's Encrypt:**

```bash
# Get SSL certificate
certbot --nginx -d your-domain.com -d www.your-domain.com

# Follow the prompts:
# - Enter your email
# - Agree to terms
# - Choose redirect HTTP to HTTPS (option 2)
```

**Auto-renewal is automatic, but test it:**
```bash
# Test renewal
certbot renew --dry-run
```

**Your site is now accessible at:** `https://your-domain.com` ✅

---

## 📋 Step 12: Verify Everything Works

**Check all services:**

```bash
# Check backend API
pm2 status
pm2 logs internshipgo-api --lines 20

# Check Nginx
systemctl status nginx

# Check if backend is responding
curl http://localhost:3001/health

# Check if website is accessible
curl http://localhost
```

**Test from browser:**
- Visit: `https://your-domain.com`
- Should see your web application
- Test API: `https://your-domain.com/api/health`

---

## 📋 Step 13: Update Mobile Codebase API URL

**In your mobile codebase (separate repository):**

```typescript
// lib/api.ts (in mobile codebase)
// Change from:
const API_BASE_URL = 'http://localhost:3001/api';

// To:
const API_BASE_URL = 'https://your-domain.com/api';
```

**Now your mobile app will connect to production backend!**

---

## 🔧 Useful Commands for Management

### PM2 Commands:
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

### Nginx Commands:
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

### System Commands:
```bash
# Check disk usage
df -h

# Check memory usage
free -h

# Check CPU usage
top

# View system info
htop  # (install with: apt install htop)
```

---

## 🐛 Troubleshooting

### Backend not starting?
```bash
# Check logs
pm2 logs internshipgo-api

# Check if port is in use
netstat -tulpn | grep 3001

# Restart backend
pm2 restart internshipgo-api
```

### Nginx not working?
```bash
# Check configuration
nginx -t

# Check error logs
tail -f /var/log/nginx/error.log

# Check if Nginx is running
systemctl status nginx
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
```

### API not responding?
```bash
# Check if backend is running
pm2 status

# Check backend logs
pm2 logs internshipgo-api

# Test API directly
curl http://localhost:3001/api/health
```

---

## ✅ Deployment Checklist

- [ ] System updated
- [ ] Node.js 20.x installed
- [ ] PM2 installed and configured
- [ ] Nginx installed and running
- [ ] Repository cloned
- [ ] Backend dependencies installed
- [ ] Backend .env file configured
- [ ] Backend running with PM2
- [ ] Web frontend built
- [ ] Web files copied to Nginx directory
- [ ] Nginx configuration created
- [ ] Domain DNS configured
- [ ] SSL certificate installed
- [ ] Website accessible via HTTPS
- [ ] API responding correctly
- [ ] Mobile codebase API URL updated

---

## 🎉 You're Done!

**Your deployment is complete!**

**Access your application:**
- **Website**: `https://your-domain.com`
- **API**: `https://your-domain.com/api/*`

**Next Steps:**
1. Test all features
2. Monitor performance with `pm2 monit`
3. Set up regular backups
4. Update mobile app to use production API
5. Build and deploy mobile apps to stores

---

## 📚 Additional Resources

- **PM2 Documentation**: https://pm2.keymetrics.io/docs/
- **Nginx Documentation**: https://nginx.org/en/docs/
- **Let's Encrypt**: https://letsencrypt.org/docs/

**Congratulations! Your InternshipGo platform is now live!** 🚀

