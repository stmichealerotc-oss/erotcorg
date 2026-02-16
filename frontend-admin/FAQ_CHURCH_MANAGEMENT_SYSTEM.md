# Church Management System - Complete FAQ Guide

Last Updated: February 16, 2026

## Table of Contents
1. [System Overview](#system-overview)
2. [Getting Started](#getting-started)
3. [User Management & Authentication](#user-management--authentication)
4. [Members Management](#members-management)
5. [Accounting & Financial Management](#accounting--financial-management)
6. [Inventory Management](#inventory-management)
7. [Reports & Analytics](#reports--analytics)
8. [Task Management](#task-management)
9. [Data Collection & Auto-Generation](#data-collection--auto-generation)
10. [Troubleshooting](#troubleshooting)

---

## System Overview

### What is the Church Management System?
The Church Management System is a comprehensive web-based application designed specifically for **ST. MICHAEL ERITREAN ORTHODOX TEWAHEDO CHURCH** in Perth, Western Australia (ABN: 80 798 549 161). It manages members, finances, inventory, reports, and administrative tasks.

### Key Features
- **Member Management**: Complete member profiles, contact information, and membership tracking
- **Financial Management**: Donations, tithes, offerings, expenses, and financial reporting
- **Inventory System**: Track church assets, equipment, and supplies
- **Australian Financial Year Reports**: Quarterly reports following Australian FY (July-June)
- **Task Management**: Assign and track church administrative tasks
- **User Management**: Role-based access control for different user types
- **Automated Reports**: Generate PDF reports and email receipts automatically

### System Architecture
- **Frontend**: HTML, CSS, JavaScript (Azure Static Web Apps)
- **Backend**: Node.js with Express.js (Azure App Service)
- **Database**: Azure Cosmos DB (MongoDB API)
- **Authentication**: JWT-based secure authentication
- **Email**: Automated email notifications and receipts
- **Document Signing**: DocuSeal on Azure App Service (Docker)

### Current Deployment URLs
- **Admin Panel**: https://lemon-rock-09193a31e.azurestaticapps.net
- **Backend API**: https://cms-system-czggf5bjhxgkacat.australiaeast-01.azurewebsites.net
- **DocuSeal**: https://sign.erotc.org
- **Database**: stmichael.mongo.cosmos.azure.com (Azure Cosmos DB)

---

## Getting Started

### How do I access the system?
1. Open your web browser
2. Navigate to: **https://lemon-rock-09193a31e.azurestaticapps.net**
3. You'll see the login page with the church header

### System URLs
- **Admin Panel**: https://lemon-rock-09193a31e.azurestaticapps.net
- **Backend API**: https://cms-system-czggf5bjhxgkacat.australiaeast-01.azurewebsites.net
- **DocuSeal (Document Signing)**: https://sign.erotc.org

### First Time Setup
**For System Administrators:**
1. The system comes with a default admin account
2. Login with admin credentials (provided during setup)
3. Immediately change the default password
4. Create additional user accounts as needed

### User Roles Explained
- **Super Admin**: Full system access, can manage all users and settings
- **Admin**: Can manage members, finances, and generate reports
- **Committee Member**: Can view reports and manage specific areas
- **Member**: Limited access to view their own information

---

## User Management & Authentication

### How do I create a new user account?
**For Admins:**
1. Login to the system
2. Navigate to "User Management" from the main menu
3. Click "Add New User"
4. Fill in required information:
   - Username (unique)
   - Email address
   - Full name
   - Role (Super Admin, Admin, Committee, Member)
   - Initial password
5. Click "Create User"
6. The new user will receive an email verification link

### How does email verification work?
1. When a new account is created, an email is sent to the user
2. User clicks the verification link in the email
3. Account becomes active and user can login
4. Verification links expire after 24 hours for security

### How do I reset a forgotten password?
1. On the login page, click "Forgot Password?"
2. Enter your email address
3. Check your email for a reset link
4. Click the link and enter a new password
5. The reset link expires after 1 hour

### How do I change my password?
1. Login to your account
2. Go to your profile settings
3. Click "Change Password"
4. Enter current password and new password
5. Confirm the change

---

## Members Management

### How do I add a new member?
1. Navigate to "Members" section
2. Click "Add New Member"
3. Fill in member information:
   - **Personal Details**: Name, date of birth, gender
   - **Contact Information**: Phone, email, address
   - **Membership Details**: Join date, membership type, status
   - **Emergency Contact**: Name and phone number
4. Upload a profile photo (optional)
5. Click "Save Member"

### What information is collected for each member?
- **Basic Information**: Full name, date of birth, gender, marital status
- **Contact Details**: Phone numbers, email, physical address
- **Membership Information**: Join date, membership type, current status
- **Emergency Contact**: Name and phone number for emergencies
- **Profile Photo**: Optional member photo
- **Notes**: Additional information or special notes

### How do I update member information?
1. Go to "Members" section
2. Find the member using search or browse the list
3. Click on the member's name or "Edit" button
4. Update the required information
5. Click "Save Changes"
6. Changes are automatically logged with timestamp

### How do I search for members?
- **Quick Search**: Use the search box to find by name, phone, or email
- **Filter Options**: Filter by membership status, join date, or other criteria
- **Bulk Actions**: Select multiple members for bulk operations

### How do I generate member ID cards?
1. Select the member from the members list
2. Click "Generate ID Card"
3. The system creates a business-card-sized ID with:
   - Member photo
   - Name and membership number
   - Church information
   - Contact details
4. Print or save as PDF

---

## Accounting & Financial Management

### How does the financial system work?
The system tracks all church finances including:
- **Income**: Tithes, offerings, donations, special collections
- **Expenses**: Operational costs, utilities, supplies, salaries
- **Promises**: Member pledges and commitments
- **Categories**: Organized by type (tithe, offering, building fund, etc.)

### How do I record a donation/tithe?
1. Go to "Accounting" section
2. Click "Add Transaction"
3. Select transaction type: "Income"
4. Fill in details:
   - **Member**: Select from dropdown (or "Anonymous")
   - **Amount**: Enter the amount
   - **Category**: Tithe, Offering, Donation, Building Fund, etc.
   - **Payment Method**: Cash, Check, Card, Online Transfer
   - **Date**: Transaction date
   - **Description**: Optional notes
5. Click "Save Transaction"

### How do I record an expense?
1. Go to "Accounting" section
2. Click "Add Transaction"
3. Select transaction type: "Expense"
4. Fill in details:
   - **Category**: Utilities, Supplies, Maintenance, Salaries, etc.
   - **Amount**: Enter the expense amount
   - **Vendor/Payee**: Who was paid
   - **Payment Method**: How it was paid
   - **Date**: Expense date
   - **Description**: What the expense was for
   - **Receipt**: Upload receipt image (optional)
5. Click "Save Transaction"

### What are Promises and how do they work?
**Promises** are member commitments or pledges:
1. **Creating a Promise**:
   - Go to Accounting → Promises
   - Click "Add New Promise"
   - Select member and enter promised amount
   - Set due date and category
   - Add description/notes
2. **Fulfilling a Promise**:
   - When member pays, click "Fulfill" on the promise
   - Enter actual amount paid and payment method
   - System automatically creates a transaction record
3. **Tracking**:
   - View overdue promises
   - Send reminder notifications
   - Generate promise reports

### How do I generate and send receipts?
**Automatic Receipt Generation:**
1. When recording a transaction, check "Send Receipt"
2. System automatically:
   - Generates a PDF receipt with church letterhead
   - Includes transaction details and member information
   - Emails the receipt to the member
   - Stores a copy in the system

**Manual Receipt Generation:**
1. Find the transaction in the accounting list
2. Click "Generate Receipt"
3. Choose to email or download PDF

### How do I view financial summaries?
The Dashboard provides real-time financial overview:
- **Total Income**: Current month/year income
- **Total Expenses**: Current month/year expenses
- **Net Balance**: Income minus expenses
- **Category Breakdown**: Income by category (tithes, offerings, etc.)
- **Recent Transactions**: Latest financial activities
- **Pending Promises**: Outstanding member commitments

---

## Inventory Management

### How do I add items to inventory?
1. Navigate to "Inventory" section
2. Click "Add New Item"
3. Fill in item details:
   - **Item Name**: Descriptive name
   - **Category**: Equipment, Supplies, Furniture, etc.
   - **Quantity**: Current stock count
   - **Unit Price**: Cost per item
   - **Location**: Where item is stored
   - **Condition**: New, Good, Fair, Poor
   - **Purchase Date**: When acquired
   - **Supplier**: Where purchased from
   - **Notes**: Additional information
4. Upload photos (optional)
5. Click "Save Item"

### How do I track inventory usage?
1. **Check Out Items**:
   - Find item in inventory list
   - Click "Check Out"
   - Enter quantity and who is taking it
   - Add purpose/reason
   - Set expected return date

2. **Check In Items**:
   - Find the checked-out item
   - Click "Check In"
   - Verify quantity returned
   - Note any damage or issues

### How do I update inventory quantities?
1. **Manual Update**:
   - Find item in inventory
   - Click "Edit"
   - Update quantity
   - Add reason for change in notes

2. **Bulk Update**:
   - Use "Import CSV" feature
   - Upload spreadsheet with updated quantities
   - System processes changes automatically

### What reports are available for inventory?
- **Current Stock Report**: All items with current quantities
- **Low Stock Alert**: Items below minimum threshold
- **Usage Report**: Items checked out/in over time period
- **Value Report**: Total inventory value by category
- **Maintenance Schedule**: Items requiring regular maintenance

---

## Reports & Analytics

### What is the Australian Financial Year system?
The system follows Australian Financial Year (July 1 - June 30):
- **Q1**: July - September
- **Q2**: October - December  
- **Q3**: January - March
- **Q4**: April - June

### How do I generate quarterly reports?
1. Go to "Reports" section
2. Click "Generate Report"
3. Select report type: "Quarterly Financial Report"
4. Choose:
   - **Financial Year**: e.g., 2025-2026
   - **Quarter**: Q1, Q2, Q3, or Q4
5. Click "Generate"
6. System creates comprehensive report with:
   - Income and expense breakdown
   - Cumulative quarterly progression
   - Asset calculations
   - Monthly overview charts
   - Notes and comments section

### What information is included in quarterly reports?
**Financial Summary:**
- Total income by category
- Total expenses by category
- Net income/loss for the quarter
- Cumulative year-to-date figures

**Cash Flow Analysis:**
- Opening balance
- Income received
- Expenses paid
- Closing balance
- Quarter-over-quarter comparison

**Asset Calculation:**
- Previous quarter balance
- Current quarter income
- Current quarter expenses
- Current quarter net balance
- Step-by-step progression showing how each quarter builds on previous

**Visual Analytics:**
- Monthly income/expense charts
- Category breakdown pie charts
- Trend analysis graphs

### How do overdue quarters work?
- System automatically identifies overdue quarters
- If current date is in Q3, then Q1 and Q2 show as "OVERDUE"
- Overdue reports display with red background and pulsing animation
- Administrators receive notifications about overdue reporting

### How do I view and print reports?
1. **Generated Reports List**:
   - Shows all reports in ACNC-style compact format
   - Columns: Report Name | Due Date | Submitted Date | Action
2. **View Report**:
   - Click "View" to open report in overlay
   - Full report displays with church header
   - Includes all sections: financials, charts, notes
3. **Print Report**:
   - Click "Print" button in report overlay
   - System prints only report content (not page elements)
   - Optimized for A4 paper format

### How do I export reports to PDF?
1. Open the report you want to export
2. Click "Download PDF" button
3. System generates professional PDF with:
   - Church letterhead and information
   - Complete financial data
   - Charts and graphs
   - Proper formatting for official use

---

## Task Management

### How do I create and assign tasks?
1. Navigate to "Tasks" section
2. Click "Add New Task"
3. Fill in task details:
   - **Title**: Brief description of task
   - **Description**: Detailed instructions
   - **Assigned To**: Select user from dropdown
   - **Priority**: High, Medium, Low
   - **Due Date**: When task should be completed
   - **Category**: Administrative, Maintenance, Event, etc.
4. Click "Create Task"
5. Assigned user receives email notification

### How do I track task progress?
**Task Statuses:**
- **Pending**: Not yet started
- **In Progress**: Currently being worked on
- **Completed**: Finished successfully
- **Cancelled**: No longer needed

**Updating Tasks:**
1. Find task in task list
2. Click "Update Status"
3. Change status and add progress notes
4. System logs all status changes with timestamps

### How do I view my assigned tasks?
1. Login to your account
2. Dashboard shows "My Tasks" section with:
   - Tasks assigned to you
   - Current status of each task
   - Due dates and priorities
   - Quick action buttons

### What notifications do I receive for tasks?
- **New Task Assignment**: Email when task is assigned to you
- **Due Date Reminders**: Automatic reminders before due date
- **Status Updates**: Notifications when task status changes
- **Overdue Alerts**: Notifications for overdue tasks

---

## Data Collection & Auto-Generation

### How does automatic data collection work?
The system automatically collects and processes:

**Member Data:**
- Tracks member activity and engagement
- Records attendance patterns
- Monitors contribution history
- Updates member statistics in real-time

**Financial Data:**
- Calculates running totals automatically
- Updates category summaries instantly
- Generates trend analysis
- Tracks budget vs. actual spending

**Inventory Data:**
- Monitors stock levels continuously
- Tracks usage patterns
- Calculates inventory turnover
- Identifies reorder points

### What gets auto-generated?
**Financial Reports:**
- Monthly financial summaries
- Quarterly Australian FY reports
- Annual financial statements
- Tax-ready documentation

**Member Reports:**
- Membership statistics
- Contribution summaries
- Attendance reports
- Member directory updates

**Administrative Reports:**
- Task completion rates
- System usage statistics
- Data backup confirmations
- Security audit logs

### How does the system ensure data accuracy?
**Validation Rules:**
- Required field validation
- Data type checking (numbers, dates, emails)
- Range validation (positive amounts, valid dates)
- Duplicate detection and prevention

**Audit Trail:**
- All changes are logged with user and timestamp
- Previous values are stored for reference
- System tracks who made what changes when
- Regular data integrity checks

**Backup and Recovery:**
- Automatic daily backups
- Point-in-time recovery capability
- Data export functionality
- Disaster recovery procedures

### How do I import existing data?
**CSV Import Process:**
1. **Prepare Data**: Format existing data in CSV files
2. **Use Templates**: Download CSV templates from system
3. **Import Process**:
   - Go to relevant section (Members, Accounting, etc.)
   - Click "Import CSV"
   - Upload your CSV file
   - Map columns to system fields
   - Preview import data
   - Confirm and process import
4. **Validation**: System validates all imported data
5. **Error Handling**: Any errors are reported for correction

**Supported Import Types:**
- Member information and contact details
- Historical financial transactions
- Inventory items and quantities
- User accounts and permissions

---

## Azure Cloud Deployment

### How is the system hosted?
The entire church management system runs on **Microsoft Azure** cloud platform:

**Azure Services Used:**
- **Azure Static Web Apps**: Hosts the admin frontend interface
- **Azure App Service**: Runs the Node.js backend API
- **Azure Cosmos DB**: MongoDB-compatible database for all church data
- **Azure App Service (Docker)**: Hosts DocuSeal document signing system
- **Azure PostgreSQL**: Database for DocuSeal

### What are the benefits of Azure hosting?
- **99.9% Uptime**: Enterprise-grade reliability
- **Automatic Scaling**: Handles traffic spikes automatically
- **Global Access**: Fast access from anywhere in the world
- **Automatic Backups**: Daily backups with point-in-time recovery
- **Security**: Enterprise-level security and compliance
- **Automatic Updates**: System updates deployed automatically from GitHub

### How do deployments work?
**Automatic Deployment Process:**
1. Code changes are pushed to GitHub repository
2. GitHub Actions automatically builds and tests the code
3. If tests pass, code is automatically deployed to Azure
4. Both frontend and backend update simultaneously
5. Zero downtime deployment ensures system stays online

### How do I monitor system health?
**Azure Portal Monitoring:**
1. Go to: https://portal.azure.com
2. Navigate to your Azure resources
3. View real-time metrics, logs, and alerts
4. Monitor performance, errors, and usage

**Health Check Endpoints:**
- Backend API: https://cms-system-czggf5bjhxgkacat.australiaeast-01.azurewebsites.net/api/health
- Frontend: https://lemon-rock-09193a31e.azurestaticapps.net (should load login page)
- DocuSeal: https://sign.erotc.org (should load DocuSeal interface)

### What about data backup and recovery?
**Automatic Backups:**
- **Cosmos DB**: Automatic backups every 4 hours, 30-day retention
- **PostgreSQL**: Daily backups, 7-day retention
- **Point-in-time Recovery**: Can restore to any point in the last 30 days

**Manual Backup Options:**
- Export data through the admin interface
- Download reports and member data as CSV/PDF
- Contact administrator for full database exports

---

## Troubleshooting

### Common Login Issues

**Q: I can't remember my password**
A: Use the "Forgot Password" link on login page. Enter your email and check for reset instructions.

**Q: My account is locked**
A: Contact your system administrator. Accounts lock after multiple failed login attempts for security.

**Q: Email verification link expired**
A: Contact administrator to resend verification email or manually activate your account.

### Financial Transaction Issues

**Q: I entered the wrong amount for a transaction**
A: Find the transaction in the accounting list, click "Edit", correct the amount, and save changes.

**Q: Receipt email wasn't sent**
A: Check the member's email address is correct. You can regenerate and resend receipts from the transaction list.

**Q: Categories are missing or incorrect**
A: Administrators can add/edit categories in the system settings under "Financial Categories".

### Report Generation Issues

**Q: Report shows "undefined" values**
A: This usually indicates missing data. Ensure all required financial data is entered for the reporting period.

**Q: PDF generation fails**
A: Try refreshing the page and generating again. For persistent issues, contact technical support.

**Q: Charts not displaying**
A: Ensure your browser supports JavaScript and isn't blocking chart libraries. Try a different browser.

### Member Management Issues

**Q: Can't find a member in search**
A: Check spelling, try partial names, or browse the full member list. Member might be marked as inactive.

**Q: Member photo won't upload**
A: Ensure image is in JPG, PNG, or GIF format and under 5MB in size.

**Q: Duplicate members appearing**
A: Use the member merge function or contact administrator to resolve duplicates.

### Azure-Specific Issues

**Q: The admin panel won't load**
A: Check Azure Static Web Apps status:
1. Go to: https://portal.azure.com
2. Navigate to: Static Web Apps → lemon-rock-09193a31e
3. Check deployment status and logs
4. If needed, trigger redeployment from GitHub Actions

**Q: Backend API is not responding**
A: Check Azure App Service status:
1. Go to: https://portal.azure.com  
2. Navigate to: App Services → cms-system
3. Check if service is running
4. View logs in "Log stream" section
5. Restart service if needed

**Q: Database connection errors**
A: Check Azure Cosmos DB status:
1. Go to: https://portal.azure.com
2. Navigate to: Azure Cosmos DB → stmichael
3. Check connection strings and firewall settings
4. Verify database is not paused or throttled

**Q: DocuSeal document signing not working**
A: Check DocuSeal App Service:
1. Go to: https://portal.azure.com
2. Navigate to: App Services → stmichael-sign
3. Check container status and logs
4. Verify PostgreSQL database connection

### System Performance Issues

**Q: System is running slowly**
A: Clear your browser cache, ensure stable internet connection, or try during off-peak hours.

**Q: Pages won't load**
A: Check internet connection, try refreshing the page, or contact technical support if persistent.

### Data Export/Import Issues

**Q: CSV import fails**
A: Check CSV format matches template, ensure all required fields are included, and verify data types are correct.

**Q: Export file is empty**
A: Ensure you have data in the selected date range and proper permissions to export.

### Mobile Access Issues

**Q: System doesn't work on mobile**
A: The system is optimized for mobile. Ensure you're using an updated browser and have stable internet.

**Q: Buttons are too small on mobile**
A: The interface automatically adjusts for mobile. Try rotating your device or zooming in.

### Getting Additional Help

**Technical Support:**
- Check this FAQ first for common solutions
- Contact your system administrator
- Document any error messages exactly
- Note what you were doing when the issue occurred

**Training and Documentation:**
- This FAQ covers most common scenarios
- Additional training materials available from administrator
- System includes built-in help tooltips and guides

**Feature Requests:**
- Submit suggestions through your administrator
- Include detailed description of desired functionality
- Explain how it would benefit church operations

---

## System Maintenance

### Regular Maintenance Tasks
**Daily:**
- Backup verification
- System health checks
- Email delivery monitoring

**Weekly:**
- Data integrity checks
- Performance monitoring
- Security log review

**Monthly:**
- User account review
- Storage space monitoring
- System updates and patches

**Quarterly:**
- Full system backup test
- Security audit
- Performance optimization

### Best Practices for Users
1. **Regular Backups**: Export important data regularly
2. **Strong Passwords**: Use complex passwords and change them periodically
3. **Data Accuracy**: Double-check entries before saving
4. **Regular Updates**: Keep your browser updated for best performance
5. **Security**: Log out when finished, especially on shared computers

---

*This FAQ is maintained by the Church Management System administrators. For additional questions or technical support, please contact your system administrator.*

**ST. MICHAEL ERITREAN ORTHODOX TEWAHEDO CHURCH**  
Perth, Western Australia  
ABN: 80 798 549 161

**System Version**: 3.0 (Azure Cloud Deployment)  
**Last Updated**: February 2026  
**Deployment Status**: ✅ Production Ready on Microsoft Azure