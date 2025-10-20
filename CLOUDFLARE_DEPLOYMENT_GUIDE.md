# 🚀 Cloudflare Pages Deployment Guide

## School Management System - Frontend Deployment

This guide will help you deploy your React frontend to Cloudflare Pages with Supabase as the backend.

---

## 📋 Prerequisites

Before you begin, make sure you have:

1. ✅ A Cloudflare account (free tier works perfectly)
2. ✅ Your Supabase project URL and API keys
3. ✅ Git repository (GitHub, GitLab, or Bitbucket)
4. ✅ Node.js installed locally (for testing)

> **Note about Configuration Files:**  
> - `wrangler.workers.toml.legacy` - Old Workers config (NOT USED - ignore this file)
> - **No wrangler config needed** for Cloudflare Pages deployment!
> - CLI deployment uses the command: `wrangler pages deploy public --project-name=school-management-system`
> - Git deployment is configured in Cloudflare Dashboard (no local config needed)

---

## 🎯 Deployment Architecture

```
┌─────────────────────────────────────────────┐
│         Cloudflare Pages (Global CDN)       │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │   React Frontend (Static Files)     │   │
│  │   - HTML, CSS, JavaScript           │   │
│  │   - Built with Vite                 │   │
│  └─────────────────────────────────────┘   │
│                    │                        │
│                    │ API Calls              │
│                    ▼                        │
└─────────────────────────────────────────────┘
                     │
                     │ HTTPS
                     ▼
┌─────────────────────────────────────────────┐
│            Supabase Backend                 │
│  - PostgreSQL Database                      │
│  - Authentication                           │
│  - Row Level Security (RLS)                 │
│  - Real-time subscriptions                  │
└─────────────────────────────────────────────┘
```

**Key Points:**
- **Frontend**: Hosted on Cloudflare Pages (fast, global)
- **Backend**: Supabase handles all database operations
- **No Express.js needed**: Direct database access via Supabase client
- **Secure**: RLS policies protect your data

---

## 🛠️ Deployment Methods

### **Method 1: Git Integration (Recommended)**

This method automatically deploys when you push to your repository.

#### Step 1: Prepare Your Repository

```bash
# Commit all your changes
git add .
git commit -m "Prepare for Cloudflare Pages deployment"
git push origin main
```

#### Step 2: Connect to Cloudflare Pages

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Click **Pages** in the left sidebar
3. Click **Create a project**
4. Click **Connect to Git**
5. Authorize Cloudflare to access your repository
6. Select your repository: `school-management-system`

#### Step 3: Configure Build Settings

In the setup form, enter these settings:

| Setting | Value |
|---------|-------|
| **Project name** | `school-management-system` (or your choice) |
| **Production branch** | `main` |
| **Framework preset** | `Vite` |
| **Build command** | `npm run build` |
| **Build output directory** | `public` |
| **Root directory** | `/` (leave empty) |
| **Environment variables** | (See Step 4) |

#### Step 4: Set Environment Variables

Click **Add variable** and add these (get values from your Supabase dashboard):

| Variable Name | Value | Notes |
|--------------|-------|-------|
| `NODE_ENV` | `production` | Required |
| `VITE_SUPABASE_URL` | `https://xxxxx.supabase.co` | From Supabase Settings → API |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` | From Supabase Settings → API |

**Important:** Make sure to prefix with `VITE_` - this is required for Vite to expose variables to the frontend.

#### Step 5: Deploy

1. Click **Save and Deploy**
2. Cloudflare will:
   - Install dependencies (`npm install`)
   - Build your frontend (`npm run build`)
   - Deploy to global CDN
   - Give you a URL: `https://school-management-system.pages.dev`

**First deployment takes 3-5 minutes**

#### Step 6: Verify Deployment

1. Visit your Cloudflare Pages URL
2. Test login functionality
3. Check that data loads from Supabase
4. Verify all pages work correctly

---

### **Method 2: Direct Upload (CLI)**

For manual deployments or CI/CD pipelines.

#### Step 1: Install Wrangler

```bash
npm install -g wrangler
```

#### Step 2: Login to Cloudflare

```bash
wrangler login
```

This opens a browser window to authenticate.

#### Step 3: Build Your Frontend

```bash
npm run build:cloudflare
```

This creates production files in the `public/` directory.

#### Step 4: Deploy

```bash
npm run deploy:cloudflare
```

Or manually:

```bash
wrangler pages deploy public --project-name=school-management-system
```

#### Step 5: Set Environment Variables

```bash
# Set production variables
wrangler pages secret put VITE_SUPABASE_URL --project=school-management-system
# Enter your Supabase URL when prompted

wrangler pages secret put VITE_SUPABASE_ANON_KEY --project=school-management-system
# Enter your Supabase anon key when prompted
```

Or set via Dashboard:
1. Go to **Pages** → Your Project → **Settings** → **Environment Variables**
2. Add each variable for **Production** environment

---

## 🔒 Security Configuration

### Environment Variables Security

**✅ Safe to Expose (Frontend):**
- `VITE_SUPABASE_URL` - Public URL
- `VITE_SUPABASE_ANON_KEY` - Public anonymous key (protected by RLS)

**❌ NEVER Expose (Backend Only):**
- `SUPABASE_SERVICE_KEY` - Has admin access
- Database passwords
- API secrets

### Row Level Security (RLS)

Your Supabase database must have RLS policies enabled to protect data:

```sql
-- Example: Users can only see their school's data
CREATE POLICY "Users access own school data" ON students
    FOR ALL USING (school_id = get_user_school_id_from_metadata());
```

**Your app already has RLS configured** - make sure these policies are active in Supabase.

---

## 🌐 Custom Domain Setup

### Add Your Domain to Cloudflare Pages

1. Go to your Pages project
2. Click **Custom domains**
3. Click **Set up a custom domain**
4. Enter your domain: `school.yourdomain.com`
5. Follow Cloudflare's DNS instructions:
   - If domain is on Cloudflare: Auto-configured ✅
   - If external: Add CNAME record pointing to your Pages URL

**Example DNS Record:**
```
Type:  CNAME
Name:  school
Target: school-management-system.pages.dev
```

**SSL Certificate:** Automatically provisioned by Cloudflare (takes ~5 minutes)

---

## 🔄 Automatic Deployments

### Git Integration Features

Once connected to Git, Cloudflare automatically:

1. **Production Deployments**
   - Trigger: Push to `main` branch
   - URL: `https://school-management-system.pages.dev`

2. **Preview Deployments**
   - Trigger: Push to any other branch or Pull Request
   - URL: `https://abc123.school-management-system.pages.dev`
   - Perfect for testing before merging

3. **Deployment Notifications**
   - Email notifications on build success/failure
   - GitHub commit status checks
   - Deployment comments on Pull Requests

### View Build Logs

1. Go to **Pages** → Your Project → **Deployments**
2. Click any deployment
3. View build logs, errors, and deployment URL

---

## 🧪 Testing Your Deployment

### Local Testing (Before Deploying)

```bash
# Build locally
npm run build:cloudflare

# Preview locally with Cloudflare environment
npm run preview:cloudflare

# Or use standard Vite preview
npm run preview
```

Visit `http://localhost:5000` to test.

### Production Testing Checklist

After deployment, test these features:

- [ ] Login page loads
- [ ] User can login successfully
- [ ] Dashboard displays data from Supabase
- [ ] Student management works (view, add, edit)
- [ ] Teacher management works
- [ ] All navigation links work
- [ ] Mobile responsiveness
- [ ] Page reload doesn't show 404
- [ ] Bengali text displays correctly

---

## 📊 Monitoring & Analytics

### Cloudflare Web Analytics

1. Go to **Pages** → Your Project → **Analytics**
2. View:
   - Page views
   - Visitor locations
   - Performance metrics
   - Core Web Vitals

### Error Tracking

Check browser console for errors:
1. Open DevTools (F12)
2. Check **Console** tab
3. Look for network errors or Supabase connection issues

---

## 🚨 Troubleshooting

### Build Fails

**Problem:** `vite: not found`
```bash
# Solution: Install dependencies
npm install
```

**Problem:** TypeScript errors
```bash
# Solution: Check types
npm run check
```

### Environment Variables Not Working

**Problem:** Variables are `undefined` in the app

**Solutions:**
1. Make sure variables start with `VITE_`
2. Redeploy after adding variables
3. Clear browser cache and hard refresh

### 404 on Page Refresh

**Problem:** Refreshing `/dashboard` shows 404

**Solution:** This is already configured in `wrangler.jsonc`:
```json
"assets": {
  "not_found_handling": "single-page-application"
}
```

If still happening, check that you're using the correct routing configuration.

### Supabase Connection Errors

**Problem:** "Failed to fetch" or CORS errors

**Solutions:**
1. Verify `VITE_SUPABASE_URL` is correct
2. Check `VITE_SUPABASE_ANON_KEY` is valid
3. Verify Supabase project is active
4. Check RLS policies allow authenticated access

### Slow Loading

**Problem:** Pages load slowly

**Solutions:**
1. Enable Cloudflare Argo (paid) for faster routing
2. Optimize images and assets
3. Enable React Query caching
4. Use Cloudflare's image optimization

---

## 💰 Pricing

### Cloudflare Pages (Free Tier)

- ✅ **Unlimited bandwidth**
- ✅ **Unlimited requests**
- ✅ **500 builds per month**
- ✅ **1 build at a time**
- ✅ **Global CDN**
- ✅ **Free SSL certificate**
- ✅ **Preview deployments**

**Paid Plan ($20/month):**
- ⚡ Concurrent builds
- ⚡ Advanced analytics
- ⚡ Faster build times
- ⚡ Longer build duration

### Supabase (Free Tier)

- ✅ **500MB database**
- ✅ **1GB file storage**
- ✅ **50,000 monthly active users**
- ✅ **500MB egress**
- ✅ **2 million edge function invocations**

**For most schools, free tier is sufficient!**

---

## 📚 Useful Commands

```bash
# Development
npm run dev                    # Start local dev server
npm run preview                # Preview production build locally
npm run check                  # Type-check TypeScript

# Building
npm run build                  # Build for production
npm run build:cloudflare       # Build for Cloudflare (same as above)

# Cloudflare Deployment
npm run deploy:cloudflare      # Build and deploy to Cloudflare
wrangler pages deploy public   # Direct deployment
wrangler pages dev public      # Local Cloudflare environment

# Wrangler CLI
wrangler login                 # Login to Cloudflare
wrangler pages project list    # List your projects
wrangler pages deployment list # List deployments
wrangler tail                  # Stream real-time logs
```

---

## 🔗 Useful Links

- **Cloudflare Dashboard:** https://dash.cloudflare.com/
- **Cloudflare Pages Docs:** https://developers.cloudflare.com/pages/
- **Supabase Dashboard:** https://app.supabase.com/
- **Wrangler Docs:** https://developers.cloudflare.com/workers/wrangler/

---

## 📝 Next Steps After Deployment

### 1. Configure Custom Domain
- Add your school's domain
- Enable SSL (automatic)
- Update school branding

### 2. Set Up Backup Strategy
- Supabase has automatic backups (7 days retention on free tier)
- Export important data regularly
- Consider upgrading Supabase for point-in-time recovery

### 3. Monitor Performance
- Check Cloudflare Analytics weekly
- Monitor Supabase usage
- Optimize queries if needed

### 4. Complete Express-to-Supabase Migration
- Review `.local/state/replit/agent/progress_tracker.md`
- Migrate remaining Express endpoints to Supabase
- Remove Express backend once fully migrated

### 5. Add Features
- Enable real-time notifications
- Add file upload to Supabase Storage
- Implement advanced analytics
- Add parent/student portals

---

## 🎉 Success!

Your school management system is now:

- ✅ **Fast:** Served from global CDN
- ✅ **Secure:** Protected by RLS policies
- ✅ **Scalable:** Handles thousands of users
- ✅ **Cost-effective:** Free hosting and database
- ✅ **Modern:** React + Supabase serverless architecture

**Need Help?**
- Check Cloudflare Pages documentation
- Review Supabase documentation
- Consult progress tracker for migration status

---

**Last Updated:** October 20, 2025  
**Version:** 1.0  
**Deployment Type:** Frontend-Only (Serverless)
