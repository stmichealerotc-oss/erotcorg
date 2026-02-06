# Church Management System - Setup Guide

## Prerequisites

- Azure Cosmos DB for MongoDB (RU account)
- Azure Web App (for backend)
- Azure Static Web App (for frontend)

## Step 1: Create New Cosmos DB Database

1. Go to Azure Portal → Azure Cosmos DB → **stmichael**
2. Click **Data Explorer**
3. Click **New Database**
4. Database ID: `church_db`
5. Throughput: Serverless (recommended)
6. Click **OK**

## Step 2: Update Connection String (if needed)

If you created a new Cosmos DB account, update the connection string:

1. Azure Portal → Cosmos DB → **Connection String**
2. Copy the **PRIMARY CONNECTION STRING**
3. Update in:
   - Azure Web App → Configuration → `MONGODB_URI`
   - Local: `backend/.env`

## Step 3: Create Admin User

Once the database is created:

```bash
# In Azure Portal → cms-system → Console
cd site/wwwroot
node create-admin-azure.js
```

Expected output:
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

## Step 4: Test Login

1. Go to: https://cms.erotc.org/login.html
2. Username: `admin`
3. Password: `admin123`
4. Should redirect to dashboard ✅

## Step 5: Change Default Password

After first login:
1. Go to User Management
2. Change password from `admin123` to something secure

## Troubleshooting

### Backend Health Check
```
https://cms-system-czggf5bjhxgkacat.australiaeast-01.azurewebsites.net/api/health
```

Should show:
```json
{
  "status": "ok",
  "db": {
    "status": "healthy"
  }
}
```

### If Database Shows "disconnected"

Check:
1. **Cosmos DB Firewall**: Azure Portal → Cosmos DB → Networking → Enable "Allow access from Azure services"
2. **Connection String**: Verify `MONGODB_URI` in Azure App Settings
3. **Logs**: Azure Portal → cms-system → Log stream

## URLs

- **Frontend:** https://cms.erotc.org
- **Backend API:** https://cms-system-czggf5bjhxgkacat.australiaeast-01.azurewebsites.net/api
- **GitHub:** https://github.com/stmichealerotc-oss/erotcorg

## Environment Variables (Azure App Settings)

Required settings for `cms-system`:

```
MONGODB_URI = [Your Cosmos DB connection string]
NODE_ENV = production
JWT_SECRET = [Your JWT secret]
SMTP_HOST = smtp.gmail.com
SMTP_PORT = 587
SMTP_USER = debesay304@gmail.com
SMTP_PASS = [Your app password]
```

---

**Ready to use!** 🎉
