# 🚀 Deploy DocuSeal to Azure NOW

## Quick Start (Recommended)

Run this command to choose your deployment option:

```powershell
cd st-michael-church
.\deploy-docuseal-azure-menu.ps1
```

This will give you 2 options:
1. **Azure Container Instances** - Simple, ~$30-40/month
2. **Azure App Service** - Production with HTTPS, ~$60/month

---

## Option 1: Azure Container Instances (RECOMMENDED)

**Best for:** Quick deployment, lower cost

```powershell
cd st-michael-church
.\deploy-docuseal-aci.ps1
```

**Result:**
- URL: `http://docuseal-stmichael.australiaeast.azurecontainer.io:3000`
- Cost: ~$30-40/month
- Setup time: 5 minutes

---

## Option 2: Azure App Service

**Best for:** Production with HTTPS and custom domain

```powershell
cd st-michael-church
.\deploy-docuseal-to-azure.ps1
```

**Result:**
- URL: `https://docuseal-stmichael.azurewebsites.net`
- Cost: ~$60/month
- Setup time: 10-15 minutes

---

## After Deployment

### 1. Wait for Container to Start
Wait 2-3 minutes after deployment completes

### 2. Access DocuSeal
Open the URL provided by the deployment script

### 3. Create Admin Account
First user to sign up becomes admin

### 4. Configure Email (Optional)
Add SMTP settings for email notifications:

**For Container Instances:**
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
        SECRET_KEY_BASE=<from-first-deployment> `
        SMTP_ADDRESS=smtp.gmail.com `
        SMTP_PORT=587 `
        SMTP_USER_NAME=your-email@gmail.com `
        SMTP_PASSWORD=your-app-password `
        SMTP_FROM="St Michael Church <your-email@gmail.com>" `
    --restart-policy Always
```

**For App Service:**
- Go to Azure Portal
- Navigate to: docuseal-stmichael → Configuration → Application settings
- Add SMTP settings

### 5. Update Links
Update any references from `sign.erotc.org` to new Azure URL

### 6. Shutdown Railway
Once confirmed working, delete Railway service to stop billing

---

## Your Complete Azure Architecture

After DocuSeal deployment, everything will be in Azure:

```
┌─────────────────────────────────────────────────────────┐
│                      AZURE                              │
│                                                         │
│  Frontend (Static Web App)                             │
│  https://lemon-rock-09193a31e.azurestaticapps.net      │
│                                                         │
│  Backend API (App Service)                             │
│  https://cms-system-czggf5bjhxgkacat                   │
│         .australiaeast-01.azurewebsites.net            │
│                                                         │
│  DocuSeal (Container Instance)                         │
│  http://docuseal-stmichael                             │
│       .australiaeast.azurecontainer.io:3000            │
│                                                         │
│  Database (Cosmos DB)                                  │
│  stmichael.mongo.cosmos.azure.com                      │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Troubleshooting

### Check Logs
```powershell
az container logs --resource-group stmichael-rg --name docuseal-stmichael
```

### Restart Container
```powershell
az container restart --resource-group stmichael-rg --name docuseal-stmichael
```

### Delete and Redeploy
```powershell
az container delete --resource-group stmichael-rg --name docuseal-stmichael --yes
.\deploy-docuseal-aci.ps1
```

---

## Ready to Deploy?

```powershell
cd st-michael-church
.\deploy-docuseal-azure-menu.ps1
```

🎉 That's it!
