# Troubleshooting 502 Bad Gateway Errors

## 🔴 Issue
Your production site (`https://internshipgo.site`) is returning **502 Bad Gateway** errors on multiple endpoints:
- `/api/platform/stats`
- `/api/landing/companies`
- `/api/auth/locations`

## What 502 Bad Gateway Means
A 502 error indicates that:
1. **The backend server is down or not responding**
2. **The proxy/load balancer can't reach the backend**
3. **The server crashed or is overloaded**
4. **Network connectivity issue between proxy and backend**

## 🔍 Diagnostic Steps

### 1. Check Backend Server Status
SSH into your server and check if the Node.js process is running:

```bash
# Check if Node.js process is running
ps aux | grep node

# Check if the port is listening
netstat -tulpn | grep :3001
# or
lsof -i :3001

# Check server logs
pm2 logs
# or
tail -f /path/to/your/logs/server.log
```

### 2. Check Server Health
```bash
# Test if server responds locally
curl http://localhost:3001/health

# Check server status
systemctl status your-backend-service
# or
pm2 status
```

### 3. Check Nginx/Proxy Configuration
If using Nginx as reverse proxy:

```bash
# Check Nginx status
sudo systemctl status nginx

# Check Nginx error logs
sudo tail -f /var/log/nginx/error.log

# Test Nginx configuration
sudo nginx -t

# Check Nginx config for your site
sudo nano /etc/nginx/sites-available/internshipgo.site
```

Verify the proxy configuration points to the correct backend:
```nginx
location /api {
    proxy_pass http://localhost:3001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
}
```

### 4. Check Server Resources
```bash
# Check memory usage
free -h

# Check disk space
df -h

# Check CPU usage
top
```

### 5. Check Database Connection
The backend might be failing to connect to Supabase:

```bash
# Check backend logs for database errors
pm2 logs backend
# or check your log files
```

## 🛠️ Quick Fixes

### Restart Backend Server
```bash
# If using PM2
pm2 restart all
# or
pm2 restart backend

# If using systemd
sudo systemctl restart your-backend-service

# If running manually
# Kill the process and restart
pkill -f node
cd /path/to/backend
npm start
```

### Restart Nginx/Proxy
```bash
sudo systemctl restart nginx
```

### Check Environment Variables
Ensure all required environment variables are set:
```bash
# Check .env file exists and has correct values
cat backend/.env

# Verify SUPABASE_KEY is set
echo $SUPABASE_KEY
```

## 🔧 Common Causes & Solutions

### 1. Server Crashed
**Solution:** Restart the server
```bash
pm2 restart all
```

### 2. Out of Memory
**Solution:** 
- Increase server memory
- Or optimize the application
- Check for memory leaks

### 3. Port Not Listening
**Solution:**
```bash
# Check if port is in use
lsof -i :3001

# If port is blocked, change it or free it
```

### 4. Database Connection Failed
**Solution:**
- Check Supabase credentials in `.env`
- Verify Supabase service is up
- Check network connectivity

### 5. Nginx Configuration Error
**Solution:**
```bash
# Test and reload Nginx
sudo nginx -t
sudo systemctl reload nginx
```

## 📋 Prevention Checklist

- [ ] Set up process manager (PM2) with auto-restart
- [ ] Configure health check endpoint monitoring
- [ ] Set up log rotation
- [ ] Monitor server resources
- [ ] Set up alerts for 502 errors
- [ ] Regular backup of environment variables

## 🚨 Emergency Steps

If the site is completely down:

1. **SSH into server**
2. **Check if backend is running:**
   ```bash
   pm2 list
   ```
3. **Restart backend:**
   ```bash
   pm2 restart all
   ```
4. **Check logs:**
   ```bash
   pm2 logs --lines 50
   ```
5. **If PM2 not installed, start manually:**
   ```bash
   cd /path/to/backend
   npm start
   ```

## 📞 Next Steps

1. **Immediate:** SSH into server and restart backend
2. **Short-term:** Check logs to identify root cause
3. **Long-term:** Set up monitoring and auto-restart mechanisms

## 🔗 Useful Commands

```bash
# View recent logs
pm2 logs --lines 100

# Monitor in real-time
pm2 monit

# Check server status
pm2 status

# Restart specific app
pm2 restart backend

# View error logs only
pm2 logs --err

# Check system resources
htop
```

