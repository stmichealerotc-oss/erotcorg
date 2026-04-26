/**
 * Church Document Registry
 */

const Documents = (() => {
  const API = (window.Config ? window.Config.getApiBaseUrl().replace(/\/api$/, '') : null)
    || window.API_BASE_URL
    || 'http://localhost:3001';
  let currentPage = 1;
  let debounceTimer = null;

  function authHeaders() {
    const token = authToken();
    return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  }
  function authToken() {
    return window.authSystem?.getToken()
      || localStorage.getItem('authToken') || sessionStorage.getItem('authToken')
      || localStorage.getItem('token') || sessionStorage.getItem('token') || '';
  }

  const CATEGORY_LABELS = {
    'outgoing-letter': '📤 Outgoing Letter',
    'incoming-letter': '📥 Incoming Letter',
    'minutes':         '📋 Minutes',
    'circular':        '📢 Circular',
    'report':          '📊 Report',
    'legal':           '⚖️ Legal',
    'other':           '📄 Other'
  };

  const STATUS_COLORS = {
    draft:    'background:#fff3cd;color:#856404;',
    final:    'background:#d1ecf1;color:#0c5460;',
    signed:   'background:#d4edda;color:#155724;',
    archived: 'background:#e2e3e5;color:#383d41;'
  };

  const FILE_ICONS = {
    'application/pdf': '📄',
    'application/msword': '📝',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '📝',
    'image/jpeg': '🖼️',
    'image/png': '🖼️'
  };

  function formatDate(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function formatBytes(b) {
    if (!b) return '';
    if (b < 1024) return b + ' B';
    if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB';
    return (b / (1024 * 1024)).toFixed(1) + ' MB';
  }

  // ── Load / List ──────────────────────────────────────────────────────────

  async function load(page = 1) {
    currentPage = page;
    const search   = document.getElementById('doc-search')?.value || '';
    const category = document.getElementById('doc-filter-category')?.value || '';
    const status   = document.getElementById('doc-filter-status')?.value || '';
    const year     = document.getElementById('doc-filter-year')?.value || '';

    const params = new URLSearchParams({ page, limit: 20 });
    if (search)   params.set('search', search);
    if (category) params.set('category', category);
    if (status)   params.set('status', status);
    if (year)     params.set('year', year);

    const tbody = document.getElementById('doc-table-body');
    tbody.innerHTML = '<tr><td colspan="8" style="padding:30px;text-align:center;color:#999;"><i class="fas fa-spinner fa-spin"></i> Loading…</td></tr>';

    try {
      const res  = await fetch(`${API}/api/documents?${params}`, { headers: authHeaders() });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      if (data.data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="padding:30px;text-align:center;color:#999;">No documents found</td></tr>';
        document.getElementById('doc-pagination').innerHTML = '';
        return;
      }

      tbody.innerHTML = data.data.map(doc => `
        <tr style="border-bottom:1px solid #f0f0f0;" onmouseover="this.style.background='#f8f9fa'" onmouseout="this.style.background=''">
          <td style="padding:10px 12px;white-space:nowrap;">
            <span style="font-weight:700;color:#2c3e50;font-family:monospace;">${doc.fileNo}</span>
            ${doc.refNo ? `<br><span style="font-size:.75rem;color:#888;">${doc.refNo}</span>` : ''}
          </td>
          <td style="padding:10px 12px;max-width:220px;">
            <div style="font-weight:600;color:#333;">${doc.title}</div>
            ${doc.subject ? `<div style="font-size:.78rem;color:#888;margin-top:2px;">${doc.subject}</div>` : ''}
          </td>
          <td style="padding:10px 12px;white-space:nowrap;">${CATEGORY_LABELS[doc.category] || doc.category}</td>
          <td style="padding:10px 12px;color:#555;">${doc.fromTo || '—'}</td>
          <td style="padding:10px 12px;white-space:nowrap;">${formatDate(doc.date)}</td>
          <td style="padding:10px 12px;">
            <span style="padding:3px 8px;border-radius:12px;font-size:.75rem;font-weight:600;${STATUS_COLORS[doc.status] || ''}">
              ${doc.status}
            </span>
          </td>
          <td style="padding:10px 12px;">
            ${doc.files && doc.files.length > 0
              ? `<span style="color:#27ae60;font-size:.8rem;cursor:pointer;" onclick="Documents.openEdit('${doc._id}')">
                  <i class="fas fa-paperclip"></i> ${doc.files.length} file${doc.files.length > 1 ? 's' : ''}
                </span>`
              : '<span style="color:#ccc;font-size:.8rem;">none</span>'}
          </td>
          <td style="padding:10px 12px;text-align:center;white-space:nowrap;position:relative;">
            <button onclick="Documents.toggleMenu('${doc._id}', event)" style="background:none;border:none;color:#666;font-size:1.1rem;cursor:pointer;padding:4px 8px;border-radius:4px;" onmouseover="this.style.background='#f0f0f0'" onmouseout="this.style.background='none'">
              <i class="fas fa-ellipsis-v"></i>
            </button>
            <div id="menu-${doc._id}" style="display:none;position:absolute;right:10px;top:35px;background:#fff;border:1px solid #ddd;border-radius:6px;box-shadow:0 4px 12px rgba(0,0,0,.15);z-index:100;min-width:170px;" onclick="event.stopPropagation()">
              <button onclick="Documents.openEdit('${doc._id}');Documents.closeAllMenus();"
                style="width:100%;text-align:left;padding:9px 14px;border:none;background:none;cursor:pointer;font-size:.82rem;color:#333;border-bottom:1px solid #f0f0f0;display:flex;align-items:center;gap:8px;"
                onmouseover="this.style.background='#f8f9fa'" onmouseout="this.style.background='none'">
                <i class="fas fa-edit" style="width:14px;color:#3498db;"></i> Edit / View Files
              </button>
              <button onclick="Documents.openUpload('${doc._id}','${doc.title.replace(/'/g,"\\'")}','${doc.fileNo}');Documents.closeAllMenus();"
                style="width:100%;text-align:left;padding:9px 14px;border:none;background:none;cursor:pointer;font-size:.82rem;color:#333;border-bottom:1px solid #f0f0f0;display:flex;align-items:center;gap:8px;"
                onmouseover="this.style.background='#f8f9fa'" onmouseout="this.style.background='none'">
                <i class="fas fa-upload" style="width:14px;color:#27ae60;"></i> Upload Files
              </button>
              ${doc.status === 'final' ? `
              <button onclick="Documents.openSendToSign('${doc._id}', null);Documents.closeAllMenus();"
                style="width:100%;text-align:left;padding:9px 14px;border:none;background:none;cursor:pointer;font-size:.82rem;color:#8e44ad;border-bottom:1px solid #f0f0f0;display:flex;align-items:center;gap:8px;"
                onmouseover="this.style.background='#f5eef8'" onmouseout="this.style.background='none'">
                <i class="fas fa-pen-nib" style="width:14px;"></i> Send to Sign
              </button>` : ''}
              <button onclick="Documents.archive('${doc._id}','${doc.fileNo}');Documents.closeAllMenus();"
                style="width:100%;text-align:left;padding:9px 14px;border:none;background:none;cursor:pointer;font-size:.82rem;color:#e74c3c;display:flex;align-items:center;gap:8px;"
                onmouseover="this.style.background='#fff5f5'" onmouseout="this.style.background='none'">
                <i class="fas fa-archive" style="width:14px;"></i> Archive
              </button>
            </div>
          </td>
        </tr>
      `).join('');

      const pag = document.getElementById('doc-pagination');
      pag.innerHTML = `
        <span>${data.total} document${data.total !== 1 ? 's' : ''} · Page ${data.page} of ${data.pages}</span>
        <div style="display:flex;gap:6px;">
          <button onclick="Documents.load(${page - 1})" ${page <= 1 ? 'disabled' : ''}
            style="padding:4px 10px;border:1px solid #ddd;border-radius:4px;cursor:pointer;${page <= 1 ? 'opacity:.4;' : ''}">← Prev</button>
          <button onclick="Documents.load(${page + 1})" ${page >= data.pages ? 'disabled' : ''}
            style="padding:4px 10px;border:1px solid #ddd;border-radius:4px;cursor:pointer;${page >= data.pages ? 'opacity:.4;' : ''}">Next →</button>
        </div>
      `;
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="8" style="padding:20px;text-align:center;color:#e74c3c;">Error: ${err.message}</td></tr>`;
    }
  }

  function debounceLoad() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => load(1), 350);
  }

  // ── Create / Edit Modal ──────────────────────────────────────────────────

  function openNewModal() {
    document.getElementById('doc-edit-id').value = '';
    document.getElementById('doc-modal-title').innerHTML = '<i class="fas fa-file-alt"></i> New Document';
    document.getElementById('doc-title').value = '';
    document.getElementById('doc-category').value = 'outgoing-letter';
    document.getElementById('doc-direction').value = 'outgoing';
    document.getElementById('doc-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('doc-status').value = 'draft';
    document.getElementById('doc-refno').value = '';
    document.getElementById('doc-fromto').value = '';
    document.getElementById('doc-subject').value = '';
    document.getElementById('doc-notes').value = '';
    document.getElementById('doc-files-section').style.display = 'none';
    document.getElementById('doc-modal-error').style.display = 'none';
    document.getElementById('doc-modal').style.display = 'block';
  }

  async function openEdit(id) {
    try {
      const res  = await fetch(`${API}/api/documents/${id}`, { headers: authHeaders() });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      const d = data.data;

      document.getElementById('doc-edit-id').value  = id;
      document.getElementById('doc-modal-title').innerHTML = '<i class="fas fa-edit"></i> Edit Document';
      document.getElementById('doc-title').value    = d.title || '';
      document.getElementById('doc-category').value = d.category || 'outgoing-letter';
      document.getElementById('doc-direction').value = d.direction || 'outgoing';
      document.getElementById('doc-date').value     = d.date ? d.date.split('T')[0] : '';
      document.getElementById('doc-status').value   = d.status || 'draft';
      document.getElementById('doc-refno').value    = d.refNo || '';
      document.getElementById('doc-fromto').value   = d.fromTo || '';
      document.getElementById('doc-subject').value  = d.subject || '';
      document.getElementById('doc-notes').value    = d.notes || '';
      document.getElementById('doc-modal-error').style.display = 'none';

      // FIX 2: Show attached files list
      renderFilesList(id, d.files || []);

      document.getElementById('doc-modal').style.display = 'block';
    } catch (err) {
      alert('Failed to load document: ' + err.message);
    }
  }

  // FIX 2: Render files list with download buttons
  function renderFilesList(docId, files) {
    const section = document.getElementById('doc-files-section');
    const list    = document.getElementById('doc-files-list');

    if (!files || files.length === 0) {
      section.style.display = 'none';
      return;
    }

    section.style.display = 'block';
    list.innerHTML = files.map((f, i) => `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;${i > 0 ? 'border-top:1px solid #f0f0f0;' : ''}">
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="font-size:1.1rem;">${FILE_ICONS[f.mimeType] || '📎'}</span>
          <div>
            <div style="font-size:.82rem;font-weight:600;color:#333;">${f.originalName || f.blobPath}</div>
            <div style="font-size:.75rem;color:#888;">
              ${f.type} · v${f.version} · ${formatBytes(f.sizeBytes)} · ${formatDate(f.uploadedAt)}
            </div>
          </div>
        </div>
        <div style="display:flex;gap:6px;">
          <button onclick="Documents.downloadFile('${docId}','${f.type}',${f.version})"
            style="background:#3498db;color:#fff;border:none;padding:4px 10px;border-radius:4px;cursor:pointer;font-size:.78rem;white-space:nowrap;">
            <i class="fas fa-download"></i> Download
          </button>
          ${f.type === 'final' ? `
          <button onclick="Documents.openSendToSign('${docId}',${f.version})"
            style="background:#8e44ad;color:#fff;border:none;padding:4px 10px;border-radius:4px;cursor:pointer;font-size:.78rem;white-space:nowrap;">
            <i class="fas fa-pen-nib"></i> Send to Sign
          </button>` : ''}
        </div>
      </div>
    `).join('');
  }

  async function downloadFile(docId, type, version) {
    try {
      const res  = await fetch(`${API}/api/documents/${docId}/download?type=${type}&version=${version}`, { headers: authHeaders() });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      // Open SAS URL in new tab
      window.open(data.url, '_blank');
    } catch (err) {
      alert('Download failed: ' + err.message);
    }
  }

  function closeModal() {
    document.getElementById('doc-modal').style.display = 'none';
  }

  async function save() {
    const id       = document.getElementById('doc-edit-id').value;
    const title    = document.getElementById('doc-title').value.trim();
    const category = document.getElementById('doc-category').value;
    const direction = document.getElementById('doc-direction').value;
    const date     = document.getElementById('doc-date').value;
    const status   = document.getElementById('doc-status').value;

    const errEl = document.getElementById('doc-modal-error');
    if (!title || !date) {
      errEl.textContent = 'Title and date are required.';
      errEl.style.display = 'block';
      return;
    }

    const body = {
      title, category, direction, date, status,
      refNo:   document.getElementById('doc-refno').value.trim(),
      fromTo:  document.getElementById('doc-fromto').value.trim(),
      subject: document.getElementById('doc-subject').value.trim(),
      notes:   document.getElementById('doc-notes').value.trim()
    };

    const btn = document.getElementById('doc-save-btn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving…';

    try {
      const url    = id ? `${API}/api/documents/${id}` : `${API}/api/documents`;
      const method = id ? 'PUT' : 'POST';
      const res    = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(body) });
      const data   = await res.json();
      if (!data.success) throw new Error(data.error);
      closeModal();
      load(currentPage);
    } catch (err) {
      errEl.textContent = err.message;
      errEl.style.display = 'block';
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-save"></i> Save Document';
    }
  }

  // ── Upload Modal ─────────────────────────────────────────────────────────

  function openUpload(id, title, fileNo) {
    document.getElementById('upload-doc-id').value = id;
    document.getElementById('upload-doc-title').textContent = `${fileNo} — ${title}`;
    document.getElementById('upload-type').value = 'draft';
    document.getElementById('upload-file').value = '';
    document.getElementById('upload-file-preview').innerHTML = '';
    document.getElementById('upload-progress').style.display = 'none';
    document.getElementById('upload-error').style.display = 'none';
    document.getElementById('upload-modal').style.display = 'block';
  }

  function closeUpload() {
    document.getElementById('upload-modal').style.display = 'none';
  }

  // FIX 3: Preview selected files before upload
  function previewFiles() {
    const input   = document.getElementById('upload-file');
    const preview = document.getElementById('upload-file-preview');
    const files   = Array.from(input.files);

    if (files.length > 5) {
      document.getElementById('upload-error').textContent = 'Maximum 5 files allowed.';
      document.getElementById('upload-error').style.display = 'block';
      input.value = '';
      preview.innerHTML = '';
      return;
    }

    document.getElementById('upload-error').style.display = 'none';
    preview.innerHTML = files.map(f => `
      <div style="display:flex;align-items:center;gap:6px;padding:4px 0;font-size:.8rem;color:#555;">
        <span>${FILE_ICONS[f.type] || '📎'}</span>
        <span>${f.name}</span>
        <span style="color:#aaa;">(${formatBytes(f.size)})</span>
      </div>
    `).join('');
  }

  // FIX 3: Upload multiple files sequentially
  async function uploadFiles() {
    const id       = document.getElementById('upload-doc-id').value;
    const fileType = document.getElementById('upload-type').value;
    const input    = document.getElementById('upload-file');
    const files    = Array.from(input.files);
    const errEl    = document.getElementById('upload-error');
    const progEl   = document.getElementById('upload-progress');
    const barEl    = document.getElementById('upload-bar');
    const statusEl = document.getElementById('upload-status');

    if (files.length === 0) {
      errEl.textContent = 'Please select at least one file.';
      errEl.style.display = 'block';
      return;
    }

    const btn = document.getElementById('upload-btn');
    btn.disabled = true;
    errEl.style.display = 'none';
    progEl.style.display = 'block';

    let uploaded = 0;
    const errors = [];

    for (const file of files) {
      statusEl.textContent = `Uploading ${file.name} (${uploaded + 1}/${files.length})…`;
      barEl.style.width = `${Math.round((uploaded / files.length) * 100)}%`;

      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('fileType', fileType);

        const token = authToken();
        const res = await fetch(`${API}/api/documents/${id}/upload`, {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: formData
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error);
        uploaded++;
      } catch (err) {
        errors.push(`${file.name}: ${err.message}`);
      }
    }

    barEl.style.width = '100%';

    if (errors.length > 0) {
      errEl.innerHTML = errors.join('<br>');
      errEl.style.display = 'block';
      statusEl.textContent = `${uploaded}/${files.length} uploaded with errors.`;
    } else {
      statusEl.textContent = `✓ ${uploaded} file${uploaded > 1 ? 's' : ''} uploaded successfully`;
      setTimeout(() => { closeUpload(); load(currentPage); }, 1000);
    }

    btn.disabled = false;
  }

  // ── Dropdown menu ────────────────────────────────────────────────────────

  function toggleMenu(id, event) {
    if (event) event.stopPropagation();
    const menu = document.getElementById(`menu-${id}`);
    const isOpen = menu && menu.style.display === 'block';
    closeAllMenus();
    if (menu && !isOpen) menu.style.display = 'block';
  }

  function closeAllMenus() {
    document.querySelectorAll('[id^="menu-"]').forEach(m => m.style.display = 'none');
  }

  // ── Send to DocuSeal (multi-signer) ──────────────────────────────────────

  const SIGNER_ROLES = ['Chairperson', 'Secretary', 'Treasurer', 'President', 'Witness', 'Signer'];
  let _signerCount = 0;

  function openSendToSign(docId, fileVersion) {
    document.getElementById('sign-doc-id').value = docId;
    document.getElementById('sign-file-version').value = fileVersion || '';
    document.getElementById('sign-order').value = 'sequential';
    document.getElementById('sign-template-id').value = '';
    document.getElementById('sign-error').style.display = 'none';
    document.getElementById('sign-success').style.display = 'none';
    _signerCount = 0;
    document.getElementById('sign-signers-list').innerHTML = '';
    addSigner(); // start with one row
    document.getElementById('sign-modal').style.display = 'block';
  }

  function addSigner() {
    _signerCount++;
    const idx  = _signerCount;
    const list = document.getElementById('sign-signers-list');
    const div  = document.createElement('div');
    div.id = `signer-row-${idx}`;
    div.style.cssText = 'border:1px solid #e8e8e8;border-radius:6px;padding:10px 12px;margin-bottom:8px;background:#fafafa;';
    div.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <span style="font-size:.78rem;font-weight:600;color:#8e44ad;">Signer ${idx}</span>
        ${idx > 1 ? `<button type="button" onclick="document.getElementById('signer-row-${idx}').remove()"
          style="background:none;border:none;color:#e74c3c;cursor:pointer;font-size:.8rem;padding:0;">
          <i class="fas fa-times"></i> Remove</button>` : ''}
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;">
        <div>
          <label style="font-size:.75rem;color:#666;display:block;margin-bottom:2px;">Name *</label>
          <input type="text" id="signer-name-${idx}" placeholder="Full name"
            style="width:100%;padding:6px 8px;border:1px solid #ddd;border-radius:4px;font-size:.82rem;box-sizing:border-box;" />
        </div>
        <div>
          <label style="font-size:.75rem;color:#666;display:block;margin-bottom:2px;">Email *</label>
          <input type="email" id="signer-email-${idx}" placeholder="email@example.com"
            style="width:100%;padding:6px 8px;border:1px solid #ddd;border-radius:4px;font-size:.82rem;box-sizing:border-box;" />
        </div>
        <div>
          <label style="font-size:.75rem;color:#666;display:block;margin-bottom:2px;">Role</label>
          <select id="signer-role-${idx}"
            style="width:100%;padding:6px 8px;border:1px solid #ddd;border-radius:4px;font-size:.82rem;">
            ${SIGNER_ROLES.map(r => `<option value="${r}">${r}</option>`).join('')}
          </select>
        </div>
      </div>
    `;
    list.appendChild(div);
  }

  function closeSign() {
    document.getElementById('sign-modal').style.display = 'none';
  }

  async function sendToSign() {
    const docId       = document.getElementById('sign-doc-id').value;
    const fileVersion = document.getElementById('sign-file-version').value;
    const order       = document.getElementById('sign-order').value;
    const errEl       = document.getElementById('sign-error');
    const successEl   = document.getElementById('sign-success');

    // Collect all signer rows
    const rows   = document.querySelectorAll('[id^="signer-row-"]');
    const signers = [];
    for (const row of rows) {
      const idx   = row.id.replace('signer-row-', '');
      const name  = document.getElementById(`signer-name-${idx}`)?.value.trim();
      const email = document.getElementById(`signer-email-${idx}`)?.value.trim();
      const role  = document.getElementById(`signer-role-${idx}`)?.value || 'Signer';
      if (!name || !email) {
        errEl.textContent = `Signer ${idx}: name and email are required.`;
        errEl.style.display = 'block';
        return;
      }
      signers.push({ name, email, role });
    }

    if (signers.length === 0) {
      errEl.textContent = 'Add at least one signer.';
      errEl.style.display = 'block';
      return;
    }

    const btn = document.getElementById('sign-send-btn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending…';
    errEl.style.display = 'none';

    try {
      const res = await fetch(`${API}/api/documents/${docId}/send-to-sign`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          signers,
          order,
          fileVersion: fileVersion ? Number(fileVersion) : undefined
        })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      const signerSummary = signers.map((s, i) =>
        `${order === 'sequential' ? `${i + 1}. ` : ''}${s.role}: ${s.name}`
      ).join(order === 'sequential' ? ' → ' : ', ');

      successEl.innerHTML = `
        ✓ Sent to <strong>${signers.length} signer${signers.length > 1 ? 's' : ''}</strong><br>
        <span style="font-size:.78rem;color:#555;">${signerSummary}</span><br>
        <span style="font-size:.75rem;color:#888;">Submission ID: ${data.submissionId || '—'}</span>
        ${data.signingUrl ? `<br><a href="${data.signingUrl}" target="_blank" style="font-size:.78rem;color:#8e44ad;">Open signing link ↗</a>` : ''}
      `;
      successEl.style.display = 'block';
      setTimeout(() => { closeSign(); load(currentPage); }, 3500);
    } catch (err) {
      errEl.textContent = err.message;
      errEl.style.display = 'block';
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-pen-nib"></i> Send for Signing';
    }
  }

  // ── Archive ──────────────────────────────────────────────────────────────

  async function archive(id, fileNo) {
    if (!confirm(`Archive document ${fileNo}? It will be hidden from active lists.`)) return;
    try {
      const res  = await fetch(`${API}/api/documents/${id}`, { method: 'DELETE', headers: authHeaders() });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      load(currentPage);
    } catch (err) {
      alert('Failed to archive: ' + err.message);
    }
  }

  // ── Init ─────────────────────────────────────────────────────────────────

  function init() { load(1); }

  return { init, load, debounceLoad, openNewModal, openEdit, closeModal, save, openUpload, closeUpload, previewFiles, uploadFiles, downloadFile, openSendToSign, addSigner, closeSign, sendToSign, toggleMenu, closeAllMenus, archive };
})();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', Documents.init);
} else {
  Documents.init();
}

// Close dropdowns when clicking outside
document.addEventListener('click', e => {
  if (!e.target.closest('[id^="menu-"]') && !e.target.closest('.fa-ellipsis-v') && !e.target.closest('button[onclick*="toggleMenu"]')) {
    Documents.closeAllMenus();
  }
});
