# Church Document Registry — Status

## What's Built ✅

### Backend (`backend/`)

| File | Purpose |
|------|---------|
| `models/ChurchDocument.js` | Document schema — fileNo, refNo, title, category, direction, fromTo, date, status, versioned files array, DocuSeal tracking |
| `models/Counter.js` | Collision-safe sequential file number counter per type/year |
| `utils/blob.js` | Azure Blob Storage — upload files, generate SAS download links, delete |
| `utils/fileNumber.js` | Auto-generates file numbers (STM-2026-OUT-001, STM-2026-MIN-001, etc.) |
| `routes/documents.js` | Full REST API — list, get, create, update, upload, download, send-to-sign, archive |
| `server.js` | Route registered at `/api/documents` |

**API Endpoints:**
```
GET    /api/documents              — list with filters (category, status, year, search)
GET    /api/documents/:id          — single document
POST   /api/documents              — create (auto-generates fileNo)
PUT    /api/documents/:id          — update metadata + status
POST   /api/documents/:id/upload   — upload file(s) to Azure Blob
GET    /api/documents/:id/download — generate SAS link (60 min)
POST   /api/documents/:id/send-to-sign — send final file to DocuSeal
DELETE /api/documents/:id          — archive (soft delete)
```

**File number format:** `STM-{YEAR}-{TYPE}-{SEQ}`
- OUT = Outgoing Letter
- IN  = Incoming Letter
- MIN = Minutes
- CIR = Circular
- REP = Report
- LEG = Legal

### Frontend (`frontend-admin/`)

| File | Purpose |
|------|---------|
| `pages/documents.html` | Full page — filters, table, create/edit modal, upload modal, send-to-sign modal |
| `js/documents.js` | All UI logic — list, CRUD, multi-file upload, download, 3-dot action menu, DocuSeal send |
| `index.html` | Documents nav link added to sidebar |
| `js/main.js` | Documents page registered in router |

**UI Features:**
- Filter by category, status, year, free-text search
- Create document — auto file number generated on save
- Edit document — update title, status, refNo, fromTo, subject, notes
- Status field — draft → final → signed → archived
- Upload up to 5 files per upload (draft / final / signed / attachment)
- View attached files with download button (SAS secure link)
- Send to DocuSeal — final files only, enter signer name + email
- 3-dot action menu per row (Edit, Upload, Archive)

### Azure Storage
- Account: `stmichaeldocs`
- Container: `documents` (private)
- Folder structure: `{year}/{type}/{seq}/{filetype}_v{version}.{ext}`
- Example: `2026/OUT/001/final_v1.pdf`

---

## What's Missing ❌

### 1. Auth Middleware on Documents Route
**Status:** ✅ Done — `authenticateToken` added in `server.js`

### 2. DocuSeal API Token
**Status:** Placeholder in `.env` — `DOCUSEAL_API_TOKEN=your_docuseal_api_token_here`  
**Fix:**
1. Go to `https://sign.erotc.org`
2. Login as admin → Settings → API → Generate token
3. Paste into `.env` and Azure App Service Configuration

### 3. DocuSeal Webhook (Auto-status update)
**Status:** ✅ Done — `webhooks.js` route created, registered at `/api/webhooks/docuseal`  
**What it does:** When signer completes, DocuSeal POSTs → backend downloads signed PDF → saves to Azure Blob as `signed` version → updates document status to `signed`  
**Setup needed:** Register webhook URL in DocuSeal Settings → Webhooks → `https://cms-system-czggf5bjhxgkacat.australiaeast-01.azurewebsites.net/api/webhooks/docuseal`

### 4. Fetch Signed PDF Back from DocuSeal
**Status:** ✅ Done — handled by webhook above

### 5. Production Environment Variables
**Status:** Set locally in `.env` only — not on Azure  
**Fix:** Add these to Azure Portal → App Service → Configuration → Application settings:
```
AZURE_STORAGE_CONNECTION_STRING
AZURE_STORAGE_ACCOUNT_NAME
AZURE_STORAGE_ACCOUNT_KEY
AZURE_STORAGE_CONTAINER=documents
DOCUSEAL_URL=https://sign.erotc.org
DOCUSEAL_API_TOKEN=<from step 2>
```

### 6. Nothing Committed Yet
**Status:** All changes are local only  
**Fix:** Run commit and push after completing auth middleware and env vars

---

## Next Steps (in order)

1. Add `authenticateToken` to documents route in `server.js`
2. Add Azure + DocuSeal env vars to Azure App Service
3. Get DocuSeal API token → test Send to Sign end-to-end
4. Commit and push all changes
5. Build DocuSeal webhook for auto signed-status update
