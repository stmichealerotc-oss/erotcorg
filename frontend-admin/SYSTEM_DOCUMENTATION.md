# Church Management System

Last Updated: February 2026

## Overview
A comprehensive web-based management system designed for St. Michael Eritrean Orthodox Tewahedo Church in Perth, Western Australia. The system handles member management, financial accounting, inventory tracking, automated reporting with ACNC compliance, and advanced features including QR code generation, bank statement processing, and mobile-optimized date inputs.

## System Architecture

### Backend (Node.js/Express)
- **Framework**: Express.js with Azure Cosmos DB (MongoDB API)
- **Hosting**: Azure App Service with automatic GitHub deployment
- **Authentication**: JWT-based session management
- **API Structure**: RESTful endpoints with middleware protection
- **Database**: Azure Cosmos DB with Mongoose ODM
- **PDF Generation**: Professional PDF reports and receipts
- **QR Code Generation**: Dynamic QR codes for members and receipts

### Frontend (Vanilla JavaScript)
- **Hosting**: Azure Static Web Apps with automatic GitHub deployment
- **Architecture**: Single Page Application (SPA)
- **Styling**: Custom CSS with organized component system
- **Navigation**: Dynamic page loading with main.js router
- **State Management**: Class-based page controllers
- **Mobile Optimization**: Touch-friendly interfaces and date inputs

## Core Features

### 1. Member Management
- **Member Registration**: Complete profile management with contact details
- **Member Cards**: Digital membership cards with QR codes for identification
- **QR Code Generation**: Dynamic QR codes for member verification (zero database storage)
- **Search & Filtering**: Advanced member search capabilities
- **Status Tracking**: Active/Inactive member status management
- **Mobile-Friendly Forms**: Optimized date inputs for mobile devices

**Key Files:**
- `backend/routes/members.js` - Member API endpoints
- `backend/models/Member.js` - Member data model
- `frontend/js/members.js` - Member management interface
- `frontend/pages/members.html` - Member list and forms
- `backend/utils/qrCodeGenerator.js` - QR code generation utility

### 2. Financial Accounting System
- **Transaction Management**: Income and expense tracking with comprehensive filtering
- **Bank Statement View**: Professional bank-style statements with running balance
- **Member Contributions**: In-kind and cash donation tracking
- **Category System**: Organized financial categories
- **Receipt Generation**: PDF receipts with QR codes and email functionality
- **Date Filtering**: Fixed inclusive date range filtering for accurate reporting
- **PDF Export**: Professional bank statements with church letterhead

**Key Files:**
- `backend/routes/accounting.js` - Financial transaction APIs
- `backend/routes/memberContributions.js` - Contribution tracking
- `frontend/js/accounting.js` - Accounting interface with bank statement view
- `frontend/pages/accounting.html` - Financial management UI
- `backend/utils/pdfGenerator.js` - PDF generation for receipts and statements

### 3. Inventory Management
- **Item Tracking**: Physical inventory with donor attribution
- **Donation Recording**: Track donated items and their values
- **Consumption Tracking**: Monitor item usage for church operations
- **History Management**: Complete audit trail for all items

**Key Files:**
- `backend/routes/inventory.js` - Inventory API endpoints
- `backend/models/InventoryItem.js` - Inventory data model
- `frontend/js/inventory.js` - Inventory management interface
- `frontend/pages/inventory.html` - Inventory tracking UI

### 4. Financial Reporting
- **ACNC Compliance**: Australian Charity reporting standards
- **Quarterly/Annual Reports**: Automated financial report generation
- **In-Kind Tracking**: Separate cash and non-cash reporting
- **Export Capabilities**: PDF generation and data export

**Key Files:**
- `backend/routes/reports.js` - Report generation APIs
- `backend/models/Report.js` - Report data model
- `frontend/js/generatereport.js` - Report generation interface
- `frontend/pages/generatereport.html` - Report creation UI

### 5. Task Management
- **Task Assignment**: Assign tasks to members
- **Progress Tracking**: Monitor task completion
- **Deadline Management**: Track due dates and priorities
- **Status Updates**: Real-time task status management

**Key Files:**
- `backend/routes/tasks.js` - Task management APIs
- `backend/models/Task.js` - Task data model
- `frontend/js/taskmanagement.js` - Task interface
- `frontend/pages/taskmanagement.html` - Task management UI

### 6. User Management & Authentication
- **Role-Based Access**: Admin and user role management
- **Secure Authentication**: JWT token-based security
- **Password Management**: Secure password reset functionality
- **Session Management**: Automatic session handling

**Key Files:**
- `backend/routes/auth.js` - Authentication endpoints
- `backend/routes/userManagement.js` - User management APIs
- `backend/middleware/auth.js` - Authentication middleware
- `frontend/js/auth.js` - Authentication handling

### 7. Mobile-Optimized Date Inputs
- **Auto-Formatting**: Automatic DD/MM/YYYY formatting while typing
- **Mobile Picker**: Touch-friendly dropdowns for Day/Month/Year selection
- **Quick Date Buttons**: Today, Yesterday, 1 Week Ago, 1 Month Ago options
- **Dual Input Methods**: Manual typing and dropdown selectors
- **Smart Validation**: Real-time date validation with error messages
- **Format Conversion**: Seamless conversion between display and storage formats

**Key Files:**
- `frontend/js/mobile-date-input.js` - Mobile date input component
- `frontend/css/mobile-date-input.css` - Mobile-optimized styling

### 8. QR Code System
- **Dynamic Generation**: QR codes generated from existing data (zero storage impact)
- **Member QR Codes**: Full member information and compact member card formats
- **Receipt QR Codes**: Transaction verification QR codes in PDF receipts
- **Download & Print**: PNG download and print-friendly member cards
- **Security Features**: Timestamped QR codes with church identification

**Key Files:**
- `backend/utils/qrCodeGenerator.js` - QR code generation utility
- `backend/routes/memberCards.js` - Member card QR code endpoints

### 9. Bank Statement Processing
- **Professional Format**: Bank-style statements with running balance calculations
- **Date Range Filtering**: Accurate inclusive date filtering
- **Summary Statistics**: Opening balance, total debits/credits, closing balance
- **PDF Export**: Professional bank statements with church letterhead
- **Reconciliation Ready**: Format suitable for bank reconciliation

**Key Features:**
- Opening/closing balance calculation
- Running balance for each transaction
- Color-coded debits (red) and credits (green)
- Professional PDF export with church branding
- **Role-Based Access**: Admin and user role management
- **Secure Authentication**: JWT token-based security
- **Password Management**: Secure password reset functionality
- **Session Management**: Automatic session handling

**Key Files:**
- `backend/routes/auth.js` - Authentication endpoints
- `backend/routes/userManagement.js` - User management APIs
- `backend/middleware/auth.js` - Authentication middleware
- `frontend/js/auth.js` - Authentication handling

## Technical Implementation

### Database Models
- **Member**: Complete member information and status with QR code generation
- **Transaction**: Financial transactions with categorization and receipt QR codes
- **MemberContribution**: In-kind and cash contributions
- **InventoryItem**: Physical inventory with donor tracking
- **Task**: Task management with assignments
- **User**: System user accounts and roles
- **Report**: Generated financial reports with PDF export

### API Structure
All APIs follow RESTful conventions:
- `GET /api/[resource]` - List resources with enhanced filtering
- `GET /api/[resource]/:id` - Get specific resource
- `POST /api/[resource]` - Create new resource
- `PUT /api/[resource]/:id` - Update resource
- `DELETE /api/[resource]/:id` - Delete resource

**Enhanced Endpoints:**
- `GET /api/members/:id/qr-code` - Generate member QR codes
- `POST /api/reports/generate-pdf` - Generate bank statement PDFs
- `GET /api/accounting` - Enhanced with date filtering and bank statement support

### Frontend Architecture
- **Page Controllers**: Each page has a dedicated JavaScript class
- **API Client**: Centralized API communication with error handling
- **Component System**: Reusable UI components and utilities
- **Responsive Design**: Mobile-first responsive layout
- **Mobile Components**: Touch-optimized date inputs and QR code modals

## Recent Enhancements (2026)

### Bank Statement Feature
- **Professional Format**: Bank-style statements with running balance calculations
- **Date Range Filtering**: Fixed inclusive date filtering for accurate reporting
- **PDF Export**: Professional bank statements with church letterhead and branding
- **Summary Statistics**: Opening balance, total debits/credits, closing balance
- **Reconciliation Ready**: Format suitable for bank reconciliation

### QR Code Implementation
- **Zero Storage Impact**: Dynamic generation from existing member data
- **Member Cards**: Compact QR codes for member identification
- **Receipt Integration**: QR codes automatically included in PDF receipts
- **Download & Print**: PNG export and print-friendly member cards
- **Security Features**: Timestamped QR codes with church identification

### Mobile Date Input Enhancement
- **Auto-Formatting**: Automatic DD/MM/YYYY formatting while typing
- **Touch-Friendly**: Large touch targets and mobile-optimized picker
- **Quick Dates**: Today, Yesterday, 1 Week Ago, 1 Month Ago buttons
- **Dual Methods**: Manual typing and dropdown selectors
- **Smart Validation**: Real-time validation with error messages

### Date Filtering Fix
- **Inclusive End Dates**: Fixed issue where end date transactions were excluded
- **Consistent Behavior**: Applied fix across all date filtering endpoints
- **Accurate Reporting**: All transactions within date ranges now included
- **Business Impact**: Improved accuracy for monthly/quarterly reports

## Key Business Logic

### In-Kind Donation Workflow
1. **Type Selection**: Choose between "In-Kind Donation" (consumable) or "Physical Item" (storable)
2. **Automatic Processing**: Physical items automatically create inventory entries
3. **Financial Recording**: Both types create income/expense entries immediately
4. **Inventory Tracking**: Physical items tracked until consumed

### Financial Reporting Logic
- **Cash vs Non-Cash**: Separate tracking for ACNC compliance
- **Australian Financial Year**: July 1 - June 30 reporting periods
- **Quarterly Reports**: Q1 (Jul-Sep), Q2 (Oct-Dec), Q3 (Jan-Mar), Q4 (Apr-Jun)
- **Inventory Valuation**: Current inventory value separate from period income/expenses

### Member Contribution Types
- **Cash Transactions**: Recorded in main accounting system
- **In-Kind Donations**: Consumable items (food, flowers) - immediate income/expense
- **Physical Items**: Storable items (furniture, equipment) - inventory tracking

## Security Features
- **JWT Authentication**: Secure token-based authentication
- **Role-Based Access**: Different permission levels
- **Input Validation**: Server-side validation for all inputs
- **SQL Injection Protection**: MongoDB with parameterized queries
- **XSS Protection**: Input sanitization and output encoding

## Deployment Configuration
- **Frontend Hosting**: Azure Static Web Apps with automatic GitHub deployment
- **Backend Hosting**: Azure App Service (Node.js) with automatic GitHub deployment
- **Database**: Azure Cosmos DB (MongoDB API) with automatic backups
- **Document Signing**: DocuSeal on Azure App Service (Docker container)
- **Environment Variables**: Secure configuration management via Azure Portal
- **SSL/TLS**: Automatic HTTPS certificates for all services
- **Custom Domains**: Configured for sign.erotc.org
- **Monitoring**: Azure Application Insights for performance monitoring
- **Error Handling**: Comprehensive error logging and user feedback

## Current Azure Architecture
```
┌─────────────────────────────────────────────────────────┐
│                   MICROSOFT AZURE                       │
│                                                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Static Web App (Admin Frontend)                  │  │
│  │  https://lemon-rock-09193a31e.azurestaticapps.net │  │
│  │  - HTML/CSS/JavaScript                            │  │
│  │  - Auto-deploy from GitHub                        │  │
│  └───────────────────────────────────────────────────┘  │
│                          ↓                              │
│  ┌───────────────────────────────────────────────────┐  │
│  │  App Service (Backend API)                        │  │
│  │  https://cms-system-czggf5bjhxgkacat              │  │
│  │         .australiaeast-01.azurewebsites.net       │  │
│  │  - Node.js/Express                                │  │
│  │  - REST API                                       │  │
│  │  - Auto-deploy from GitHub                        │  │
│  └───────────────────────────────────────────────────┘  │
│                          ↓                              │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Cosmos DB (MongoDB API)                          │  │
│  │  stmichael.mongo.cosmos.azure.com                 │  │
│  │  - Members, Accounting, Inventory                 │  │
│  │  - Tasks, Reports, Contributions                  │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │  App Service (DocuSeal)                           │  │
│  │  https://sign.erotc.org                           │  │
│  │  - Ruby on Rails (Docker)                         │  │
│  │  - Document signing                               │  │
│  └───────────────────────────────────────────────────┘  │
│                          ↓                              │
│  ┌───────────────────────────────────────────────────┐  │
│  │  PostgreSQL Database                              │  │
│  │  docuseal.postgres.database.azure.com             │  │
│  │  - DocuSeal data                                  │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## File Structure
```
church-management-system/
├── backend/
│   ├── models/          # Database models
│   ├── routes/          # API endpoints
│   ├── middleware/      # Authentication & validation
│   ├── utils/           # Utility functions
│   │   ├── pdfGenerator.js      # PDF generation for receipts/statements
│   │   ├── qrCodeGenerator.js   # QR code generation utility
│   │   └── emailService.js      # Email functionality
│   └── server.js        # Main server file
├── frontend/
│   ├── js/              # JavaScript modules
│   │   ├── mobile-date-input.js # Mobile-optimized date inputs
│   │   └── [other modules]      # Page controllers and utilities
│   ├── css/             # Stylesheets
│   │   ├── mobile-date-input.css # Mobile date input styling
│   │   └── [other styles]       # Component and page styles
│   ├── pages/           # HTML page templates
│   ├── SYSTEM_DOCUMENTATION.md  # System documentation (this file)
│   ├── FAQ_CHURCH_MANAGEMENT_SYSTEM.md  # User guide
│   └── index.html       # Main application entry
├── README.md            # Project documentation
├── DEPLOYMENT_GUIDE.md  # Deployment instructions
└── netlify.toml         # Deployment configuration
```

## Recent Updates & Fixes

### January 2026 Enhancements
1. **Bank Statement Feature**: Professional bank-style statements with PDF export
2. **QR Code System**: Dynamic QR code generation for members and receipts
3. **Mobile Date Inputs**: Touch-friendly date inputs with auto-formatting
4. **Date Filtering Fix**: Fixed inclusive end date filtering across all endpoints
5. **PDF Enhancements**: Improved PDF generation with church branding

### Technical Improvements
- Enhanced API endpoints with better filtering and sorting
- Mobile-first responsive design improvements
- Zero-storage QR code implementation
- Professional PDF templates with church letterhead
- Comprehensive error handling and validation

## Getting Started
1. **Access System**: Navigate to https://lemon-rock-09193a31e.azurestaticapps.net
2. **Prerequisites**: Modern web browser with JavaScript enabled
3. **Login**: Use provided admin credentials (admin/admin123 for initial setup)
4. **Azure Services**: All services automatically configured and running
5. **Database**: Azure Cosmos DB automatically connected
6. **Monitoring**: Azure Application Insights provides system monitoring
7. **Support**: Contact system administrator for additional access

## Production URLs
- **Admin Panel**: https://lemon-rock-09193a31e.azurestaticapps.net
- **Backend API**: https://cms-system-czggf5bjhxgkacat.australiaeast-01.azurewebsites.net
- **DocuSeal**: https://sign.erotc.org
- **Health Check**: https://cms-system-czggf5bjhxgkacat.australiaeast-01.azurewebsites.net/api/health

## Support & Maintenance
- **User Guide**: See `frontend/FAQ_CHURCH_MANAGEMENT_SYSTEM.md`
- **Deployment**: See `DEPLOYMENT_GUIDE.md`
- **Feature Documentation**: All features documented in this file
- **Issues**: Contact system administrator
- **Updates**: Regular system updates and maintenance

---

**Developed for St. Michael Eritrean Orthodox Tewahedo Church**  
**Perth, Western Australia**  
**ABN: 80 798 549 161**

**Last Updated**: February 2026  
**Version**: 3.0 (Azure Cloud Deployment with Full Integration)  
**Deployment Status**: ✅ Production Ready on Microsoft Azure