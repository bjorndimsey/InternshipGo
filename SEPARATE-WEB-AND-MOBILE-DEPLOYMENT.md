# Deployment Guide: Separate Web & Mobile Codebases

## 📋 Your Current Setup

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    YOUR PROJECT STRUCTURE                    │
└─────────────────────────────────────────────────────────────┘

Codebase 1: Web Application (Current Repository)
├── React Native Web (Expo)
├── Web-only codebase
└── Connects to: Backend API

Codebase 2: Mobile Application (Separate Repository)
├── React Native (Expo)
├── Mobile-only codebase
├── Uses Expo Go (development)
└── Connects to: Same Backend API

Backend API (Current Repository - backend/ folder)
├── Node.js/Express
├── Shared by both codebases
└── Single source of truth
```

---

## 🎯 Deployment Strategy

### One Ubuntu Server for Everything

**Your setup:**
- ✅ **One Backend API** → Hosted on Ubuntu Server
- ✅ **Web Codebase** → Deployed on Ubuntu Server (as website)
- ✅ **Mobile Codebase** → Built separately, connects to same backend
- ✅ **One Subscription** → Handles all three!

---

## 🏗️ Complete Architecture

```
┌─────────────────────────────────────────────────────────────┐
│         Ubuntu Server 22.04 LTS (ONE SUBSCRIPTION)          │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Backend API (Port 3001)                             │  │
│  │  - Node.js/Express                                    │  │
│  │  - Shared by:                                         │  │
│  │    • Web Codebase (website)                            │  │
│  │    • Mobile Codebase (Expo app)                       │  │
│  └──────────────────────────────────────────────────────┘  │
│                       │                                       │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Web Frontend (Port 80/443)                          │  │
│  │  - Nginx serves static files                         │  │
│  │  - Built from: Web Codebase                          │  │
│  │  - Makes API calls to Backend API                    │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
         │                    │
         │                    │
    Web Users          Mobile App Users
  (Browser)            (Expo Go / Production Build)
```

---

## 📱 Understanding Expo Go vs Production Builds

### Expo Go (Development/Testing)

**What it is:**
- Development tool for testing mobile apps
- Users install Expo Go app from app stores
- You share a QR code or link
- Users scan/click to open your app in Expo Go

**Limitations:**
- ⚠️ Not for production deployment
- ⚠️ Limited to Expo SDK features
- ⚠️ Can't use custom native modules
- ⚠️ Slower performance

**When to use:**
- ✅ Development and testing
- ✅ Quick demos
- ✅ Internal testing

### Production Builds (For App Stores)

**What it is:**
- Standalone app (`.apk` for Android, `.ipa` for iOS)
- Installed directly on user's phone
- Full native performance
- Can use custom native modules

**When to use:**
- ✅ Production deployment
- ✅ App store distribution
- ✅ Public release

---

## 🚀 Deployment Steps

### Step 1: Deploy Backend API (Ubuntu Server)

**This is shared by both codebases!**

```bash
# On Ubuntu Server
1. Clone your current repository (has backend/)
2. Install Node.js, PM2, Nginx
3. Deploy Backend API:
   cd backend
   npm install
   pm2 start server.js --name internshipgo-api
4. Configure environment variables
5. Backend API runs on port 3001
```

**Result:**
- ✅ API accessible at: `https://your-domain.com/api/*`
- ✅ Used by both web and mobile codebases

---

### Step 2: Deploy Web Codebase (Ubuntu Server)

**Deploy your current web codebase as a website:**

```bash
# On Ubuntu Server
1. Clone your web codebase repository
2. Install dependencies:
   npm install
3. Build web version:
   npm run web -- --no-dev --minify
   # Or: npx expo export:web
4. Copy build files to Nginx:
   sudo cp -r web-build/* /var/www/internshipgo-web/
5. Configure Nginx to serve files
```

**Update API URL in web codebase:**

```typescript
// lib/api.ts (in your web codebase)
// Change from:
const API_BASE_URL = 'http://localhost:3001/api';

// To:
const API_BASE_URL = 'https://your-domain.com/api';
```

**Result:**
- ✅ Website accessible at: `https://your-domain.com`
- ✅ Connects to same backend API

---

### Step 3: Configure Mobile Codebase

**Update mobile codebase to use production API:**

```typescript
// In your mobile codebase (separate repository)
// lib/api.ts or config/api.ts

// Change from:
const API_BASE_URL = 'http://localhost:3001/api';

// To:
const API_BASE_URL = 'https://your-domain.com/api';
```

**For Expo Go (Development):**

```bash
# In your mobile codebase
1. Update API URL to point to your server
2. Start Expo:
   npx expo start
3. Share QR code with testers
4. They scan with Expo Go app
```

**For Production Build:**

```bash
# In your mobile codebase
1. Update API URL to point to your server
2. Build production app:
   npx eas build --platform android
   npx eas build --platform ios
3. Upload to app stores
```

**Result:**
- ✅ Mobile app connects to same backend API
- ✅ Same data as web application
- ✅ Shared authentication and data

---

## 🔧 Configuration Management

### Environment-Based API URLs

**Best Practice: Use environment variables**

#### Web Codebase Configuration:

```typescript
// lib/api.ts
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 
                     process.env.API_BASE_URL || 
                     'http://localhost:3001/api';
```

**Create `.env` file:**
```env
# .env (web codebase)
EXPO_PUBLIC_API_URL=https://your-domain.com/api
```

#### Mobile Codebase Configuration:

```typescript
// lib/api.ts (mobile codebase)
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 
                     process.env.API_BASE_URL || 
                     'http://localhost:3001/api';
```

**Create `.env` file:**
```env
# .env (mobile codebase)
EXPO_PUBLIC_API_URL=https://your-domain.com/api
```

**Benefits:**
- ✅ Easy to switch between development and production
- ✅ No code changes needed
- ✅ Different URLs for different environments

---

## 📊 Complete Deployment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    INTERNET USERS                           │
└───────────────┬───────────────────┬───────────────────────┘
                 │                   │
        ┌────────▼────────┐  ┌───────▼────────┐
        │   Web Users     │  │  Mobile Users   │
        │   (Browser)     │  │  (Expo Go/App)  │
        └────────┬────────┘  └───────┬─────────┘
                 │                   │
        ┌────────▼───────────────────▼────────┐
        │   Ubuntu Server (ONE SUBSCRIPTION)  │
        │                                    │
        │  ┌──────────────────────────────┐ │
        │  │  Nginx (Port 80/443)        │ │
        │  │  - Serves Web Codebase       │ │
        │  │  - Proxies /api/* requests    │ │
        │  └──────────────┬───────────────┘ │
        │                 │                  │
        │  ┌──────────────▼───────────────┐ │
        │  │  Backend API (Port 3001)     │ │
        │  │  - Node.js/Express            │ │
        │  │  - Shared by both codebases   │ │
        │  └──────────────┬───────────────┘ │
        └─────────────────┼──────────────────┘
                          │
        ┌─────────────────▼──────────────────┐
        │  External Services (Cloud)          │
        │  - Supabase (Database)              │
        │  - Cloudinary (File Storage)        │
        └─────────────────────────────────────┘
```

---

## 🔄 Development Workflow

### Local Development

**Web Codebase:**
```bash
# Terminal 1: Start Backend
cd InternshipGo
npm run backend

# Terminal 2: Start Web
npm start --web
# Opens: http://localhost:8081
```

**Mobile Codebase:**
```bash
# Terminal 1: Start Backend (same as above)
cd InternshipGo
npm run backend

# Terminal 2: Start Mobile (in separate repo)
cd InternshipGo-Mobile
npx expo start
# Scan QR code with Expo Go
```

**Both use:**
- Same backend API: `http://localhost:3001/api`
- Same database (Supabase)
- Same file storage (Cloudinary)

---

### Production Deployment

**Backend API:**
```bash
# On Ubuntu Server
- Deploy backend from current repository
- Runs on: https://your-domain.com/api/*
```

**Web Codebase:**
```bash
# On Ubuntu Server
- Build web version from web codebase
- Deploy to Nginx
- Accessible at: https://your-domain.com
```

**Mobile Codebase:**
```bash
# On your development machine
- Update API URL to: https://your-domain.com/api
- Build production app
- Upload to app stores
```

---

## ✅ Benefits of This Architecture

### Advantages:

1. **Separation of Concerns**
   - Web codebase optimized for web
   - Mobile codebase optimized for mobile
   - No compromises needed

2. **Independent Development**
   - Web team works on web codebase
   - Mobile team works on mobile codebase
   - No conflicts or merge issues

3. **Shared Backend**
   - One API serves both
   - Consistent data and business logic
   - Single source of truth

4. **Cost Effective**
   - One server subscription
   - Shared infrastructure
   - Efficient resource usage

5. **Flexible Deployment**
   - Deploy web and mobile independently
   - Update one without affecting the other
   - Different release cycles

---

## 🎯 Deployment Checklist

### Backend API (Current Repository)
- [ ] Deploy to Ubuntu Server
- [ ] Configure environment variables
- [ ] Set up PM2 for process management
- [ ] Configure Nginx reverse proxy
- [ ] Set up SSL certificate
- [ ] Test API endpoints

### Web Codebase (Current Repository)
- [ ] Update API URL to production
- [ ] Build web version
- [ ] Deploy to Ubuntu Server
- [ ] Configure Nginx to serve files
- [ ] Test website functionality

### Mobile Codebase (Separate Repository)
- [ ] Update API URL to production
- [ ] Test with Expo Go (development)
- [ ] Build production app (for stores)
- [ ] Upload to Google Play Store
- [ ] Upload to Apple App Store

---

## 💡 Important Notes

### Expo Go Limitations:

**If you're using Expo Go:**
- ✅ Great for development and testing
- ⚠️ Not suitable for production
- ⚠️ Users need Expo Go app installed
- ⚠️ Limited to Expo SDK features

**For Production:**
- ✅ Build standalone apps (`.apk`/`.ipa`)
- ✅ Upload to app stores
- ✅ Full native performance
- ✅ No Expo Go dependency

### API URL Configuration:

**Make sure both codebases use the same API URL:**
- Web: `https://your-domain.com/api`
- Mobile: `https://your-domain.com/api`
- Both connect to same backend!

### CORS Configuration:

**Backend must allow both origins:**
```javascript
// backend/server.js
const allowedOrigins = [
  'https://your-domain.com',        // Web codebase
  'exp://your-expo-url',            // Expo Go
  'http://localhost:8081',          // Local web
  'http://localhost:19006',         // Local Expo
];
```

---

## 📝 Summary

### Your Setup:
- ✅ **Web Codebase** → Deployed as website on Ubuntu Server
- ✅ **Mobile Codebase** → Separate repo, connects to same backend
- ✅ **Backend API** → One server, shared by both
- ✅ **One Subscription** → Ubuntu Server handles everything

### Key Points:
1. Both codebases are separate projects
2. Both connect to the same backend API
3. One Ubuntu Server subscription is enough
4. Update API URLs in both codebases to point to your server
5. Expo Go is for development; build production apps for stores

### Next Steps:
1. Deploy backend API to Ubuntu Server
2. Deploy web codebase to same server
3. Update mobile codebase API URL
4. Test both with production backend
5. Build production mobile apps when ready

---

**You're all set! One Ubuntu Server subscription can handle your web codebase, mobile codebase backend, and everything else!** 🚀

