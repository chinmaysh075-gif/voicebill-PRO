# Setup Guide for GitHub

## Step 1: Create Environment File

Create a `.env.local` file in the root directory with your Supabase credentials:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
```

**Important**: This file is already in `.gitignore` and will NOT be committed to GitHub.

## Step 2: Initialize Git (Already Done)

Git has been initialized. Now you need to:

1. **Stage all files**:
   ```bash
   git add .
   ```

2. **Create initial commit**:
   ```bash
   git commit -m "Initial commit: Multilingual voice-activated billing system"
   ```

3. **Rename branch to main** (optional but recommended):
   ```bash
   git branch -M main
   ```

## Step 3: Create GitHub Repository

1. Go to [GitHub](https://github.com) and sign in
2. Click the "+" icon in the top right
3. Select "New repository"
4. Name it `speak-n-bill` (or your preferred name)
5. **DO NOT** initialize with README, .gitignore, or license (we already have these)
6. Click "Create repository"

## Step 4: Connect and Push to GitHub

After creating the repository, GitHub will show you commands. Use these:

```bash
# Add your GitHub repository as remote
git remote add origin https://github.com/YOUR_USERNAME/speak-n-bill.git

# Push to GitHub
git push -u origin main
```

Replace `YOUR_USERNAME` with your actual GitHub username.

## Step 5: Verify

1. Go to your GitHub repository page
2. Verify all files are uploaded
3. Check that `.env.local` is NOT in the repository (it should be ignored)

## Security Checklist

Before pushing, ensure:
- ✅ `.env.local` is in `.gitignore`
- ✅ No API keys or secrets in code files
- ✅ `node_modules/` is ignored
- ✅ `venv/` (Python virtual environment) is ignored
- ✅ Build artifacts (`dist/`, `build/`) are ignored

## Next Steps

After pushing to GitHub:

1. **Add repository description** on GitHub
2. **Add topics/tags** like: `react`, `typescript`, `supabase`, `voice-recognition`, `pos-system`
3. **Set up GitHub Actions** (optional) for CI/CD
4. **Deploy to Vercel/Netlify** using the GitHub repository

## Deployment

### Vercel
1. Import your GitHub repository
2. Add environment variables in Vercel dashboard
3. Deploy

### Netlify
1. Connect GitHub repository
2. Set build command: `npm run build`
3. Set publish directory: `dist`
4. Add environment variables
5. Deploy

