# St. Michael EROTC Church Management System

A comprehensive church management system for St. Michael Eritrean Orthodox Tewahedo Church, built with Node.js, Express, and Azure Cosmos DB.

## 🌐 Live URLs

- **Public Website**: https://erotc.org
- **Admin Panel**: https://agreeable-plant-06f731700.2.azurestaticapps.net/admin
- **Backend API**: https://cms-system-czggf5bjhxgkacat.australiaeast-01.azurewebsites.net/api

## 🏗️ Architecture

### Frontend
- **Public Website** (`frontend-website/`) - Church information, kids program, member registration
- **Admin Panel** (`frontend-admin/`) - Church management system with authentication

### Backend
- **API Server** (`backend/`) - Node.js/Express REST API
- **Database** - Azure Cosmos DB (MongoDB API)

### Deployment
- **Frontend**: Azure Static Web Apps (ashy-cliff-058ad9c00 for public, agreeable-plant-06f731700 for admin)
- **Backend**: Azure App Service (cms-system)
- **CI/CD**: GitHub Actions

## 📋 Features

- Member management and registration
- Financial tracking and accounting
- Inventory management
- Kids program with weekly lessons
- Task and promise tracking
- Reports and analytics
- Email notifications
- Multi-language support (English, Tigrinya)

## 🚀 Quick Start

### Local Development

```bash
# Install dependencies
npm install
cd backend && npm install
cd ../frontend-admin && npm install

# Start backend
cd backend
npm start

# Access locally
# Public website: http://localhost:3001/
# Admin panel: http://localhost:3001/admin
```

### Environment Variables

Create `backend/.env`:
```
MONGODB_URI=your_cosmos_db_connection_string
JWT_SECRET=your_jwt_secret
NODE_ENV=development
PORT=3001
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email
SMTP_PASS=your_app_password
```

## 🔐 Admin Access

- Username: `admin`
- Password: `admin123`
- Change these credentials after first login!

## 📁 Project Structure

```
├── backend/                 # API server
│   ├── routes/             # API endpoints
│   ├── models/             # Database models
│   ├── middleware/         # Auth & validation
│   └── server.js           # Main server
├── frontend-admin/         # Admin CMS
│   ├── pages/             # Admin pages
│   ├── js/                # JavaScript modules
│   └── index.html         # Dashboard
├── frontend-website/       # Public website
│   ├── pages/             # Public pages
│   ├── js/                # JavaScript modules
│   └── index.html         # Homepage
└── .github/workflows/      # CI/CD pipelines
```

## 🔧 Azure Resources

- **cms-system** - Backend App Service
- **ashy-cliff-058ad9c00** - Public website Static Web App
- **agreeable-plant-06f731700** - Admin panel Static Web App
- **stmichael-db** - Cosmos DB for MongoDB (RU)

## 📖 Documentation

- `SECURITY.md` - Security guidelines
- `backend/DATA_MIGRATION_GUIDE.md` - Database migration instructions
- `backend/ADMIN_SETUP.md` - Admin user setup

## 🛠️ Tech Stack

- **Backend**: Node.js, Express.js, Mongoose
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Database**: Azure Cosmos DB (MongoDB API)
- **Authentication**: JWT with bcrypt
- **Deployment**: Azure Static Web Apps + App Service
- **CI/CD**: GitHub Actions

## 📞 Support

For issues or questions, contact: stmichealerotc@gmail.com

## 📄 License

Copyright © 2026 St. Michael EROTC. All rights reserved.
