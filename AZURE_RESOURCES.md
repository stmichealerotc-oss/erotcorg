# Azure Resources Overview

## 🌐 Two Separate Static Web Apps

### 1. Public Church Website (ashy-cliff)
- **Azure Resource**: `ashy-cliff-058ad9c00`
- **URL**: https://ashy-cliff-058ad9c00.1.azurestaticapps.net/
- **Purpose**: Public church website
- **Access**: Open to everyone (NO LOGIN)
- **Deploys**: `frontend-website/` folder
- **Workflow**: `.github/workflows/azure-static-web-apps-ashy-cliff-058ad9c00.yml`
- **Secret**: `AZURE_STATIC_WEB_APPS_API_TOKEN_ASHY_CLIFF_058AD9C00`

### 2. Admin Panel (agreeable-plant / front-admin)
- **Azure Resource**: `front-admin` (agreeable-plant-06f731700)
- **URL**: https://agreeable-plant-06f731700.2.azurestaticapps.net/
- **Purpose**: Church management system (CMS)
- **Access**: Requires login
- **Login**: `admin` / `admin123`
- **Deploys**: `frontend-admin/` folder
- **Workflow**: `.github/workflows/azure-static-web-apps-front-admin.yml`
- **Secret**: `AZURE_STATIC_WEB_APPS_API_TOKEN_FRONT_ADMIN`

### 3. Backend API (cms-system)
- **Azure Resource**: `cms-system` (App Service)
- **URL**: https://cms-system-czggf5bjhxgkacat.australiaeast-01.azurewebsites.net/api
- **Purpose**: Backend API for admin panel
- **Database**: Azure Cosmos DB (`stmichael-db`)
- **Deploys**: `backend/` folder
- **Workflow**: `.github/workflows/main_cms_system.yml`
- **Secret**: `AZUREAPPSERVICE_PUBLISHPROFILE_CMS_SYSTEM`

## 📋 Deployment Structure

```
GitHub Repository (stmichealerotc-oss/erotcorg)
│
├── frontend-website/          → ashy-cliff-058ad9c00
│   ├── index.html            (Public church website)
│   └── css/style.css         (NO LOGIN REQUIRED)
│
├── frontend-admin/            → agreeable-plant-06f731700
│   ├── index.html            (Admin dashboard)
│   ├── login.html            (LOGIN REQUIRED)
│   └── pages/                (CMS features)
│
└── backend/                   → cms-system
    ├── server.js             (API server)
    ├── routes/               (API endpoints)
    └── models/               (Database models)
```

## 🔗 Quick Links

| Resource | URL | Login Required |
|----------|-----|----------------|
| Public Website | https://ashy-cliff-058ad9c00.1.azurestaticapps.net/ | ❌ No |
| Admin Panel | https://agreeable-plant-06f731700.2.azurestaticapps.net/ | ✅ Yes |
| Backend API | https://cms-system-czggf5bjhxgkacat.australiaeast-01.azurewebsites.net/api | ✅ Yes |
| API Health | https://cms-system-czggf5bjhxgkacat.australiaeast-01.azurewebsites.net/api/health | ❌ No |

## 🚀 Deployment Triggers

### Public Website
- Triggers when: `frontend-website/**` files change
- Deploys to: ashy-cliff-058ad9c00

### Admin Panel
- Triggers when: `frontend-admin/**` files change
- Deploys to: agreeable-plant-06f731700

### Backend API
- Triggers when: Any file changes (push to main)
- Deploys to: cms-system

## 🔐 GitHub Secrets

All three secrets are configured:
- ✅ `AZURE_STATIC_WEB_APPS_API_TOKEN_ASHY_CLIFF_058AD9C00`
- ✅ `AZURE_STATIC_WEB_APPS_API_TOKEN_FRONT_ADMIN`
- ✅ `AZUREAPPSERVICE_PUBLISHPROFILE_CMS_SYSTEM`

## 📝 Custom Domains (Optional)

You can add custom domains in Azure Portal:

### Public Website
- Go to: Azure Portal → ashy-cliff-058ad9c00 → Custom domains
- Add: `www.erotc.org` or `erotc.org`

### Admin Panel
- Go to: Azure Portal → front-admin → Custom domains
- Add: `admin.erotc.org` or `cms.erotc.org`

## 🛠️ Maintenance

### Update Public Website
1. Edit files in `frontend-website/`
2. Commit and push
3. Auto-deploys to ashy-cliff

### Update Admin Panel
1. Edit files in `frontend-admin/`
2. Commit and push
3. Auto-deploys to agreeable-plant

### Update Backend
1. Edit files in `backend/`
2. Commit and push
3. Auto-deploys to cms-system
