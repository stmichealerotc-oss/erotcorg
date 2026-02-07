# St. Michael Church Management System

A comprehensive church management system built with Node.js, Express, and Azure Cosmos DB.

## 🏗️ Architecture

- **Frontend Admin**: Church management admin panel (`/admin`)
- **Frontend Website**: Public church website (`/`)
- **Backend API**: Node.js/Express server (deployed separately)
- **Database**: Azure Cosmos DB (MongoDB API)

## 🚀 Deployment

### Azure Static Web Apps (Frontend)
- **Admin Panel**: Deployed to `/admin` route
- **Public Website**: Deployed to `/` route
- **Configuration**: `staticwebapp.config.json`

### Azure App Service (Backend)
- **API Server**: Node.js/Express on port 3001
- **Database**: Connected to Azure Cosmos DB
- **Environment**: Production-ready with JWT authentication

## 🔧 Local Development

```bash
# Install dependencies
npm run install-all

# Start backend server
cd backend
npm start

# Access admin panel
http://localhost:3001/admin

# Access public website
http://localhost:3001/
```

## 📋 Features

- ✅ **Authentication**: JWT-based with real user management
- ✅ **Members Management**: Complete member lifecycle
- ✅ **Financial Tracking**: Accounting and contributions
- ✅ **Inventory Management**: Church assets tracking
- ✅ **Reports**: Financial and operational reports
- ✅ **Task Management**: Church operations planning
- ✅ **Mobile Responsive**: Works on all devices

## 🔐 Authentication

- **Admin Credentials**: `admin / admin123`
- **Database**: Azure Cosmos DB `church_db`
- **Security**: JWT tokens with role-based access

## 🛠️ Technical Stack

- **Backend**: Node.js, Express.js, Mongoose
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Database**: Azure Cosmos DB (MongoDB API)
- **Deployment**: Azure Static Web Apps + App Service
- **Authentication**: JWT with bcrypt password hashing

## 📁 Project Structure

```
st-michael-church/
├── backend/                 # API server
│   ├── routes/             # API endpoints
│   ├── models/             # Database models
│   ├── middleware/         # Authentication & validation
│   ├── config/             # Database configuration
│   ├── server.js           # Main server file
│   ├── export-local-data.js # Data migration tool
│   └── import-to-azure.js  # Azure import tool
├── frontend-admin/         # Admin panel (CMS)
│   ├── css/               # Stylesheets
│   ├── js/                # JavaScript modules
│   ├── pages/             # HTML pages
│   ├── images/            # Images and assets
│   ├── index.html         # Main admin dashboard
│   └── login.html         # Admin login page
├── frontend-website/       # Public church website
│   ├── css/               # Website styles
│   └── index.html         # Public homepage
├── .github/workflows/      # GitHub Actions
│   ├── main_cms_system.yml              # Backend deployment
│   └── azure-static-web-apps-front-admin.yml  # Frontend deployment
├── staticwebapp.config.json # Azure Static Web Apps config
├── AZURE_SETUP_CHECKLIST.md # Deployment guide
├── DATA_MIGRATION_GUIDE.md  # Database migration guide
└── README.md               # This file
```

## 🌐 URLs

- **Public Website**: https://agreeable-plant-06f731700.2.azurestaticapps.net/
- **Admin Panel**: https://agreeable-plant-06f731700.2.azurestaticapps.net/admin
- **Backend API**: https://cms-system-czggf5bjhxgkacat.australiaeast-01.azurewebsites.net/api
- **Custom Domain**: https://cms.erotc.org (if configured)

## 🎯 Recent Updates

- ✅ Public website created and deployed
- ✅ Data migration tools for MongoDB → Azure Cosmos DB
- ✅ Fixed backend deployment with npm install
- ✅ CORS configuration for Azure Static Web Apps
- ✅ GitHub Actions workflows for automated deployment
- ✅ Fixed logout functionality (real auth vs dev bypass)
- ✅ Resolved Azure Cosmos DB sorting issues
- ✅ Production-ready authentication system

## 🔗 Links

- **GitHub**: https://github.com/stmichealerotc-oss/erotcorg
- **Admin Panel**: `/admin`
- **Public Website**: `/`