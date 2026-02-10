# Backend Deployment Fix - 409 Conflict Resolved

## Problem
GitHub Actions was failing to deploy the backend with error:
```
Error: Deployment Failed, Error: Failed to deploy web package using OneDeploy to App Service.
Conflict (CODE: 409)
```

## Root Cause
1. **Wrong deployment path**: Workflow was deploying entire repository instead of just `/backend` folder
2. **Missing Azure configuration**: No `.deployment` or `web.config` files for Azure App Service
3. **Deployment conflict**: App Service was locked during deployment

## Fixes Applied

### 1. Fixed GitHub Workflow
**File**: `.github/workflows/main_cms_system.yml`

**Changed**:
```yaml
# Before
path: .  # ❌ Deploys entire repo

# After  
path: ./backend  # ✅ Deploys only backend folder
```

### 2. Added Azure Configuration Files

**File**: `backend/.deployment`
```
[config]
SCM_DO_BUILD_DURING_DEPLOYMENT=true
```

**File**: `backend/web.config`
- Configures IIS to run Node.js app
- Sets up URL rewriting
- Configures production environment

### 3. Created Fix Script
**File**: `fix-backend-deployment.ps1`
- Stops App Service
- Waits 5 seconds
- Starts App Service
- Restarts App Service

## How to Use

### Automatic Deployment (Recommended)
The fixes are now in GitHub. Just push any change to trigger deployment:

```powershell
cd st-michael-church
git add .
git commit -m "Your changes"
git push origin main
```

GitHub Actions will automatically deploy the backend correctly.

### Manual Fix (If 409 Conflict Persists)

If you have Azure CLI installed:
```powershell
cd st-michael-church
.\fix-backend-deployment.ps1
```

Or manually in Azure Portal:
1. Go to https://portal.azure.com
2. Navigate to: App Services → cms-system
3. Click "Stop"
4. Wait 30 seconds
5. Click "Start"
6. Push code to GitHub again

## Verification

After deployment completes, verify:

1. **Check GitHub Actions**:
   - Go to: https://github.com/stmichealerotc-oss/erotcorg/actions
   - Latest workflow should show ✅ green checkmark

2. **Test Backend API**:
   ```
   https://cms-system-czggf5bjhxgkacat.australiaeast-01.azurewebsites.net/api/health
   ```

3. **Check Logs** (if needed):
   - Azure Portal → App Services → cms-system → Log stream

## Current Deployment Status

✅ **Fixed Issues:**
- Workflow now deploys only backend folder
- Azure configuration files added
- Deployment path corrected

✅ **Next Deployment:**
- Will automatically work when you push to GitHub
- No manual intervention needed

## Architecture

```
GitHub Repository (main branch)
    ↓
GitHub Actions Workflow
    ↓
Build: Install dependencies in /backend
    ↓
Deploy: Upload /backend folder only
    ↓
Azure App Service (cms-system)
    ↓
Running at: https://cms-system-czggf5bjhxgkacat.australiaeast-01.azurewebsites.net
```

## Troubleshooting

### If deployment still fails:

1. **Check GitHub Secrets**:
   - Go to: Repository → Settings → Secrets and variables → Actions
   - Verify `AZUREAPPSERVICE_PUBLISHPROFILE_CMS_SYSTEM` exists

2. **Re-download Publish Profile**:
   - Azure Portal → App Services → cms-system
   - Click "Get publish profile"
   - Update GitHub secret with new profile

3. **Check App Service Status**:
   - Ensure app is running in Azure Portal
   - Check for any error messages

4. **View Deployment Logs**:
   - Azure Portal → App Services → cms-system → Deployment Center
   - Check logs for detailed error messages

## Summary

The backend deployment is now fixed. The next time you push code to GitHub, it will automatically deploy correctly to Azure App Service without the 409 conflict error.
