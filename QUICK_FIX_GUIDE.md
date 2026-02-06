# 🚨 Quick Fix Guide - CORS Issue

## What Happened
The frontend at `https://zealous-desert-0db98b100.6.azurestaticapps.net` was blocked by CORS when trying to access the backend API.

## What I Fixed
✅ Updated `backend/server.js` with:
1. Better CORS logging to see what's happening
2. Wildcard support for all `*.azurestaticapps.net` domains
3. Added localhost ports for local testing
4. Increased CORS cache time (maxAge: 24 hours)

## What You Need to Do Now

### Step 1: Wait for Deployment (3-5 minutes)
The fix has been pushed to GitHub. Wait for the deployment to complete:
- Check: https://github.com/stmichealerotc-oss/erotcorg/actions
- Look for the "Build and deploy Node.js app" workflow
- Wait until it shows a green checkmark ✅

### Step 2: Create Admin User in Azure
Once deployment is complete:

1. Go to: https://portal.azure.com
2. Find your Web App: **cms-system**
3. Click **Console** (left menu → Development Tools)
4. Run these commands:
   ```bash
   cd site/wwwroot
   node create-admin-azure.js
   ```
5. You should see:
   ```
   ✅ Admin user created successfully!
   
   ═══════════════════════════════════════
   📋 LOGIN CREDENTIALS:
   ═══════════════════════════════════════
   👤 Username: admin
   🔑 Password: admin123
   📧 Email: stmichealerotc@gmail.com
   🎭 Role: super-admin
   ═══════════════════════════════════════
   ```

### Step 3: Test Login Again
After creating the admin user:

**Option A: Test Page (Recommended)**
- URL: https://cms.erotc.org/test-login.html
- Click "Test Login"
- Watch the detailed logs

**Option B: Main Login**
- URL: https://cms.erotc.org/login.html
- Username: `admin`
- Password: `admin123`

### Step 4: Check Backend Logs (If Still Having Issues)
If CORS errors persist after deployment:

1. Go to Azure Portal → **cms-system**
2. Click **Log stream** (under Monitoring)
3. Look for CORS log messages like:
   ```
   🔍 CORS request from origin: https://zealous-desert-0db98b100.6.azurestaticapps.net
   ✅ CORS: Allowing Azure Static Web Apps domain
   ```

## What Changed in the Code

### Before (Strict List):
```javascript
if (allowedOrigins.includes(origin)) {
    return callback(null, true);
}
```

### After (Wildcard Support):
```javascript
// Check if origin is in allowed list
if (allowedOrigins.includes(origin)) {
    return callback(null, true);
}

// Also allow any azurestaticapps.net domain
if (origin.includes('azurestaticapps.net')) {
    return callback(null, true);
}
```

This means ANY Azure Static Web Apps domain will now work, including:
- `zealous-desert-0db98b100.6.azurestaticapps.net` ✅
- Any staging environments Azure creates ✅
- `cms.erotc.org` ✅ (already in the list)

## Troubleshooting

### If you still see CORS errors after deployment:
1. **Hard refresh** the frontend page (Ctrl+Shift+R or Cmd+Shift+R)
2. **Clear browser cache** for the site
3. **Check Azure logs** to see if the new code is deployed
4. **Verify deployment** completed successfully in GitHub Actions

### If admin creation fails:
- Check that you're in the correct directory: `/home/site/wwwroot`
- Verify the file exists: `ls -la create-admin-azure.js`
- Check MongoDB connection in Azure App Settings

### If login still fails after admin creation:
- Use the test page to see detailed error messages
- Check browser console for any JavaScript errors
- Verify the API URL in config.js is correct

## Timeline
- **Now:** Code pushed to GitHub
- **+3 minutes:** GitHub Actions builds and deploys
- **+5 minutes:** Azure restarts with new code
- **+6 minutes:** Ready to create admin user
- **+7 minutes:** Ready to login!

---

**Current Status:** Waiting for Azure deployment to complete
**Next Action:** Create admin user in Azure Console
**Expected Result:** Login should work without CORS errors
