# 🚨 IMMEDIATE ACTION REQUIRED

## Current Status

✅ **CORS Fixed** - No more CORS errors  
✅ **Frontend Working** - Can reach backend  
❌ **Backend Database Disconnected** - This is blocking login  

## The Problem

Backend health check shows:
```json
"db": {"status": "disconnected", "message": "Not connected to database"}
```

When you try to login, the backend tries to query the database but fails, causing a 500 error.

## The Solution (5 minutes)

### Go to Azure Portal NOW

1. **Open:** https://portal.azure.com
2. **Navigate to:** App Services → **cms-system**
3. **Click:** Configuration (left menu, under Settings)
4. **Click:** Application settings tab

### Check These Settings

Look for `MONGODB_URI` - it should match the connection string in your `backend/.env` file (starts with `mongodb://stmichael:...`)

### If MONGODB_URI is Missing or Wrong

1. Click **+ New application setting**
2. **Name:** `MONGODB_URI`
3. **Value:** Copy from your `backend/.env` file (the full connection string)
4. Click **OK**
5. Click **Save** at the top
6. Click **Continue** to confirm
7. **Wait 1 minute** for restart

### Also Check

- `NODE_ENV` should be `production` (not `development`)
- `BYPASS_AUTH` should NOT exist (delete if present)

### After Saving

Wait 1 minute, then test:
```
https://cms-system-czggf5bjhxgkacat.australiaeast-01.azurewebsites.net/api/health
```

Should show:
```json
"db": {"status": "healthy"}
```

## Then Create Admin User

Once database is connected:

1. **Go to:** Azure Portal → cms-system → **Console**
2. **Run:**
   ```bash
   cd site/wwwroot
   node create-admin-azure.js
   ```
3. **Copy the credentials** shown

## Then Test Login

1. **Go to:** https://cms.erotc.org/test-login.html
2. **Click:** "Test Login"
3. **Should succeed!** ✅

---

## Why This Happened

The `.env` file in your local repository has `BYPASS_AUTH=true` for local testing, but Azure App Settings might not have the `MONGODB_URI` configured, or it might have `BYPASS_AUTH=true` which prevents database connection in production.

## Quick Checklist

- [ ] Open Azure Portal
- [ ] Go to cms-system → Configuration
- [ ] Verify/Add `MONGODB_URI`
- [ ] Set `NODE_ENV` to `production`
- [ ] Remove `BYPASS_AUTH` if present
- [ ] Click Save
- [ ] Wait 1 minute
- [ ] Test health endpoint
- [ ] Create admin user
- [ ] Test login

**Estimated Time:** 5-10 minutes total
