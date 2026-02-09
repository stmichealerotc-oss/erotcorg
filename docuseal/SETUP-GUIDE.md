# DocuSeal Email Setup Guide

## 🎯 Current Status
✅ **DocuSeal is RUNNING**
- **URL**: http://localhost:3001
- **Container**: docuseal (Up 2 minutes)
- **Email**: Configured with Gmail SMTP

## 📧 Email Configuration
```
SMTP Server: smtp.gmail.com:587 (STARTTLS)
Email: debesay304@gmail.com
App Password: cssv xkcd opqa qymf
Authentication: login
SSL Verification: peer (secure)
```

## 🚀 Testing Steps

### 1. Access DocuSeal
Open your browser and go to: **http://localhost:3001**

### 2. First Time Setup
- Create an admin account if prompted
- Or sign in if you already have an account

### 3. Test Email Delivery
1. **Create a New Document**:
   - Click "New Template" or "Upload Document"
   - Upload a PDF or create a simple document

2. **Add Signature Fields**:
   - Add signature fields where needed
   - Add text fields if required

3. **Send for Signature**:
   - Click "Send" or "Submit"
   - Add a recipient email address (use a real email you can check)
   - Add your name and message
   - Click "Send Document"

### 4. Monitor Email Delivery
The logs are being monitored in real-time. When you send a document, you should see:
- SMTP connection attempts
- Email delivery status
- Any error messages

## 🔧 Troubleshooting

### If Email Fails:
1. **Check Gmail App Password**:
   - Make sure 2FA is enabled on Gmail
   - Generate a new app password if needed
   - Replace in .env file: `SMTP_PASSWORD=your_new_app_password`

2. **Restart Container**:
   ```cmd
   docker compose down
   docker compose up -d
   ```

3. **Check Logs**:
   ```cmd
   docker logs docuseal -f
   ```

### Common Issues:
- **535 Authentication Failed**: Wrong app password
- **Connection Timeout**: Network/firewall issues
- **SSL Errors**: Certificate verification problems

## 📝 Current Configuration Files

### .env
```
SMTP_ADDRESS=smtp.gmail.com
SMTP_PORT=587
SMTP_USER_NAME=debesay304@gmail.com
SMTP_PASSWORD=cssv xkcd opqa qymf
SMTP_FROM=debesay304@gmail.com
SMTP_DOMAIN=localhost
SMTP_AUTHENTICATION=login
SMTP_ENABLE_STARTTLS_AUTO=true
SMTP_OPENSSL_VERIFY_MODE=peer
```

## 🎉 Ready to Test!
Everything is configured and ready. Go to http://localhost:3001 and try sending a document!