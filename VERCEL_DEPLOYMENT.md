# Vercel Deployment Guide for School Management System

## Overview
This application is configured for deployment on Vercel with:
- **Frontend**: React + Vite (Static Build)
- **Backend**: Express.js API (Serverless Functions)
- **Database**: Supabase PostgreSQL

## Architecture

### Serverless API Setup
```
/api/index.ts → Vercel Serverless Function → server/index.ts (Express App)
```

The application uses `serverless-http` to wrap the Express app for Vercel's serverless environment.

## Configuration Files

### 1. vercel.json
Main configuration file with:
- **builds**: Defines how to build the API and frontend
- **routes**: Routes `/api/*` to serverless function, others to static files
- **env**: Environment variables (use Vercel dashboard to set values)
- **functions**: Runtime configuration (Node 20, 1GB memory, 30s timeout)
- **headers**: CORS and security headers

### 2. api/index.ts
Vercel serverless entry point that:
- Imports the Express app from `server/index.ts`
- Extracts the serverless `handler` function
- Handles all `/api/*` requests

### 3. server/index.ts
Express application that:
- Detects serverless environment via `process.env.VERCEL`
- Creates handler with `serverless-http`
- Skips `listen()` in serverless mode
- Returns `{ app, handler }` for the API wrapper

## Deployment Steps

### Step 1: Install Vercel CLI (Optional)
```bash
npm install -g vercel
```

### Step 2: Set Environment Variables
In Vercel Dashboard → Project Settings → Environment Variables, add:

**Required Variables:**
- `DATABASE_URL` - Neon PostgreSQL connection string
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_KEY` - Supabase service role key
- `VITE_SUPABASE_URL` - Same as SUPABASE_URL (for frontend)
- `VITE_SUPABASE_ANON_KEY` - Same as SUPABASE_ANON_KEY (for frontend)
- `SESSION_SECRET` - Random string for session encryption
- `NODE_ENV` - Set to `production`

### Step 3: Deploy

**Option A: Git Integration (Recommended)**
1. Push code to GitHub/GitLab/Bitbucket
2. Connect repository in Vercel dashboard
3. Vercel auto-deploys on every push

**Option B: CLI Deployment**
```bash
vercel          # Deploy to preview
vercel --prod   # Deploy to production
```

## Build Process

### Frontend Build
```bash
npm run build  # Runs: vite build
```
- Outputs to `dist/public`
- Static files served from root

### API Build
- Vercel automatically compiles TypeScript
- `api/index.ts` is bundled with dependencies
- `server/**` files included via `includeFiles` config

## Key Features

### 1. Automatic TypeScript Compilation
Vercel handles TypeScript compilation automatically - no need for separate build step.

### 2. Hot Reloading (Development)
```bash
npm run dev  # Runs Vite dev server on port 5000
```

### 3. Serverless Cold Start Optimization
The `api/index.ts` caches the app module:
```typescript
let appPromise: Promise<any> | null = null;
```
This ensures the Express app initializes only once per function instance.

### 4. CORS Configuration
API routes have CORS enabled in `vercel.json`:
```json
{
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
  "Access-Control-Allow-Credentials": "true"
}
```

### 5. Security Headers
All responses include:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`

## Troubleshooting

### Issue: 404 Not Found on API Routes
**Solution**: Ensure `vercel.json` routes are correct:
```json
{
  "src": "/api/(.*)",
  "dest": "/api/index.ts"
}
```

### Issue: Module Not Found Errors
**Solution**: Check `includeFiles` in `vercel.json` includes all necessary server files:
```json
"includeFiles": ["server/**", "db/**", "shared/**"]
```

### Issue: Environment Variables Not Working
**Solution**: 
1. Verify variables are set in Vercel dashboard
2. For frontend variables, use `VITE_` prefix
3. Redeploy after adding new variables

### Issue: Function Timeout (30s limit)
**Solution**: 
1. Optimize database queries
2. Use connection pooling (Supabase handles this)
3. Consider upgrading Vercel plan for longer timeouts

### Issue: Cold Start Delays
**Solution**:
1. Reduce bundle size by removing unused dependencies
2. Use lazy loading for heavy modules
3. Consider Vercel's Edge Functions for faster cold starts

## Performance Optimization

### 1. Static Asset Caching
Assets are cached for 1 year:
```json
"Cache-Control": "public, max-age=31536000, immutable"
```

### 2. Function Memory
Configured to 1GB for optimal performance:
```json
"memory": 1024
```

### 3. Maximum Lambda Size
Set to 50MB to accommodate all dependencies:
```json
"maxLambdaSize": "50mb"
```

## Testing Deployment

### Test API Endpoint
```bash
curl https://your-app.vercel.app/api/test-library
```

Expected response:
```json
{
  "message": "Test endpoint working",
  "timestamp": "2025-10-19T..."
}
```

### Test Frontend
```bash
curl https://your-app.vercel.app/
```

Should return the React app's `index.html`.

## Monitoring

### Vercel Dashboard
- View logs: Deployments → Function Logs
- Monitor performance: Analytics
- Check errors: Real-time Function Logs

### Supabase Dashboard
- Monitor database queries
- Check Row Level Security policies
- View authentication logs

## Differences from Replit Environment

| Feature | Replit | Vercel |
|---------|--------|--------|
| Server Type | Always-on | Serverless (on-demand) |
| Port | 5000 (fixed) | Automatic |
| State | Persistent in-memory | Stateless (between requests) |
| Database | Neon PostgreSQL | Supabase PostgreSQL |
| File Uploads | Local filesystem | Use Supabase Storage |
| WebSockets | Supported | Not supported (use Supabase Realtime) |

## Best Practices

1. **Use Supabase for Everything**:
   - Authentication
   - Database queries
   - File storage
   - Real-time features

2. **Avoid In-Memory State**:
   - Don't rely on variables between requests
   - Use database or external cache (Redis)

3. **Optimize Cold Starts**:
   - Keep `api/index.ts` minimal
   - Lazy load heavy modules
   - Use module caching

4. **Security**:
   - Never expose service keys to frontend
   - Use Row Level Security (RLS) in Supabase
   - Validate all inputs
   - Use environment variables for secrets

5. **Error Handling**:
   - Log errors properly
   - Return user-friendly error messages
   - Use Vercel's error monitoring

## Support Resources

- **Vercel Docs**: https://vercel.com/docs
- **Serverless Functions**: https://vercel.com/docs/functions
- **Troubleshooting**: https://vercel.com/docs/functions/troubleshooting
- **Supabase Docs**: https://supabase.com/docs

## Deployment Checklist

- [ ] All environment variables set in Vercel dashboard
- [ ] `vercel.json` configured correctly
- [ ] Database migrations run on Supabase
- [ ] RLS policies enabled and tested
- [ ] Frontend builds successfully (`npm run build`)
- [ ] API routes tested locally
- [ ] CORS headers configured
- [ ] Error handling implemented
- [ ] Monitoring set up
- [ ] Custom domain configured (optional)

---

**Last Updated**: October 19, 2025
**Node Version**: 20.x
**Framework**: Express.js + React (Vite)
**Platform**: Vercel Serverless
