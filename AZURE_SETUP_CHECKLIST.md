# ✅ Azure Setup Checklist

## ✅ Completed Locally

- Database connection working with Cosmos DB: `stmichael-db`
- Admin user created successfully
- Login tested and working: `admin` / `admin123`
- CORS configuration cleaned up
- GitHub workflows fixed to use correct resource names
- GitHub secrets already configured ✅
- Code pushed to GitHub

## 🔧 Manual Steps Required

### Step 1: Get Frontend URL

Go to Azure Portal → **front-admin** → **Overview**

Copy the URL (should be like `https://[something].azurestaticapps.net`)

We need this to update CORS configuration.

### Step 2: Fix SMTP Settings

Go to: Azure Portal → **cms-system** → **Configuration**

Fix these 2 typos:

1. **SMTP_HOST**: Change `stmtp.gmail.com` → `smtp.gmail.com`
2. **SMTP_USER**: Change `debeday304@gmail.com` → `debesay304@gmail.com`

Click **Save** → **Continue**

### Step 3: Re-run Failed Deployment

After I add the frontend URL to CORS, the deployment should work.

Go to: https://github.com/stmichealerotc-oss/erotcorg/actions

Click **Re-run all jobs** on the failed workflow.

### Step 4: Wait for Deployment

GitHub Actions will automatically deploy the updated code to Azure.

Check: https://github.com/stmichealerotc-oss/erotcorg/actions

### Step 5: Verify Database Connection

Test: `https://cms-system-czggf5bjhxgkacat.australiaeast-01.azurewebsites.net/api/health`

Should show: `"db": {"status": "healthy"}`

### Step 6: Create Admin User in Azure

In Azure Portal → **cms-system** → **Console**:

```bash
cd site/wwwroot
node create-admin-azure.js
```

### Step 7: Test Login

- URL: Get from Step 1 (front-admin URL)
- Or custom domain: https://cms.erotc.org/login.html (if configured)
- Username: `admin`
- Password: `admin123`

## 📋 Current Configuration

### Azure Resources
- **Backend App Service:** `cms-system`
- **Frontend Static Web App:** `front-admin`
- **Database:** `stmichael-db` (Cosmos DB for MongoDB RU)
- **Database Name:** `church_db`

### URLs
- **Backend API:** `https://cms-system-czggf5bjhxgkacat.australiaeast-01.azurewebsites.net`
- **Frontend:** (Need to get URL from Azure Portal → front-admin → Overview)
- **Custom Domain:** `cms.erotc.org` (if configured)

### GitHub Secrets (Already Configured ✅)
- `AZUREAPPSERVICE_PUBLISHPROFILE_CMS_SYSTEM` - Backend deployment
- `AZURE_STATIC_WEB_APPS_API_TOKEN_FRONT_ADMIN` - Frontend deployment

### Admin Credentials
- Username: `admin`
- Password: `admin123`
- Role: `super-admin`
