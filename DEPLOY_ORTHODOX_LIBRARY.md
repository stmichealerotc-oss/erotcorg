# Deploy Orthodox Library to Azure

## Architecture

```
orthodox-library-app (Next.js)
  → Azure Static Web Apps → library.erotc.org
  → calls backend API at cms-system-czggf5bjhxgkacat.australiaeast-01.azurewebsites.net
  → backend reads/writes Azure Cosmos DB (church_db)
```

---

## Step 1: Create Azure Static Web App

### Option A: Azure Portal (easiest)

1. Go to https://portal.azure.com
2. Create resource → Static Web App
3. Fill in:
   ```
   Subscription:    your subscription
   Resource Group:  st-michael-church-rg
   Name:            orthodox-library-app
   Plan:            Free
   Region:          Australia East
   Source:          GitHub
   Organization:    stmichealerotc-oss
   Repository:      erotcorg
   Branch:          main
   Build Preset:    Next.js
   App location:    /st-michael-church/orthodox-library-app
   Output location: .next
   ```
4. Click Review + Create → Create

Azure will automatically add a GitHub Actions workflow file to your repo.

### Option B: Azure CLI

```powershell
az login

az staticwebapp create `
  --name orthodox-library-app `
  --resource-group st-michael-church-rg `
  --source https://github.com/stmichealerotc-oss/erotcorg `
  --location "australiaeast" `
  --branch main `
  --app-location "/st-michael-church/orthodox-library-app" `
  --output-location ".next" `
  --login-with-github
```

---

## Step 2: Set Environment Variables

In Azure Portal → Static Web App → Configuration → Add:

```
NEXT_PUBLIC_API_BASE_URL = https://cms-system-czggf5bjhxgkacat.australiaeast-01.azurewebsites.net
```

Or via CLI (replace YOUR_APP_NAME with actual name):
```powershell
az staticwebapp appsettings set `
  --name orthodox-library-app `
  --resource-group st-michael-church-rg `
  --setting-names NEXT_PUBLIC_API_BASE_URL=https://cms-system-czggf5bjhxgkacat.australiaeast-01.azurewebsites.net
```

---

## Step 3: Add GitHub Secrets

In GitHub → Settings → Secrets → Actions, add:

| Secret Name | Value |
|-------------|-------|
| `AZURE_STATIC_WEB_APPS_API_TOKEN_LIBRARY` | Get from Azure Portal → Static Web App → Manage deployment token |
| `LIBRARY_API_BASE_URL` | `https://cms-system-czggf5bjhxgkacat.australiaeast-01.azurewebsites.net` |

---

## Step 4: Update Backend CORS (already done in code)

The backend `server.js` already includes `https://library.erotc.org`.
After you get the actual Static Web App URL (e.g. `https://xyz.azurestaticapps.net`),
add it to the CORS list in `server.js` and redeploy the backend.

---

## Step 5: Seed the Database (if not done)

```powershell
cd st-michael-church\backend
node scripts/seed-orthodox-library.js
```

This inserts 39 books: 14 Anaphora, 13 Synaxar, 6 Seatat, 6 Bible.

---

## Step 6: Custom Domain (optional)

1. Azure Portal → Static Web App → Custom domains → Add
2. Enter: `library.erotc.org`
3. Add CNAME in your DNS:
   ```
   library  CNAME  YOUR-APP.azurestaticapps.net
   ```
4. Azure auto-provisions SSL (5-10 min)

---

## Verify Deployment

Once deployed, test these URLs:

```
https://library.erotc.org/                    → Homepage
https://library.erotc.org/books               → Books list (all 39)
https://library.erotc.org/register            → Volunteer registration
https://library.erotc.org/volunteer           → Volunteer portal
https://library.erotc.org/login               → Admin login
https://library.erotc.org/admin/tasks         → Task management (admin only)
https://library.erotc.org/admin/volunteers    → Volunteer roster (admin only)
```

---

## Troubleshooting

**Books not loading:**
- Check `NEXT_PUBLIC_API_BASE_URL` is set correctly
- Check backend CORS includes the Static Web App URL
- Check Cosmos DB firewall allows Azure services

**Login fails:**
- Use your existing admin credentials (same as CMS admin panel)
- Backend JWT auth is shared

**Build fails in GitHub Actions:**
- Check Node.js version is 20
- Check `package-lock.json` is committed
- Check `next.config.js` has `output: 'standalone'`

---

## Files Created for Deployment

| File | Purpose |
|------|---------|
| `orthodox-library-app/staticwebapp.config.json` | Azure SWA routing config |
| `orthodox-library-app/next.config.js` | Next.js with standalone output |
| `.github/workflows/deploy-orthodox-library.yml` | CI/CD pipeline |
| `backend/server.js` | CORS updated with library.erotc.org |
