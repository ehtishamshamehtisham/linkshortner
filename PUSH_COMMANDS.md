# 🚀 Git Push Commands

## Copy and paste these commands one by one in your terminal:

### Step 1: Navigate to the project folder
```bash
cd "C:\Users\Mohammad Ehtisham\OneDrive\Desktop\Demo1\premium-shortener"
```

### Step 2: Check what files changed
```bash
git status
```

### Step 3: Add all changes
```bash
git add .
```

### Step 4: Commit with a message
```bash
git commit -m "Fix: Connect frontend to backend API for production deployment"
```

### Step 5: Push to GitHub
```bash
git push origin main
```

---

## Alternative: If you get any errors

### If branch is called "master" instead of "main":
```bash
git push origin master
```

### If you need to set upstream:
```bash
git push -u origin main
```

### If you need to force push (use carefully):
```bash
git push origin main --force
```

---

## After Pushing

1. Wait 2-3 minutes for Netlify to auto-deploy
2. Check your sites:
   - Tool 1: https://linkshortner.site
   - Tool 2: https://linkshortner-tool2.netlify.app

3. Test login and creating links!

---

## Quick Copy-Paste (All at once)

**For PowerShell:**
```powershell
cd "C:\Users\Mohammad Ehtisham\OneDrive\Desktop\Demo1\premium-shortener"
git add .
git commit -m "Fix: Connect frontend to backend API for production deployment"
git push origin main
```

**For Git Bash:**
```bash
cd "C:\Users\Mohammad Ehtisham\OneDrive\Desktop\Demo1\premium-shortener"
git add .
git commit -m "Fix: Connect frontend to backend API for production deployment"
git push origin main
```

---

## What These Commands Do

1. **`cd ...`** - Changes to your project directory
2. **`git add .`** - Stages all your changes
3. **`git commit -m "..."`** - Saves changes with a message
4. **`git push origin main`** - Uploads to GitHub

---

## Files Being Pushed

✅ Modified:
- `public/auth.js` (Added API_BASE)
- `public/script.js` (Added API_BASE)

✅ New Files:
- `ARCHITECTURE.md` (System documentation)
- `DEPLOYMENT_GUIDE.md` (Deployment instructions)
- `QUICK_START.md` (Quick guide)
- `sync-to-public.bat` (Sync script)

---

**Ready to deploy!** 🎉
