/**
 * Church Certificates Module
 */
const Certificates = (() => {
  const API = (window.Config ? window.Config.getApiBaseUrl().replace(/\/api$/, '') : null)
    || 'http://localhost:3001';

  let currentPage = 1;
  let debounceTimer = null;

  function authHeaders() {
    const token = window.authSystem?.getToken()
      || localStorage.getItem('authToken') || sessionStorage.getItem('authToken')
      || localStorage.getItem('token') || sessionStorage.getItem('token') || '';
    return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  }

  const TYPE_LABELS = {
    baptism:    '✝ Baptism',
    marriage:   '💍 Marriage',
    membership: '🏛 Membership',
    chrismation:'🕊 Chrismation',
    death:      '🕯 Memorial',
    other:      '📄 Other'
  };

  function formatDate(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function memberName(m) {
    if (!m) return '—';
    return `${m.firstName || ''} ${m.lastName || ''}`.trim() || '—';
  }

  // ── Load / List ──────────────────────────────────────────────────────────

  async function load(page = 1) {
    currentPage = page;
    const search = document.getElementById('cert-search')?.value || '';
    const type   = document.getElementById('cert-filter-type')?.value || '';
    const status = document.getElementById('cert-filter-status')?.value || '';
    const year   = document.getElementById('cert-filter-year')?.value || '';

    const params = new URLSearchParams({ page, limit: 20 });
    if (type)   params.set('type', type);
    if (status) params.set('status', status);
    if (year)   params.set('year', year);

    const tbody = document.getElementById('cert-table-body');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="7" style="padding:30px;text-align:center;color:#999;"><i class="fas fa-spinner fa-spin"></i> Loading…</td></tr>';

    try {
      const res  = await fetch(`${API}/api/certificates?${params}`, { headers: authHeaders() });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      if (!data.data.length) {
        tbody.innerHTML = '<tr><td colspan="7" style="padding:30px;text-align:center;color:#999;">No certificates found</td></tr>';
        document.getElementById('cert-pagination').innerHTML = '';
        return;
      }

      // Client-side search filter
      let rows = data.data;
      if (search) {
        const q = search.toLowerCase();
        rows = rows.filter(c =>
          (c.certificateNumber || '').toLowerCase().includes(q) ||
          memberName(c.primaryMember).toLowerCase().includes(q) ||
          memberName(c.secondaryMember).toLowerCase().includes(q)
        );
      }

      tbody.innerHTML = rows.map(c => `
        <tr style="border-bottom:1px solid #f0f0f0;" onmouseover="this.style.background='#f8f9fa'" onmouseout="this.style.background=''">
          <td style="padding:10px 12px;white-space:nowrap;font-weight:700;color:#2c3e50;font-family:monospace;">${c.certificateNumber || '—'}</td>
          <td style="padding:10px 12px;"><span class="cert-type-badge">${TYPE_LABELS[c.type] || c.type}</span></td>
          <td style="padding:10px 12px;">
            <div style="font-weight:600;">${memberName(c.primaryMember)}</div>
            ${c.secondaryMember ? `<div style="font-size:.78rem;color:#888;">&amp; ${memberName(c.secondaryMember)}</div>` : ''}
          </td>
          <td style="padding:10px 12px;white-space:nowrap;">${formatDate(c.eventDate)}</td>
          <td style="padding:10px 12px;color:#555;">${c.officiant || '—'}</td>
          <td style="padding:10px 12px;"><span class="cert-badge ${c.status}">${c.status}</span></td>
          <td style="padding:10px 12px;text-align:center;">
            <div style="display:flex;gap:6px;justify-content:center;flex-wrap:wrap;">
              <button onclick="Certificates.openEdit('${c._id}')" class="btn btn-secondary" style="padding:4px 10px;font-size:.78rem;">
                <i class="fas fa-edit"></i>
              </button>
              <button onclick="Certificates.downloadPDF('${c._id}', '${c.certificateNumber}')" class="btn btn-primary" style="padding:4px 10px;font-size:.78rem;" title="Download PDF">
                <i class="fas fa-file-pdf"></i>
              </button>
              <button onclick="Certificates.sign('${c._id}')" class="btn" style="padding:4px 10px;font-size:.78rem;background:#8e44ad;color:#fff;border-color:#8e44ad;" title="Add Signature">
                <i class="fas fa-pen-nib"></i>
              </button>
              <button onclick="Certificates.deleteCert('${c._id}')" class="btn" style="padding:4px 10px;font-size:.78rem;background:#dc3545;color:#fff;border-color:#dc3545;" title="Delete">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </td>
        </tr>
      `).join('');

      // Pagination
      const pages = data.pages || 1;
      const pag = document.getElementById('cert-pagination');
      if (pag) {
        pag.innerHTML = `
          <span>${data.total} certificate${data.total !== 1 ? 's' : ''}</span>
          <div style="display:flex;gap:6px;">
            ${page > 1 ? `<button onclick="Certificates.load(${page - 1})" class="btn btn-secondary" style="padding:4px 10px;font-size:.78rem;">‹ Prev</button>` : ''}
            <span style="padding:4px 8px;">Page ${page} of ${pages}</span>
            ${page < pages ? `<button onclick="Certificates.load(${page + 1})" class="btn btn-secondary" style="padding:4px 10px;font-size:.78rem;">Next ›</button>` : ''}
          </div>`;
      }
    } catch (err) {
      if (tbody) tbody.innerHTML = `<tr><td colspan="7" style="padding:20px;text-align:center;color:#dc3545;">Error: ${err.message}</td></tr>`;
    }
  }

  function debounceLoad() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => load(1), 350);
  }

  // ── Modal ────────────────────────────────────────────────────────────────

  function openNew() {
    document.getElementById('cert-edit-id').value = '';
    document.getElementById('cert-modal-title').innerHTML = '<i class="fas fa-certificate"></i> New Certificate';
    document.getElementById('cert-type').value = '';
    document.getElementById('cert-member-search').value = '';
    document.getElementById('cert-primary-member-id').value = '';
    document.getElementById('cert-member2-search').value = '';
    document.getElementById('cert-secondary-member-id').value = '';
    document.getElementById('cert-event-date').value = '';
    document.getElementById('cert-officiant').value = '';
    document.getElementById('cert-godparents').value = '';
    document.getElementById('cert-witnesses').value = '';
    document.getElementById('cert-notes').value = '';
    document.getElementById('cert-fee').value = '0';
    document.getElementById('cert-modal-error').style.display = 'none';
    document.getElementById('cert-secondary-member-row').style.display = 'none';
    document.getElementById('cert-godparents-row').style.display = 'none';
    document.getElementById('cert-modal').style.display = 'flex';
  }

  async function openEdit(id) {
    try {
      const res  = await fetch(`${API}/api/certificates/${id}`, { headers: authHeaders() });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      const c = data.data;

      document.getElementById('cert-edit-id').value = c._id;
      document.getElementById('cert-modal-title').innerHTML = '<i class="fas fa-edit"></i> Edit Certificate';
      document.getElementById('cert-type').value = c.type || '';
      document.getElementById('cert-member-search').value = memberName(c.primaryMember);
      document.getElementById('cert-primary-member-id').value = c.primaryMember?._id || '';
      document.getElementById('cert-member2-search').value = c.secondaryMember ? memberName(c.secondaryMember) : '';
      document.getElementById('cert-secondary-member-id').value = c.secondaryMember?._id || '';
      document.getElementById('cert-event-date').value = c.eventDate ? c.eventDate.substring(0, 10) : '';
      document.getElementById('cert-officiant').value = c.officiant || '';
      document.getElementById('cert-godparents').value = (c.godparents || []).join(', ');
      document.getElementById('cert-witnesses').value = (c.witnesses || []).join(', ');
      document.getElementById('cert-notes').value = c.notes || '';
      document.getElementById('cert-fee').value = c.fee || 0;
      document.getElementById('cert-modal-error').style.display = 'none';
      onTypeChange();
      document.getElementById('cert-modal').style.display = 'flex';
    } catch (err) {
      alert('Error loading certificate: ' + err.message);
    }
  }

  function closeModal() {
    document.getElementById('cert-modal').style.display = 'none';
    document.getElementById('cert-member-results').style.display = 'none';
    document.getElementById('cert-member2-results').style.display = 'none';
  }

  function onTypeChange() {
    const type = document.getElementById('cert-type').value;
    document.getElementById('cert-secondary-member-row').style.display = type === 'marriage' ? '' : 'none';
    document.getElementById('cert-godparents-row').style.display = type === 'baptism' ? '' : 'none';
  }

  // ── Member search ────────────────────────────────────────────────────────

  async function searchMember(query, which) {
    const resultsId = which === 'primary' ? 'cert-member-results' : 'cert-member2-results';
    const hiddenId  = which === 'primary' ? 'cert-primary-member-id' : 'cert-secondary-member-id';
    const results   = document.getElementById(resultsId);
    if (!results) return;

    if (query.length < 2) { results.style.display = 'none'; return; }

    try {
      const res  = await fetch(`${API}/api/members?search=${encodeURIComponent(query)}&limit=10`, { headers: authHeaders() });
      const data = await res.json();
      const list = data.list || data.members || data.data || [];

      if (!list.length) { results.style.display = 'none'; return; }

      results.innerHTML = list.map(m => `
        <div onclick="Certificates.selectMember('${m._id}', '${m.firstName} ${m.lastName || ''}', '${which}')"
          style="padding:8px 12px;cursor:pointer;border-bottom:1px solid #eee;font-size:.85rem;"
          onmouseover="this.style.background='#f5f5f5'" onmouseout="this.style.background=''">
          <strong>${m.firstName} ${m.lastName || ''}</strong>
          <span style="color:#888;font-size:.78rem;margin-left:6px;">${m.memberNumber || ''}</span>
        </div>`).join('');
      results.style.display = 'block';
    } catch (e) {
      results.style.display = 'none';
    }
  }

  function selectMember(id, name, which) {
    const searchId  = which === 'primary' ? 'cert-member-search'  : 'cert-member2-search';
    const hiddenId  = which === 'primary' ? 'cert-primary-member-id' : 'cert-secondary-member-id';
    const resultsId = which === 'primary' ? 'cert-member-results' : 'cert-member2-results';
    document.getElementById(searchId).value  = name;
    document.getElementById(hiddenId).value  = id;
    document.getElementById(resultsId).style.display = 'none';
  }

  // ── Save ─────────────────────────────────────────────────────────────────

  async function save() {
    const errEl = document.getElementById('cert-modal-error');
    errEl.style.display = 'none';

    const type          = document.getElementById('cert-type').value;
    const primaryMember = document.getElementById('cert-primary-member-id').value;
    const eventDate     = document.getElementById('cert-event-date').value;

    if (!type)          { errEl.textContent = 'Please select a certificate type.'; errEl.style.display = ''; return; }
    if (!primaryMember) { errEl.textContent = 'Please select a primary member.';   errEl.style.display = ''; return; }
    if (!eventDate)     { errEl.textContent = 'Please enter the event date.';       errEl.style.display = ''; return; }

    const body = {
      type, primaryMember, eventDate,
      secondaryMember: document.getElementById('cert-secondary-member-id').value || undefined,
      officiant:  document.getElementById('cert-officiant').value.trim(),
      godparents: document.getElementById('cert-godparents').value.split(',').map(s => s.trim()).filter(Boolean),
      witnesses:  document.getElementById('cert-witnesses').value.split(',').map(s => s.trim()).filter(Boolean),
      notes:      document.getElementById('cert-notes').value.trim(),
      fee:        parseFloat(document.getElementById('cert-fee').value) || 0
    };

    const editId = document.getElementById('cert-edit-id').value;
    const btn    = document.getElementById('cert-save-btn');
    btn.disabled = true; btn.textContent = 'Saving…';

    try {
      const url    = editId ? `${API}/api/certificates/${editId}` : `${API}/api/certificates`;
      const method = editId ? 'PUT' : 'POST';
      const res    = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(body) });
      const data   = await res.json();
      if (!data.success) throw new Error(data.error);

      closeModal();
      load(currentPage);
    } catch (err) {
      errEl.textContent = err.message;
      errEl.style.display = '';
    } finally {
      btn.disabled = false; btn.innerHTML = '<i class="fas fa-save"></i> Save Certificate';
    }
  }

  // ── Actions ──────────────────────────────────────────────────────────────

  async function downloadPDF(id, certNo) {
    const token = window.authSystem?.getToken() || localStorage.getItem('authToken') || localStorage.getItem('token') || '';
    const url   = `${API}/api/certificates/${id}/pdf`;
    try {
      const res  = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('PDF generation failed');
      const blob = await res.blob();
      const a    = document.createElement('a');
      a.href     = URL.createObjectURL(blob);
      a.download = `${certNo || 'certificate'}.pdf`;
      a.click();
      URL.revokeObjectURL(a.href);
      load(currentPage); // refresh status
    } catch (err) {
      alert('Error downloading PDF: ' + err.message);
    }
  }

  async function sign(id) {
    const title = prompt('Enter your title for this signature (e.g. Pastor, Secretary):');
    if (!title) return;
    try {
      const res  = await fetch(`${API}/api/certificates/${id}/sign`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ title })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      load(currentPage);
    } catch (err) {
      alert('Error signing: ' + err.message);
    }
  }

  async function deleteCert(id) {
    if (!confirm('Delete this certificate? This cannot be undone.')) return;
    try {
      const res  = await fetch(`${API}/api/certificates/${id}`, { method: 'DELETE', headers: authHeaders() });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      load(currentPage);
    } catch (err) {
      alert('Error deleting: ' + err.message);
    }
  }

  // ── Init ─────────────────────────────────────────────────────────────────

  function init() {
    load(1);
    // Close dropdowns on outside click
    document.addEventListener('click', e => {
      if (!e.target.closest('#cert-member-search'))  document.getElementById('cert-member-results')?.style && (document.getElementById('cert-member-results').style.display = 'none');
      if (!e.target.closest('#cert-member2-search')) document.getElementById('cert-member2-results')?.style && (document.getElementById('cert-member2-results').style.display = 'none');
    });
  }

  return { init, load, debounceLoad, openNew, openEdit, closeModal, onTypeChange, searchMember, selectMember, save, downloadPDF, sign, deleteCert };
})();

window.loadCertificates = function () {
  Certificates.init();
};
