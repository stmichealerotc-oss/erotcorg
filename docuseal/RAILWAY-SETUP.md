# 🚂 Railway Production Setup Guide

## 🎯 Quick Setup Steps

### 1. Install Railway CLI
```bash
npm install -g @railway/cli
```

### 2. Login to Railway
```bash
railway login
```

### 3. Set Environment Variables

#### Option A: Using Railway CLI
```bash
# Core settings
railway variables set SECRET_KEY_BASE="694DA0AC71E16D520ED1236FCA067E937EDBC71858ACAB3704A58B717A118B347E996A318D2B311E4CFABE3675416D5DB426FD067275102305CD345AEE94C4CF"
railway variables set RAILS_ENV="production"

# Email settings (WORKING CONFIGURATION)
railway variables set SMTP_ADDRESS="smtp.gmail.com"
railway variables set SMTP_PORT="587"
railway variables set SMTP_USERNAME="debesay304@gmail.com"
railway variables set SMTP_PASSWORD="cssv xkcd opqa qymf"
railway variables set SMTP_FROM="debesay304@gmail.com"
railway variables set SMTP_DOMAIN="your-app-name.railway.app"
railway variables set SMTP_AUTHENTICATION="login"
railway variables set SMTP_ENABLE_STARTTLS_AUTO="true"
railway variables set SMTP_OPENSSL_VERIFY_MODE="peer"

# Security
railway variables set FORCE_SSL="true"
```

#### Option B: Railway Dashboard
1. Go to your Railway project dashboard
2. Click on "Variables" tab
3. Add each variable manually

### 4. Deploy
```bash
railway up
```

### 5. Update Domain
After deployment, update SMTP_DOMAIN:
```bash
railway variables set SMTP_DOMAIN="your-actual-domain.railway.app"
```

## 📋 Environment Variables Checklist

Copy these exact values (they're tested and working):

- [ ] `SECRET_KEY_BASE=694DA0AC71E16D520ED1236FCA067E937EDBC71858ACAB3704A58B717A118B347E996A318D2B311E4CFABE3675416D5DB426FD067275102305CD345AEE94C4CF`
- [ ] `RAILS_ENV=production`
- [ ] `SMTP_ADDRESS=smtp.gmail.com`
- [ ] `SMTP_PORT=587`
- [ ] `SMTP_USERNAME=debesay304@gmail.com`
- [ ] `SMTP_PASSWORD=cssv xkcd opqa qymf`
- [ ] `SMTP_FROM=debesay304@gmail.com`
- [ ] `SMTP_DOMAIN=your-app-name.railway.app` (update after deployment)
- [ ] `SMTP_AUTHENTICATION=login`
- [ ] `SMTP_ENABLE_STARTTLS_AUTO=true`
- [ ] `SMTP_OPENSSL_VERIFY_MODE=peer`
- [ ] `FORCE_SSL=true`

## 🧪 Testing Production

After deployment:
1. Visit your Railway app URL
2. Create admin account
3. Upload a test document
4. Send it for signature
5. Check email delivery

## 🆘 Troubleshooting

### Common Issues:
- **Email not working**: Double-check SMTP_USERNAME (not SMTP_USER_NAME)
- **SSL errors**: Railway provides HTTPS automatically
- **Database issues**: Railway handles PostgreSQL automatically

### Check Logs:
```bash
railway logs
```

## 🎉 Ready to Deploy!

Run the deployment script:
```bash
.\deploy-to-railway.ps1
```

Or deploy manually:
```bash
railway up
```