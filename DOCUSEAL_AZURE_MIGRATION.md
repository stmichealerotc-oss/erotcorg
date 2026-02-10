# DocuSeal Azure Migration Guide

## Overview
Migrating DocuSeal from Railway to Azure to consolidate all services in one cloud platform.

## Azure Deployment Options

### Option 1: Azure Container Instances (ACI) - RECOMMENDED
**Best for**: Simple deployment, lower cost, quick setup

**Pros:**
- ✅ Easiest to deploy
- ✅ Lower cost (~$30-50/month)
- ✅ No server management
- ✅ Quick startup

**Cons:**
- ⚠️ No auto-scaling
- ⚠️ HTTP only (need Azure Front Door for HTTPS)

**Deploy Command:**
```powershell
.\deploy-docuseal-aci.ps1
```

**URL:** `http://docuseal-stmichael.australiaeast.azurecontainer.io:3000`

---

### Option 2: Azure App Service with Docker
**Best for**: Production with HTTPS, custom domain, auto-scaling

**Pros:**
- ✅ Built-in HTTPS
- ✅ Custom domain support
- ✅ Auto-scaling
- ✅ Continuous deployment
- ✅ Better monitoring

**Cons:**
- ⚠️ Higher cost (~$55+/month for B1 tier)
- ⚠️ More complex setup

**Deploy Command:**
```powershell
.\deploy-docuseal-to-azure.ps1
```

**URL:** `https://docuseal-stmichael.azurewebsites.net`

---

## Current Architecture

### Before (Railway + Azure):
```
┌─────────────────────────────────────────┐
│           RAILWAY                       │
│  ┌───────────────────────────────────┐  │
│  │  DocuSeal (sign.erotc.org)        │  │
│  │  - Ruby on Rails                  │  │
│  │  - PostgreSQL                     │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│           AZURE                         │
│  ┌───────────────────────────────────┐  │
│  │  Static Web App (Frontend)        │  │
│  │  lemon-rock-09193a31e             │  │
│  └───────────────────────────────────┘  │
│  ┌───────────────────────────────────┐  │
│  │  App Service (Backend API)        │  │
│  │  cms-system-czggf5bjhxgkacat      │  │
│  └───────────────────────────────────┘  │
│  ┌───────────────────────────────────┐  │
│  │  Cosmos DB (Database)             │  │
│  │  stmichael                        │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

### After (All Azure):
```
┌─────────────────────────────────────────────────────────┐
│                      AZURE                              │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Static Web App (Frontend)                        │  │
│  │  https://lemon-rock-09193a31e.azurestaticapps.net │  │
│  └───────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────┐  │
│  │  App Service (Backend API)                        │  │
│  │  https://cms-system-czggf5bjhxgkacat              │  │
│  │         .australiaeast-01.azurewebsites.net       │  │
│  └───────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Container Instance (DocuSeal)                    │  │
│  │  http://docuseal-stmichael                        │  │
│  │       .australiaeast.azurecontainer.io:3000       │  │
│  └───────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Cosmos DB (MongoDB API)                          │  │
│  │  stmichael.mongo.cosmos.azure.com                 │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## Step-by-Step Migration

### Step 1: Choose Deployment Option
**Recommended:** Start with Azure Container Instances (ACI) for simplicity

### Step 2: Deploy to Azure
```powershell
# Option 1: Azure Container Instances (Simple)
.\deploy-docuseal-aci.ps1

# Option 2: Azure App Service (Production)
.\deploy-docuseal-to-azure.ps1
```

### Step 3: Configure Email (SMTP)
After deployment, add email settings:

**For ACI:**
```powershell
az container create `
    --resource-group stmichael-rg `
    --name docuseal-stmichael `
    --image docuseal/docuseal:1.7.2 `
    --dns-name-label docuseal-stmichael `
    --ports 3000 `
    --cpu 1 `
    --memory 1.5 `
    --environment-variables `
        SECRET_KEY_BASE=<your-secret> `
        SMTP_ADDRESS=smtp.gmail.com `
        SMTP_PORT=587 `
        SMTP_USER_NAME=your-email@gmail.com `
        SMTP_PASSWORD=your-app-password `
        SMTP_FROM="St Michael Church <your-email@gmail.com>" `
    --restart-policy Always
```

**For App Service:**
Go to Azure Portal → App Service → Configuration → Application settings

### Step 4: Test DocuSeal
1. Wait 2-3 minutes for container to start
2. Access the URL provided by the deployment script
3. Create admin account
4. Test document signing

### Step 5: Update DNS (Optional)
Point `sign.erotc.org` to Azure:
- **For ACI:** Use Azure Front Door or Application Gateway
- **For App Service:** Add custom domain in Azure Portal

### Step 6: Migrate Data (If needed)
If you have existing data on Railway:
1. Export data from Railway PostgreSQL
2. Import to Azure PostgreSQL or keep using SQLite in container

### Step 7: Shutdown Railway
Once confirmed working on Azure:
```bash
# In Railway dashboard, delete the DocuSeal service
```

---

## Cost Comparison

### Railway (Current):
- DocuSeal: ~$5-20/month

### Azure Options:

**Option 1: Container Instances**
- Container Instance (1 vCPU, 1.5GB): ~$30-40/month
- **Total: ~$30-40/month**

**Option 2: App Service**
- App Service Plan B1: ~$55/month
- Container Registry: ~$5/month
- **Total: ~$60/month**

---

## Monitoring & Management

### View Logs (ACI):
```powershell
az container logs --resource-group stmichael-rg --name docuseal-stmichael
```

### View Logs (App Service):
```powershell
az webapp log tail --name docuseal-stmichael --resource-group stmichael-rg
```

### Restart Container (ACI):
```powershell
az container restart --resource-group stmichael-rg --name docuseal-stmichael
```

### Restart App Service:
```powershell
az webapp restart --name docuseal-stmichael --resource-group stmichael-rg
```

---

## Troubleshooting

### Container won't start:
```powershell
# Check logs
az container logs --resource-group stmichael-rg --name docuseal-stmichael

# Check status
az container show --resource-group stmichael-rg --name docuseal-stmichael
```

### Can't access URL:
- Wait 2-3 minutes after deployment
- Check if port 3000 is accessible
- Verify DNS name is correct

### Email not working:
- Verify SMTP settings in environment variables
- Check Gmail App Password is correct
- Ensure 2FA is enabled on Gmail account

---

## Next Steps After Migration

1. ✅ Deploy DocuSeal to Azure
2. ✅ Configure email settings
3. ✅ Test document signing
4. ✅ Update any links from `sign.erotc.org` to new Azure URL
5. ✅ Configure custom domain (optional)
6. ✅ Shutdown Railway service
7. ✅ Update documentation

---

## Support

- Azure Container Instances: https://docs.microsoft.com/azure/container-instances/
- Azure App Service: https://docs.microsoft.com/azure/app-service/
- DocuSeal: https://github.com/docusealco/docuseal
