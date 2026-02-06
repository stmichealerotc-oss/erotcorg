# 🔧 Azure Backend Database Connection Issue

## Problem Identified

The Azure backend health check shows:
```json
{
  "status": "ok",
  "db": {
    "status": "disconnected",
    "message": "Not connected to database"
  }
}
```

This means the backend is running but **NOT connected to Cosmos DB**.

## Root Cause

The backend on Azure is likely:
1. Missing the `MONGODB_URI` environment variable, OR
2. Has `BYPASS_AUTH=true` set (which should only be for local dev), OR
3. The MongoDB connection string is incorrect

## Solution: Check Azure App Settings

### Step 1: Go to Azure Portal
1. Navigate to: https://portal.azure.com
2. Find your Web App: **cms-system**
3. Click **Configuration** (under Settings in left menu)
4. Click **Application settings** tab

### Step 2: Verify These Settings

**Required Settings:**
```
MONGODB_URI = mongodb://stmichael:[YOUR_PASSWORD]@stmichael.mongo.cosmos.azure.com:10255/church_db?ssl=true&replicaSet=globaldb&retrywrites=false&maxIdleTimeMS=120000&appName=@stmichael@

NODE_ENV = production

JWT_SECRET = [YOUR_JWT_SECRET]

PORT = 8080
```

**Settings to REMOVE (if present):**
```
BYPASS_AUTH = (should NOT exist in production)
```

### Step 3: Add Missing Settings

If `MONGODB_URI` is missing:

1. Click **+ New application setting**
2. Name: `MONGODB_URI`
3. Value: Use the connection string from your backend/.env file (starts with `mongodb://stmichael:...`)
4. Click **OK**

If `NODE_ENV` is not set to `production`:
1. Find or create `NODE_ENV`
2. Set value to: `production`
3. Click **OK**

### Step 4: Remove BYPASS_AUTH (if present)

If you see `BYPASS_AUTH` in the settings:
1. Click the **X** to delete it
2. This should ONLY be used for local development

### Step 5: Save and Restart

1. Click **Save** at the top
2. Click **Continue** to confirm
3. Wait for the app to restart (30-60 seconds)

### Step 6: Verify Database Connection

After restart, check the health endpoint again:
```
https://cms-system-czggf5bjhxgkacat.australiaeast-01.azurewebsites.net/api/health
```

You should see:
```json
{
  "status": "ok",
  "db": {
    "status": "healthy",
    "connection": "stmichael.mongo.cosmos.azure.com:10255/church_db"
  }
}
```

## Alternative: Check Logs

If the database still won't connect, check the logs:

1. In Azure Portal → **cms-system**
2. Click **Log stream** (under Monitoring)
3. Look for error messages like:
   - `MongoDB connection failed`
   - `Authentication failed`
   - `Network error`

Common issues:
- **Firewall**: Cosmos DB firewall might not allow Azure services
- **Credentials**: Password might be incorrect
- **Connection string**: Format might be wrong

## Quick Test Commands

### Test from your computer:
```powershell
# Check backend health
curl https://cms-system-czggf5bjhxgkacat.australiaeast-01.azurewebsites.net/api/health

# Should show db.status = "healthy"
```

### Test login (will fail until admin user is created):
```powershell
curl https://cms-system-czggf5bjhxgkacat.australiaeast-01.azurewebsites.net/api/auth/login `
  -Method POST `
  -Headers @{"Content-Type"="application/json"} `
  -Body '{"username":"admin","password":"admin123"}'
```

Expected response (once DB is connected):
```json
{
  "success": false,
  "error": "Invalid username or password",
  "code": "INVALID_CREDENTIALS"
}
```

This error is GOOD - it means the database is connected and checking for the user!

## After Database Connection is Fixed

Once the database is connected, follow these steps:

### 1. Create Admin User
```bash
# In Azure Portal → cms-system → Console
cd site/wwwroot
node create-admin-azure.js
```

### 2. Test Login
- Go to: https://cms.erotc.org/test-login.html
- Click "Test Login"
- Should succeed with admin/admin123

## Summary

**Current Issue:** Backend not connected to database  
**Solution:** Add/verify `MONGODB_URI` in Azure App Settings  
**Next Step:** Create admin user once database is connected  
**Final Step:** Test login at https://cms.erotc.org

---

**Priority:** HIGH - Database connection must be fixed first  
**Estimated Time:** 5 minutes to fix settings + 1 minute restart
