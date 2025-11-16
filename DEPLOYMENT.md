# Deployment Guide - Host Your App on the Web

This guide covers deploying your VoiceBill Pro application to various hosting platforms.

## 🚀 Quick Deploy Options

### Option 1: Vercel (Recommended - Easiest)

**Steps:**

1. **Go to Vercel:**
   - Visit https://vercel.com
   - Sign up/Login with GitHub

2. **Import Repository:**
   - Click "Add New Project"
   - Import `chinmaysh075-gif/voicebill-PRO`
   - Vercel will auto-detect Vite settings

3. **Configure Environment Variables:**
   - Go to Project Settings → Environment Variables
   - Add these variables:
     ```
     VITE_SUPABASE_URL=your_supabase_url
     VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
     VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
     ```

4. **Deploy:**
   - Click "Deploy"
   - Wait for build to complete
   - Your app will be live at: `https://your-project.vercel.app`

**✅ Configuration File:** `vercel.json` is already created for SPA routing

---

### Option 2: Netlify

**Steps:**

1. **Go to Netlify:**
   - Visit https://netlify.com
   - Sign up/Login with GitHub

2. **Import Repository:**
   - Click "Add new site" → "Import an existing project"
   - Connect to GitHub
   - Select `voicebill-PRO` repository

3. **Build Settings:**
   - Build command: `npm run build`
   - Publish directory: `dist`
   - (These are auto-detected from `netlify.toml`)

4. **Environment Variables:**
   - Go to Site settings → Environment variables
   - Add:
     ```
     VITE_SUPABASE_URL=your_supabase_url
     VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
     VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
     ```

5. **Deploy:**
   - Click "Deploy site"
   - Your app will be live at: `https://your-project.netlify.app`

**✅ Configuration Files:** `netlify.toml` and `public/_redirects` are already created

---

### Option 3: GitHub Pages

**Steps:**

1. **Install gh-pages:**
   ```bash
   npm install --save-dev gh-pages
   ```

2. **Update package.json:**
   Add to scripts:
   ```json
   "predeploy": "npm run build",
   "deploy": "gh-pages -d dist"
   ```

3. **Update vite.config.ts:**
   Add base path:
   ```typescript
   base: '/voicebill-PRO/',
   ```

4. **Deploy:**
   ```bash
   npm run deploy
   ```

5. **Enable GitHub Pages:**
   - Go to repository Settings → Pages
   - Source: `gh-pages` branch
   - Your app: `https://chinmaysh075-gif.github.io/voicebill-PRO`

---

### Option 4: Cloudflare Pages

**Steps:**

1. **Go to Cloudflare:**
   - Visit https://dash.cloudflare.com
   - Go to Pages → Create a project

2. **Connect GitHub:**
   - Select `voicebill-PRO` repository

3. **Build Settings:**
   - Framework preset: Vite
   - Build command: `npm run build`
   - Build output directory: `dist`

4. **Environment Variables:**
   - Add in Settings → Environment variables

5. **Deploy:**
   - Click "Save and Deploy"

---

## 🔧 Fixing 404 Errors

If you see 404 errors for routes or `main.tsx`, ensure:

1. **SPA Routing is configured:**
   - ✅ `vercel.json` exists (for Vercel)
   - ✅ `netlify.toml` exists (for Netlify)
   - ✅ `public/_redirects` exists (for Netlify)

2. **Build output is correct:**
   ```bash
   npm run build
   ```
   Check that `dist/index.html` exists

3. **Base path is correct:**
   - For root domain: no base path needed
   - For subdirectory: set `base: '/your-path/'` in vite.config.ts

---

## 📋 Pre-Deployment Checklist

- [ ] Environment variables set in hosting platform
- [ ] Supabase database is set up and accessible
- [ ] Build runs successfully locally (`npm run build`)
- [ ] Test the built app locally (`npm run preview`)
- [ ] All routes work correctly
- [ ] API calls work (check browser console)

---

## 🌐 Custom Domain Setup

### Vercel:
1. Go to Project Settings → Domains
2. Add your domain
3. Follow DNS configuration instructions

### Netlify:
1. Go to Site settings → Domain management
2. Add custom domain
3. Configure DNS records

---

## 🔍 Troubleshooting

### Issue: 404 on routes
**Solution:** Ensure redirect configuration files exist (`vercel.json`, `netlify.toml`, or `_redirects`)

### Issue: Environment variables not working
**Solution:** 
- Variables must start with `VITE_` to be accessible in Vite
- Rebuild after adding variables
- Check browser console for errors

### Issue: Build fails
**Solution:**
- Check Node.js version (should be 18+)
- Run `npm install` to ensure dependencies are installed
- Check build logs for specific errors

### Issue: Supabase connection fails
**Solution:**
- Verify environment variables are set correctly
- Check Supabase project is active
- Verify RLS policies allow public access if needed

---

## 📚 Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Netlify Documentation](https://docs.netlify.com)
- [Vite Deployment Guide](https://vitejs.dev/guide/static-deploy.html)

---

## 🎯 Recommended: Vercel

**Why Vercel?**
- ✅ Automatic deployments from GitHub
- ✅ Free SSL certificates
- ✅ Global CDN
- ✅ Easy environment variable management
- ✅ Preview deployments for PRs
- ✅ Zero configuration needed

**Quick Start:**
1. Push code to GitHub
2. Import to Vercel
3. Add environment variables
4. Deploy!

Your app will be live in under 2 minutes! 🚀

