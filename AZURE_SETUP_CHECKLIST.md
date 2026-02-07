# ✅ Azure Setup Checklist - Fresh Start

## Step 1: Fix SMTP Settings in Azure

Go to: Azure Portal → **cms-system** → **Configuration**

Fix these 2 typos:

1. **SMTP_HOST**: Change `stmtp.gmail.com` → `smtp.gmail.com`
2. **SMTP_USER**: Change `debeday304@gmail.com` → `debesay304@gmail.com`

Click **Save** → **Continue**

## Step 2: Verify Database Connection

Test: `https://cms-system-czggf5bjhxgkacat.australiaeast-01.azurewebsites.net/api/health`

Should show: `"db": {"status": "healthy"}`

## Step 3: Create Admin User

In Azure Portal → **cms-system** → **Console**:

```bash
cd site/wwwroot
node create-admin-azure.js
```

## Step 4: Login

- URL: https://cms.erotc.org/login.html
- Username: `admin`
- Password: `admin123`

✅ Done!
