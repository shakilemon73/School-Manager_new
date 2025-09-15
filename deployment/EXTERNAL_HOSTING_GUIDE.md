# External Hosting Setup Guide

## Platform-Specific Instructions

### 1. Vercel
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Add environment variables in Vercel dashboard:
# Project Settings → Environment Variables
```

### 2. Railway
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway link
railway up

# Add environment variables:
railway variables
```

### 3. Render
1. Connect your GitHub repository
2. Add environment variables in the Render dashboard
3. Deploy automatically on git push

### 4. Netlify
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Deploy
netlify deploy --prod

# Add environment variables in Netlify dashboard
```

## Required Environment Variables

For any external platform, you MUST set these environment variables:

```
DATABASE_URL=your_supabase_transaction_pooling_url
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_role_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
SESSION_SECRET=random_string_for_sessions
NODE_ENV=production
```

## Security Best Practices

1. **Never commit secrets** to git repositories
2. **Use different credentials** for production vs development
3. **Rotate API keys** regularly
4. **Use environment-specific URLs** when possible
5. **Monitor access logs** in your Supabase dashboard

## Getting Your Credentials

### Supabase Credentials:
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Settings** → **API**
4. Copy the URL and keys
5. For DATABASE_URL: Go to **Settings** → **Database** → **Connection pooling** → Copy the **Transaction** URL

### Custom Domain (Optional):
Most platforms allow you to add a custom domain:
- Vercel: Project Settings → Domains
- Railway: Custom domains in project settings  
- Render: Custom domains in service settings
- Netlify: Domain management in site settings

## Build Commands

Make sure your hosting platform uses these build commands:

```json
{
  "scripts": {
    "build": "vite build",
    "start": "tsx server/index.ts",
    "dev": "tsx server/index.ts"
  }
}
```