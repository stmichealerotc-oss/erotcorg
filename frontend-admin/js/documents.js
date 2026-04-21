/**
 * Church Document Registry
 * Handles listing, creating, updating and file uploads
 */

const Documents = (() => {
  const API = window.API_BASE_URL || 'http://localhost:3001';
  let currentPage = 1;
  let debounceTimer = null;

  // ── Helpers ──────────────────────────────────────────────────────────────

  function authHeaders() {
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  }

  function authToken() {
    return localStorage.getItem('authToken') || sessionStorage.getItem('authToken') || '';
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

  function formatDate(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-AU', { day:'2-digit', month:'short', year:'numeric' });
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
        <tr style="border-bottom:1px solid #f0f0f0;transition:background .15s;" onmouseover="this.style.background='#f8f9fa'" onmouseout="this.style.background=''">
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
              ? `<span style="color:#27ae60;font-size:.8rem;"><i class="fas fa-paperclip"></i> ${doc.files.length} file${doc.files.length > 1 ? 's' : ''}</span>`
              : '<span style="color:#ccc;font-size:.8rem;">none</span>'}
          </td>
          <td style="padding:10px 12px;text-align:center;white-space:nowrap;">
            <button onclick="Documents.openUpload('${doc._id}','${doc.title.replace(/'/g,"\\'")}','${doc.fileNo}')"
              title="Upload file" style="background:#27ae60;color:#fff;border:none;padding:5px 8px;border-radius:4px;cursor:pointer;margin-right:4px;">
              <i class="fas fa-upload"></i>
            </button>
            <button onclick="Documents.openEdit('${doc._id}')"
              title="Edit" style="background:#3498db;color:#fff;border:none;padding:5px 8px;border-radius:4px;cursor:pointer;margin-right:4px;">
              <i class="fas fa-edit"></i>
            </button>
            <button onclick="Documents.archive('${doc._id}','${doc.fileNo}')"
              title="Archive" style="background:#e74c3c;color:#fff;border:none;padding:5px 8px;border-radius:4px;cursor:pointer;">
              <i class="fas fa-archive"></i>
            </button>
          </td>
        </tr>
      `).join('');

      // Pagination
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
    document.getElementById('doc-refno').value = '';
    document.getElementById('doc-fromto').value = '';
    document.getElementById('doc-subject').value = '';
    document.getElementById('doc-notes').value = '';
    document.getElementById('doc-modal-error').style.display = 'none';
    document.getElementById('doc-modal').style.display = 'block';
  }

  async function openEdit(id) {
    try {
      const res  = await fetch(`${API}/api/documents/${id}`, { headers: authHeaders() });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      const d = data.data;

      document.getElementById('doc-edit-id').value = id;
      document.getElementById('doc-modal-title').innerHTML = '<i class="fas fa-edit"></i> Edit Document';
      document.getElementById('doc-title').value   = d.title || '';
      document.getElementById('doc-category').value = d.category || 'outgoing-letter';
      document.getElementById('doc-direction').value = d.direction || 'outgoing';
      document.getElementById('doc-date').value    = d.date ? d.date.split('T')[0] : '';
      document.getElementById('doc-refno').value   = d.refNo || '';
      document.getElementById('doc-fromto').value  = d.fromTo || '';
      document.getElementById('doc-subject').value = d.subject || '';
      document.getElementById('doc-notes').value   = d.notes || '';
      document.getElementById('doc-modal-error').style.display = 'none';
      document.getElementById('doc-modal').style.display = 'block';
    } catch (err) {
      alert('Failed to load document: ' + err.message);
    }
  }

  function closeModal() {
    document.getElementById('doc-modal').style.display = 'none';
  }

  async function save() {
    const id      = document.getElementById('doc-edit-id').value;
    const title   = document.getElementById('doc-title').value.trim();
    const category = document.getElementById('doc-category').value;
    const direction = document.getElementById('doc-direction').value;
    const date    = document.getElementById('doc-date').value;

    const errEl = document.getElementById('doc-modal-error');
    if (!title || !date) {
      errEl.textContent = 'Title and date are required.';
      errEl.style.display = 'block';
      return;
    }

    const body = {
      title,
      category,
      direction,
      date,
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
    document.getElementById('upload-progress').style.display = 'none';
    document.getElementById('upload-error').style.display = 'none';
    document.getElementById('upload-modal').style.display = 'block';
  }

  function closeUpload() {
    document.getElementById('upload-modal').style.display = 'none';
  }

  async function uploadFile() {
    const id       = document.getElementById('upload-doc-id').value;
    const fileType = document.getElementById('upload-type').value;
    const fileInput = document.getElementById('upload-file');
    const errEl    = document.getElementById('upload-error');
    const progEl   = document.getElementById('upload-progress');
    const barEl    = document.getElementById('upload-bar');
    const statusEl = document.getElementById('upload-status');

    if (!fileInput.files[0]) {
      errEl.textContent = 'Please select a file.';
      errEl.style.display = 'block';
      return;
    }

    const formData = new FormData();
    formData.append('file', fileInput.files[0]);
    formData.append('fileType', fileType);

    const btn = document.getElementById('upload-btn');
    btn.disabled = true;
    errEl.style.display = 'none';
    progEl.style.display = 'block';
    barEl.style.width = '30%';
    statusEl.textContent = 'Uploading…';

    try {
      const token = authToken();
      const res = await fetch(`${API}/api/documents/${id}/upload`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      barEl.style.width = '100%';
      statusEl.textContent = `✓ Uploaded: ${data.blobPath}`;
      setTimeout(() => { closeUpload(); load(currentPage); }, 1200);
    } catch (err) {
      errEl.textContent = err.message;
      errEl.style.display = 'block';
      progEl.style.display = 'none';
    } finally {
      btn.disabled = false;
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

  function init() {
    load(1);
  }

  return { init, load, debounceLoad, openNewModal, openEdit, closeModal, save, openUpload, closeUpload, uploadFile, archive };
})();

// Auto-init when loaded as a page fragment
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', Documents.init);
} else {
  Documents.init();
}
