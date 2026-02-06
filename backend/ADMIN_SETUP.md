# Admin User Setup Guide

## Problem
The admin user needs to be created in the Cosmos DB database before you can log in to the CMS.

## Solution Options

### Option 1: Run Script via Azure Console (RECOMMENDED)
This is the easiest method since Azure Web App has direct access to Cosmos DB.

1. Go to Azure Portal: https://portal.azure.com
2. Navigate to your Web App: **cms-system**
3. In the left menu, click **Console** (under Development Tools)
4. In the console, run:
   ```bash
   cd site/wwwroot
   node create-admin-azure.js
   ```
5. You should see output confirming the admin user was created
6. Login credentials will be displayed in the console

### Option 2: Run Script via SSH (Alternative)
1. Go to Azure Portal
2. Navigate to **cms-system** Web App
3. Click **SSH** (under Development Tools)
4. In the SSH terminal:
   ```bash
   cd /home/site/wwwroot
   node create-admin-azure.js
   ```

### Option 3: Add to Deployment (One-time)
Add a post-deployment script that runs once:

1. Create a file `.deployment` in backend folder:
   ```
   [config]
   command = deploy.cmd
   ```

2. Create `deploy.cmd`:
   ```cmd
   @echo off
   echo Deploying application...
   
   :: Install dependencies
   call npm install
   
   :: Run admin creation (will skip if admin exists)
   call node create-admin-azure.js
   
   echo Deployment complete
   ```

### Option 4: Temporary API Endpoint (Quick Fix)
Temporarily enable the `/create-admin` endpoint in production:

1. In `backend/server.js`, change this line:
   ```javascript
   if (isDevelopment) {
   ```
   to:
   ```javascript
   if (isDevelopment || process.env.ALLOW_ADMIN_CREATION === 'true') {
   ```

2. Add environment variable in Azure:
   - Go to **Configuration** → **Application settings**
   - Add: `ALLOW_ADMIN_CREATION` = `true`
   - Save and restart

3. Visit: `https://cms-system-czggf5bjhxgkacat.australiaeast-01.azurewebsites.net/create-admin`

4. After admin is created, remove the environment variable

## Login Credentials
After running any of the above methods:

- **Username:** `admin`
- **Password:** `admin123`
- **Email:** `stmichealerotc@gmail.com`
- **Role:** `super-admin`

⚠️ **IMPORTANT:** Change the password immediately after first login!

## Verification
To verify the admin user was created:

1. Try logging in at: https://cms.erotc.org
2. Use credentials: `admin` / `admin123`
3. If successful, you'll be redirected to the dashboard

## Troubleshooting

### "Admin already exists"
- The script has already been run successfully
- Try logging in with the credentials above

### Connection errors
- Check that `MONGODB_URI` is set correctly in Azure App Settings
- Verify Cosmos DB firewall allows Azure services

### Script not found
- Make sure the script was deployed with your backend
- Check the GitHub Actions workflow completed successfully
- Verify files are in `/home/site/wwwroot/` in Azure console
