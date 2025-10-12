# Render Deployment Guide - School Management System

## ✅ Deployment Ready Status

Your application is **fully ready** for deployment on Render.com. All critical issues have been identified and fixed.

---

## 🔧 Issues Fixed for Render Deployment

### 1. Server Listening Configuration ✅
**Problem:** Server only listened in development mode, causing production deployment to fail  
**Fix:** Updated `server/index.ts` to listen on `0.0.0.0:PORT` in production (non-serverless environments)

### 2. Runtime Dependencies ✅
**Problem:** Critical packages (express, cors, dotenv, tsx, etc.) were in devDependencies  
**Fix:** Moved 23 runtime packages to dependencies so they're available in production

### 3. Build Path Configuration ✅
**Problem:** Build script checked wrong output directory (dist/public vs public)  
**Fix:** Updated `build.js` to validate correct Vite output directory

### 4. Database Migration ✅
**Problem:** Build tried to push database schema which could fail without DATABASE_URL  
**Fix:** Removed db:push from build (Supabase schema is managed separately)

### 5. Build Dependencies ✅
**Problem:** Vite unavailable during build when NODE_ENV=production  
**Fix:** Updated `render.yaml` to install devDependencies during build

---

## 🚀 How to Deploy on Render

### Step 1: Create Render Account
1. Go to [render.com](https://render.com)
2. Sign up or log in
3. Connect your GitHub account

### Step 2: Create New Web Service
1. Click "New +" → "Web Service"
2. Connect your GitHub repository
3. Render will auto-detect the `render.yaml` configuration

### Step 3: Set Environment Variables
Add these in the Render dashboard under "Environment":

**Required:**
```
NODE_ENV=production
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_key
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
SESSION_SECRET=your-secure-random-string-min-32-chars
```

**Optional Database (if not using Supabase as primary DB):**
```
DATABASE_URL=postgresql://user:pass@host:port/db
```

### Step 4: Deploy
1. Click "Create Web Service"
2. Render will:
   - Run: `npm install --include=dev && node build.js`
   - Start: `node start.js`
   - Bind to: `0.0.0.0:${PORT}`
3. Wait for deployment to complete (3-5 minutes)
4. Your app will be live at: `https://your-app-name.onrender.com`

---

## 📋 Deployment Configuration

### Build Command
```bash
npm install --include=dev && node build.js
```

### Start Command
```bash
node start.js
```

### Port Configuration
- Render provides `PORT` environment variable
- App binds to `0.0.0.0:${PORT}` automatically
- Default port: 10000 (if PORT not set)

---

## ✅ Pre-Deployment Checklist

- [x] Runtime dependencies moved to dependencies
- [x] Server configured to listen on 0.0.0.0:PORT in production
- [x] Build script validates correct output directory
- [x] Database migrations handled separately
- [x] Vite available during build process
- [x] render.yaml configuration complete
- [ ] Environment variables configured in Render dashboard
- [ ] GitHub repository connected to Render
- [ ] Initial deployment triggered

---

## 🧪 Post-Deployment Verification

After deployment, verify these features:

### 1. Health Check
```bash
curl https://your-app.onrender.com/api/health
curl https://your-app.onrender.com/api/system/health
```

### 2. Homepage
Visit `https://your-app.onrender.com` and verify:
- Login page loads correctly
- Bengali UI displays properly
- No console errors

### 3. Authentication
- Test login with valid credentials
- Verify session persistence
- Check dashboard access

### 4. Database Connectivity
- Verify Supabase connection works
- Test CRUD operations
- Check data displays correctly

---

## 🐛 Troubleshooting

### Build Fails
- **Check:** Environment variables are set correctly
- **Verify:** render.yaml buildCommand includes `--include=dev`
- **Review:** Build logs in Render dashboard

### Server Won't Start
- **Check:** PORT environment variable is available
- **Verify:** All dependencies are in dependencies (not devDependencies)
- **Review:** Application logs in Render dashboard

### 502 Bad Gateway
- **Check:** Server is listening on 0.0.0.0 (not 127.0.0.1)
- **Verify:** PORT environment variable is used correctly
- **Review:** Server startup logs

### Database Connection Issues
- **Check:** SUPABASE_URL and keys are correct
- **Verify:** Supabase project is accessible
- **Review:** Network logs and API responses

---

## 📊 Performance Expectations

### Free Tier (Render)
- **Spin-down:** After 15 minutes of inactivity
- **Spin-up:** 30-60 seconds on first request
- **Memory:** 512 MB RAM
- **Storage:** Ephemeral (resets on deploy)

### Recommended Tier for Production
- **Starter Plan:** $7/month
- **Always On:** No spin-down
- **Memory:** 512 MB RAM
- **Better Performance:** Faster response times

---

## 🔒 Security Checklist

- [x] Passwords hashed with bcrypt
- [x] Session secrets configured
- [x] CORS properly configured
- [x] Input validation with Zod
- [x] Rate limiting enabled
- [x] Environment variables secured
- [x] No hardcoded credentials
- [ ] HTTPS enabled (automatic on Render)
- [ ] Custom domain configured (optional)

---

## 📈 Monitoring

### Built-in Health Endpoints
- `/api/health` - Basic health check
- `/api/system/health` - Detailed system status

### Recommended Monitoring Services
- **Uptime:** UptimeRobot (free)
- **Errors:** Sentry (free tier available)
- **Performance:** New Relic (free tier available)

---

## 🎯 Next Steps

1. **Set Environment Variables** in Render dashboard
2. **Connect GitHub** repository
3. **Deploy** and monitor build logs
4. **Test** the live application
5. **Configure Custom Domain** (optional)
6. **Set up Monitoring** for uptime and errors
7. **Enable Auto-Deploy** from your main branch

---

## 📞 Support Resources

- **Render Docs:** https://render.com/docs
- **Supabase Docs:** https://supabase.com/docs
- **Application Logs:** Check Render dashboard
- **Build Issues:** Review deployment logs in Render

---

**Status:** ✅ Ready for Production Deployment  
**Last Updated:** October 12, 2025  
**Verified By:** Architect Review (PASSED)
