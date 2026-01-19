# Quick Start - Fix Articles Now

## 🚀 3 Simple Steps

### 1️⃣ Deploy the Backend Changes

Push these changes to Railway:
```bash
cd farestockbroker-backend
git add .
git commit -m "Add migration endpoint and fix article creation"
git push
```

Wait for Railway to deploy (usually 1-2 minutes).

### 2️⃣ Get Your Admin Token

1. Open your admin panel: `https://your-frontend.com/admin/login`
2. Log in
3. Press F12 (open DevTools)
4. Go to Console tab
5. Type: `localStorage.adminToken`
6. Copy the token (the long string)

### 3️⃣ Run the Migration

1. Open `run-migration.html` in your browser (double-click the file)
2. Enter your Railway backend URL (e.g., `https://farestockbroker-backend.railway.app`)
3. Paste your admin token
4. Click "Run Migration"
5. Done! ✅

## What Happens Next?

- All existing articles will be visible immediately
- New articles will work correctly from now on
- If any articles need questions, the tool will tell you which ones

## Need Help?

If the migration tool shows articles without questions:
1. Go to admin panel
2. Click on each article
3. Add a question (e.g., "How do I open an account?")
4. Save

That's it! Your education center is now fully functional.
