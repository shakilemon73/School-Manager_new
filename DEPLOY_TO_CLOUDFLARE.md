# 🚀 Deploy to Cloudflare Pages - Quick Start

## ✅ Problem Fixed

The deployment errors have been resolved:
- ❌ Old issue: Wrangler config conflicts
- ✅ Now: No config files needed for Pages deployment!

---

## 🎯 Deploy Now (3 Steps)

### Step 1: Build Your Frontend
```bash
npm run build:cloudflare
```
This creates production files in the `public/` folder.

### Step 2: Deploy to Cloudflare
```bash
wrangler pages deploy public --project-name=school-management-system
```

Or use the npm script:
```bash
npm run deploy:cloudflare
```

### Step 3: Set Environment Variables

After deployment, go to Cloudflare Dashboard:
1. **Pages** → **school-management-system** → **Settings** → **Environment variables**
2. Add these variables:

| Variable | Value | Where to Get It |
|----------|-------|-----------------|
| `VITE_SUPABASE_URL` | `https://xxxxx.supabase.co` | Supabase Dashboard → Settings → API |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGci...` | Supabase Dashboard → Settings → API |
| `NODE_ENV` | `production` | Just type "production" |

3. Click **Save**
4. **Redeploy** to apply the variables

---

## 🌐 Your Live URL

After deployment, your app will be live at:
```
https://school-management-system.pages.dev
```

You can add a custom domain in Cloudflare Dashboard!

---

## 🔄 Alternative: Auto-Deploy with Git

Prefer automatic deployments? Connect your Git repository:

1. **Cloudflare Dashboard** → **Pages** → **Create a project** → **Connect to Git**
2. Select your repository
3. Configure:
   - **Build command**: `npm run build`
   - **Output directory**: `public`
   - **Framework**: Vite
4. Add environment variables (same as above)
5. **Save and Deploy**

Every push to your main branch = automatic deployment! 🎉

---

## 📚 Full Documentation

For complete instructions, troubleshooting, and advanced configuration:
- Read: `CLOUDFLARE_DEPLOYMENT_GUIDE.md`

---

## 🆘 Troubleshooting

### "Project not found"
First time deploying? Wrangler will create the project automatically. Just follow the prompts.

### "Environment variables not working"
1. Make sure variables start with `VITE_`
2. Set them in **both** Production and Preview environments
3. Redeploy after adding variables

### "Page shows 404 on refresh"
This is already configured correctly - if it happens:
1. Check build output directory is `public`
2. Verify Vite config has correct build settings

---

## 🎊 You're Ready!

Your school management system is configured for production deployment. Run the deploy command and go live in minutes!

**Last Updated**: October 20, 2025
