# Church Document Registry — Status

## What's Built ✅

### Backend (`backend/`)

| File | Purpose |
|------|---------|
| `models/ChurchDocument.js` | Document schema — fileNo, refNo, title, category, direction, fromTo, date, status, versioned files array, DocuSeal tracking |
| `models/Counter.js` | Collision-safe sequential file number counter per type/year |
| `utils/blob.js` | Azure Blob Storage — upload files, generate SAS download links (60 min), delete |
| `utils/fileNumber.js` | Auto-generates file numbers (STM-2026-OUT-001, STM-2026-MIN-001, etc.) |
| `routes/documents.js` | Full REST API — list, get, create, update, upload, download, multi-signer send-to-sign, archive |
| `routes/webhooks.js` | DocuSeal webhook — auto-downloads signed PDF, saves to Azure Blob, updates status to `signed` |
| `server.js` | Documents at `/api/documents` (auth protected), webhooks at `/api/webhooks` (public) |

**API Endpoints:**
```
GET    /api/documents                    — list with filters (category, status, year, search, page)
GET    /api/documents/:id                — single document with files list
POST   /api/documents                    — create (auto-generates fileNo)
PUT    /api/documents/:id                — update metadata + status
POST   /api/documents/:id/upload         — upload 1 file to Azure Blob (multer)
GET    /api/documents/:id/download       — generate 60-min SAS link
POST   /api/documents/:id/send-to-sign   — send to DocuSeal (multi-signer, sequential or parallel)
DELETE /api/documents/:id                — archive (soft delete, status → archived)
POST   /api/webhooks/docuseal            — DocuSeal callback on signing complete
```

**File number format:** `STM-{YEAR}-{TYPE}-{SEQ}`
| Code | Category |
|------|----------|
| OUT | Outgoing Letter |
| IN | Incoming Letter |
| MIN | Minutes |
| CIR | Circular |
| REP | Report |
| LEG | Legal |

**Multi-signer support:**
- Multiple signers per submission (name, email, role)
- Roles: Chairperson, Secretary, Treasurer, President, Witness, Signer
- Sequential signing (1 → 2 → 3, each notified after previous signs)
- Parallel signing (all notified at same time)
- DocuSeal handles date fields automatically on signing page

### Frontend (`frontend-admin/`)

| File | Purpose |
|------|---------|
| `pages/documents.html` | Full page — filters, table, create/edit modal, upload modal, multi-signer send-to-sign modal |
| `js/documents.js` | All UI logic — list, CRUD, multi-file upload (up to 5), download, 3-dot action menu, multi-signer DocuSeal |
| `index.html` | Documents nav link added to sidebar |
| `js/main.js` | Documents page registered in router |

**UI Features:**
- Filter by category, status, year, free-text search
- Create document — auto file number generated on save
- Edit document — update title, status, refNo, fromTo, subject, notes
- Status field — draft → final → signed → archived (editable)
- Upload up to 5 files per upload (draft / final / signed / attachment)
- View attached files with type, version, size, date and Download button (SAS secure link)
- 3-dot action menu per row: Edit/View Files, Upload Files, Send to Sign (final only), Archive
- Send to Sign modal — add multiple signers, set role per signer, choose sequential or parallel order
- Success summary shows signing chain: `Chairperson: Fr. Tesfay → Secretary: Dn. Haile`

### Azure Storage
- Account: `stmichaeldocs`
- Container: `documents` (private, no public access)
- Folder structure: `{year}/{type}/{seq}/{filetype}_v{version}.{ext}`
- Example: `2026/OUT/001/final_v1.pdf`, `2026/OUT/001/signed_v1.pdf`

---

## What's Missing / Still To Do ❌

### 1. DocuSeal API Token
**Status:** Placeholder in `.env` — `DOCUSEAL_API_TOKEN=your_docuseal_api_token_here`
**Fix:**
1. Go to `https://sign.erotc.org`
2. Login as admin → Settings → API → Generate token
3. Paste into `.env` and Azure App Service Configuration

### 2. Register Webhook in DocuSeal
**Status:** Not registered yet — backend endpoint exists but DocuSeal doesn't know about it
**Fix after deploying to Azure:**
1. Go to `https://sign.erotc.org` → Settings → Webhooks → Add
2. URL: `https://cms-system-czggf5bjhxgkacat.australiaeast-01.azurewebsites.net/api/webhooks/docuseal`
3. Event: `submission.completed`
4. Save

### 3. Production Environment Variables
**Status:** Set locally in `.env` only — not on Azure App Service
**Fix:** Add these in Azure Portal → App Service → Configuration → Application settings:
```
AZURE_STORAGE_CONNECTION_STRING   = <from Access Keys>
AZURE_STORAGE_ACCOUNT_NAME        = stmichaeldocs
AZURE_STORAGE_ACCOUNT_KEY         = <from Access Keys>
AZURE_STORAGE_CONTAINER           = documents
DOCUSEAL_URL                      = https://sign.erotc.org
DOCUSEAL_API_TOKEN                = <from step 1>
```

### 4. Nothing Committed Yet
**Status:** All changes are local only
**Commit when ready:**
```bash
git add backend/ frontend-admin/ DOCUMENT_REGISTRY_STATUS.md
git commit -m "Feat: Complete document registry with Azure Blob + multi-signer DocuSeal integration"
git push
```

---

## Next Steps (in order)

1. Get DocuSeal API token from `sign.erotc.org`
2. Add all env vars to Azure App Service Configuration
3. Commit and push
4. Register DocuSeal webhook URL in DocuSeal settings
5. End-to-end test: create → upload final → send to 2 signers → sign → verify webhook auto-updates status + saves signed PDF
