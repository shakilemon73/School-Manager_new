# Vercel Deployment Guide for School Management System

## Overview
This guide provides step-by-step instructions for deploying the School Management System to Vercel. The application is a Single Page Application (SPA) built with Vite, React, and Supabase.

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **Supabase Project**: You need a Supabase project with the following:
   - Project URL (e.g., `https://your-project.supabase.co`)
   - Anon/Public Key
3. **Git Repository**: Code should be in a Git repository (GitHub, GitLab, or Bitbucket)

## Required Environment Variables

The following environment variables MUST be set in Vercel:

### Critical Variables (Required)
```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key-here
```

### Optional Variables (for additional features)
```bash
# Payment Integration (if using Stripe)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your-stripe-key

# Feature Flags (set to "true" to enable)
VITE_FEATURE_SUPABASE_DASHBOARD=true
VITE_FEATURE_SUPABASE_NOTIFICATIONS=true
VITE_FEATURE_SUPABASE_CALENDAR=true
VITE_FEATURE_SUPABASE_STUDENTS=true
VITE_FEATURE_SUPABASE_TEACHERS=true
VITE_FEATURE_SUPABASE_LIBRARY=true
VITE_FEATURE_SUPABASE_INVENTORY=true
VITE_FEATURE_SUPABASE_TRANSPORT=true
```

## Deployment Steps

### Option 1: Deploy via Vercel Dashboard (Recommended)

1. **Import Project**
   - Go to [vercel.com/new](https://vercel.com/new)
   - Click "Import Project"
   - Select your Git provider and repository

2. **Configure Project**
   - Framework Preset: **Vite**
   - Root Directory: `.` (leave as default)
   - Build Command: `npm run build`
   - Output Directory: `public`
   - Install Command: `npm install`

3. **Set Environment Variables**
   - Go to "Environment Variables" section
   - Add all required variables from above
   - Make sure to add them for **Production**, **Preview**, and **Development** environments

4. **Deploy**
   - Click "Deploy"
   - Wait for the build to complete (usually 2-5 minutes)

### Option 2: Deploy via Vercel CLI

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Deploy**
   ```bash
   # First deployment (interactive)
   vercel
   
   # Subsequent deployments to production
   vercel --prod
   ```

4. **Set Environment Variables**
   ```bash
   # Set individual variables
   vercel env add VITE_SUPABASE_URL production
   vercel env add VITE_SUPABASE_ANON_KEY production
   
   # Or use the Vercel dashboard to add them
   ```

## Configuration Files

### vercel.json
The `vercel.json` file is already configured for SPA deployment:
- Static build configuration
- Client-side routing support (all routes redirect to index.html)
- Security headers
- Asset caching

### .vercelignore
Excludes unnecessary files from deployment to reduce build size and time.

## Post-Deployment Checklist

After deployment, verify the following:

### 1. Environment Variables
- [ ] Open Vercel dashboard → Your Project → Settings → Environment Variables
- [ ] Confirm `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set correctly
- [ ] Check browser console for any "Supabase not configured" errors

### 2. Routing
- [ ] Navigate to different pages directly via URL (e.g., `/dashboard`, `/students`)
- [ ] Refresh the browser on each page - should not show 404
- [ ] Check that back/forward browser buttons work correctly

### 3. Supabase Connection
- [ ] Try logging in with valid credentials
- [ ] Check that dashboard data loads correctly
- [ ] Verify school isolation is working (users only see their school's data)

### 4. Performance
- [ ] Check Lighthouse score (aim for 90+ on Performance)
- [ ] Verify assets are cached properly (check Network tab in DevTools)
- [ ] Test on mobile devices

## Troubleshooting

### Issue: "Supabase not configured" error in console

**Solution**: 
1. Check environment variables in Vercel dashboard
2. Make sure variables are prefixed with `VITE_` (required for Vite)
3. Redeploy after adding variables

### Issue: 404 errors on page refresh

**Solution**: 
This should be fixed by the `vercel.json` configuration. If it persists:
1. Verify `vercel.json` contains the routes configuration
2. Make sure `outputDirectory` is set to `public`
3. Redeploy the application

### Issue: Slow initial load

**Solution**:
1. Enable asset caching (already configured in vercel.json)
2. Consider lazy loading large components
3. Check Vercel Analytics for bottlenecks

### Issue: Build fails

**Common Causes**:
1. Missing environment variables → Add them before build
2. TypeScript errors → Run `npm run check` locally to identify
3. Dependencies issue → Clear Vercel build cache and redeploy

### Issue: Data not loading after login

**Solution**:
1. Check browser console for errors
2. Verify Supabase URL and key are correct
3. Check Supabase Row Level Security (RLS) policies are configured
4. Ensure user has proper `school_id` in their metadata

## Custom Domain Setup

1. Go to Project Settings → Domains
2. Add your custom domain (e.g., `school.yourschool.com`)
3. Update DNS records as instructed by Vercel
4. Wait for SSL certificate to be issued (automatic, takes 1-5 minutes)

## Updating the Deployment

### Automatic Deployments
- Every push to your main/master branch triggers a production deployment
- Pull requests create preview deployments

### Manual Deployments
```bash
# Deploy to production
vercel --prod

# Deploy to preview
vercel
```

## Performance Optimization

### Recommended Settings
1. Enable Edge Caching in Vercel dashboard
2. Use Vercel Analytics to monitor performance
3. Enable Image Optimization if using Vercel Image component
4. Consider using Vercel's Edge Functions for API routes (if needed)

## Security Considerations

1. **Never commit** `.env` files to Git
2. **Rotate** Supabase keys periodically
3. **Enable** Vercel's security headers (already configured)
4. **Review** RLS policies in Supabase regularly
5. **Monitor** deployment logs for suspicious activity

## Cost Optimization

### Vercel Free Tier Limits
- 100 GB bandwidth per month
- Unlimited deployments
- Automatic HTTPS
- Preview deployments for all branches

### When to Upgrade
- If you exceed bandwidth limits
- Need more team members
- Require advanced security features
- Need priority support

## Support Resources

- **Vercel Documentation**: [vercel.com/docs](https://vercel.com/docs)
- **Supabase Documentation**: [supabase.com/docs](https://supabase.com/docs)
- **Vite Documentation**: [vitejs.dev](https://vitejs.dev)

## Monitoring

### Vercel Analytics
Enable Vercel Analytics to monitor:
- Page load times
- User experience metrics
- Traffic patterns
- Error rates

### Supabase Dashboard
Monitor in Supabase:
- Database performance
- API usage
- Storage usage
- Authentication logs

---

## Quick Reference Commands

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy to preview
vercel

# Deploy to production
vercel --prod

# View deployment logs
vercel logs

# List deployments
vercel ls

# Remove deployment
vercel remove [deployment-url]
```

---

**Last Updated**: October 19, 2025

For issues or questions about deployment, consult the Vercel documentation or contact your development team.
