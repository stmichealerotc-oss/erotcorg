# DocuSeal First-Time Setup Guide

## 🚀 Initial Access

1. **Open DocuSeal**: http://localhost:3001

## 📝 First-Time Account Creation

When you first access DocuSeal, you'll need to create an admin account:

### Option 1: Sign Up (If Registration is Open)
1. Look for "Sign Up" or "Create Account" button
2. Fill in:
   - **Name**: Your full name
   - **Email**: Your email address (use debesay304@gmail.com to match SMTP config)
   - **Password**: Choose a secure password
3. Click "Create Account"

### Option 2: Admin Setup (If No Users Exist)
DocuSeal may automatically prompt for admin setup:
1. **Admin Email**: debesay304@gmail.com
2. **Admin Password**: Choose a secure password
3. **Confirm Password**: Re-enter password
4. Click "Create Admin Account"

### Option 3: Environment Variable Setup
If the above doesn't work, we can set admin credentials via environment variables:

```env
ADMIN_EMAIL=debesay304@gmail.com
ADMIN_PASSWORD=your_secure_password
```

## 🔧 If You Can't Access Setup

Let me check the current user situation and help you get in:

### Check Current Users
```cmd
docker exec docuseal rails console -e production
```

Then in Rails console:
```ruby
User.count
User.first
```

### Create Admin User Manually
If needed, I can help create an admin user via Rails console.

## 📧 Email Configuration Test

Once logged in:
1. Go to **Settings** or **Configuration**
2. Look for **Email/SMTP Settings**
3. Verify the configuration matches our setup
4. Send a test email if available

## 🎯 What to Expect

After successful login:
- Dashboard with templates and documents
- Settings/Configuration menu
- Upload/Create document options
- User management (if admin)

## 🆘 Need Help?

If you encounter any issues:
1. Check the logs (I'm monitoring them)
2. Try refreshing the page
3. Clear browser cache/cookies
4. Let me know what you see on screen

## 📱 Current Status
- ✅ DocuSeal running at http://localhost:3001
- ✅ Email configured: debesay304@gmail.com
- ✅ Logs being monitored
- ✅ Ready for first-time setup

Go ahead and access http://localhost:3001 - tell me what you see!