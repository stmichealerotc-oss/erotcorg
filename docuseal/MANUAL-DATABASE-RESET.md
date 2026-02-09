# 🔧 Manual Database Reset Guide

## ❌ **Automated Reset Failed**

The automated database reset didn't work. Here are manual options to completely reset the database:

## 🎯 **Option 1: Railway Dashboard (Recommended)**

### **Step 1: Access Railway Dashboard**
1. Go to https://railway.app/dashboard
2. Login with your account
3. Select your "docuseal-app" project

### **Step 2: Delete PostgreSQL Database**
1. Find the **PostgreSQL** service in your project
2. Click on the PostgreSQL service
3. Go to **Settings** tab
4. Scroll down to **Danger Zone**
5. Click **Delete Service**
6. Confirm deletion

### **Step 3: Create New PostgreSQL Database**
1. In your project dashboard, click **+ New Service**
2. Select **Database** → **PostgreSQL**
3. Wait for the new database to be created
4. Railway will automatically connect it to your app

### **Step 4: Redeploy Application**
1. Go to your main application service (Churchdoc)
2. Click **Deploy** → **Redeploy**
3. Wait for deployment to complete

## 🎯 **Option 2: Create New Railway Project**

### **Step 1: Create New Project**
1. Go to Railway dashboard
2. Click **New Project**
3. Connect your GitHub repository (Debesay7/Docuseal)
4. Select the main branch

### **Step 2: Add Database Services**
1. Add **PostgreSQL** database
2. Add **Redis** for background jobs
3. Railway will auto-configure the connections

### **Step 3: Set Environment Variables**
Copy all your SMTP variables to the new project:
```
SMTP_ADDRESS=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=debesay304@gmail.com
SMTP_PASSWORD=cssv xkcd opqa qymf
SMTP_FROM=debesay304@gmail.com
SMTP_DOMAIN=your-new-domain.railway.app
SMTP_AUTHENTICATION=login
SMTP_ENABLE_STARTTLS_AUTO=true
SMTP_OPENSSL_VERIFY_MODE=none
RAILS_ENV=production
FORCE_SSL=true
```

## 🎯 **Option 3: Database Console Access**

### **Connect to PostgreSQL:**
1. In Railway dashboard, go to PostgreSQL service
2. Click **Connect** tab
3. Copy the connection command
4. Use a PostgreSQL client to connect
5. Run: `DROP SCHEMA public CASCADE; CREATE SCHEMA public;`

## ✅ **After Database Reset**

Once you've reset the database:

### **Step 1: Verify Clean Start**
1. Go to your Railway app URL
2. You should see fresh DocuSeal (no existing accounts)

### **Step 2: Create New Admin**
1. Click "Sign Up" or "Create Account"
2. Create your admin account
3. This will be the first and only user

### **Step 3: Test Email**
1. Create a document
2. Send it for signature
3. Verify email delivery works

## 🚨 **Current Status**

Your current Railway deployment has:
- ✅ Working email configuration
- ✅ All SMTP variables set correctly
- ❌ Old database data still present
- ❌ Automated reset failed

## 💡 **Recommendation**

**Option 1 (Railway Dashboard)** is the easiest and most reliable method. It will give you a completely fresh database while keeping all your email configuration intact.

After the database reset, your DocuSeal will be completely clean and ready for a fresh admin signup! 🚀