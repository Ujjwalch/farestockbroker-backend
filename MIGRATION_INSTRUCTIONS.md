# Fix Existing Articles Migration

## What This Does

This migration fixes existing articles that may be missing:
1. The `isPublished` flag (sets it to `true` by default)
2. Identifies articles missing the `question` field

## How to Run (Railway Deployment)

Since your backend is deployed on Railway, use the web-based migration tool:

### Step 1: Get Your Admin Token

1. Open your admin panel in the browser
2. Log in as admin
3. Open browser DevTools (F12)
4. Go to Console tab
5. Type: `localStorage.adminToken`
6. Copy the token value (without quotes)

### Step 2: Run the Migration

1. **Open the migration tool:**
   - Open `farestockbroker-backend/run-migration.html` in your browser
   - Or double-click the file to open it

2. **Fill in the form:**
   - Backend API URL: Your Railway backend URL (e.g., `https://your-app.railway.app`)
   - Admin Token: Paste the token from Step 1

3. **Click "Run Migration"**

4. **Review the results:**
   - It will show how many articles were fixed
   - It will list articles that need questions added

### Step 3: Add Questions to Articles

If any articles are missing questions:
1. Go to your admin panel
2. Find and edit each article listed
3. Add a proper question (e.g., "How do I open a trading account?")
4. Save the article

## Alternative: Using API Directly

You can also call the migration endpoint directly:

```bash
curl -X POST https://your-backend.railway.app/api/education/admin/fix-existing-articles \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json"
```

## What Gets Fixed Automatically

- ✓ Sets `isPublished = true` for all articles missing this flag
- ✓ Saves the changes to the database

## What Needs Manual Attention

- ⚠ Articles without a `question` field need to be edited manually
- The `question` is what appears in article lists (e.g., "How do I open an account?")
- The `title` is just an internal reference

## After Running

1. Check the admin panel to verify articles are visible
2. Edit any articles that need questions added
3. Test creating new articles to ensure they work correctly
4. All new articles will automatically have the correct fields

## Safety

- Safe to run multiple times
- Only adds missing fields, doesn't delete anything
- No data loss risk
