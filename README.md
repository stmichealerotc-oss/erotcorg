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
│   └── server.js           # Main server file
├── frontend-admin/         # Admin panel
│   ├── css/               # Stylesheets
│   ├── js/                # JavaScript modules
│   ├── pages/             # HTML pages
│   └── index.html         # Main admin page
├── frontend-website/       # Public website
│   └── index.html         # Public homepage
└── staticwebapp.config.json # Azure SWA configuration
```

## 🎯 Recent Updates

- ✅ Fixed logout functionality (real auth vs dev bypass)
- ✅ Resolved Azure Cosmos DB sorting issues (18+ fixes)
- ✅ Fixed static file serving (CSS/JS MIME types)
- ✅ Corrected relative paths in SPA pages
- ✅ Production-ready authentication system
- ✅ Azure deployment configuration

## 🔗 Links

- **GitHub**: https://github.com/stmichealerotc-oss/erotcorg
- **Admin Panel**: `/admin`
- **Public Website**: `/`