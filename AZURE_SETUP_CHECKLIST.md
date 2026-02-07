# ✅ Azure Setup Checklist

## ✅ Completed Locally

- Database connection working with new Cosmos DB: `stmichael-db`
- Admin user created successfully
- Login tested and working: `admin` / `admin123`
- CORS configuration cleaned up (removed old domains)
- Code pushed to GitHub

## 🔧 Manual Steps Required in Azure Portal

### Step 1: Fix SMTP Settings

Go to: Azure Portal → **cms-system** → **Configuration**

Fix these 2 typos:

1. **SMTP_HOST**: Change `stmtp.gmail.com` → `smtp.gmail.com`
2. **SMTP_USER**: Change `debeday304@gmail.com` → `debesay304@gmail.com`

Click **Save** → **Continue**

### Step 2: Wait for Deployment

GitHub Actions will automatically deploy the updated code to Azure.

Check: https://github.com/stmichealerotc-oss/erotcorg/actions

### Step 3: Verify Database Connection

Test: `https://cms-system-czggf5bjhxgkacat.australiaeast-01.azurewebsites.net/api/health`

Should show: `"db": {"status": "healthy"}`

### Step 4: Create Admin User in Azure

In Azure Portal → **cms-system** → **Console**:

```bash
cd site/wwwroot
node create-admin-azure.js
```

### Step 5: Test Login

- URL: https://cms.erotc.org/login.html
- Or: https://agreeable-plant-06f731700.2.azurestaticapps.net/login.html
- Username: `admin`
- Password: `admin123`

## 📋 Current Configuration

### Database
- Cosmos DB Account: `stmichael-db`
- Database Name: `church_db`
- Connection: Working ✅

### Domains
- Backend: `cms-system-czggf5bjhxgkacat.australiaeast-01.azurewebsites.net`
- Frontend: `agreeable-plant-06f731700.2.azurestaticapps.net`
- Custom Domain: `cms.erotc.org`

### Admin Credentials
- Username: `admin`
- Password: `admin123`
- Role: `super-admin`
