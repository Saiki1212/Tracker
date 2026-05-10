pages.applications = (function () {
  const STATUSES = ['Wishlist', 'Applied', 'OA', 'Interviewing', 'Rejected', 'Offer'];
  let mode = 'board';

  return {
    name: 'applications',
    title: 'Applications',

    renderActions() {
      const wrap = document.createElement('div');
      wrap.className = 'row gap-2';
      wrap.innerHTML = `
        <div class="row gap-2" style="border:1px solid var(--border);border-radius:var(--radius-sm);padding:2px">
          <button class="btn btn-sm btn-ghost ${mode === 'board' ? 'active' : ''}" data-mode="board" title="Board">${h.ic.grid}</button>
          <button class="btn btn-sm btn-ghost ${mode === 'table' ? 'active' : ''}" data-mode="table" title="Table">${h.ic.list}</button>
        </div>
        <button class="btn btn-primary btn-sm" id="newAppBtn">${h.ic.plus} New</button>
      `;
      wrap.querySelectorAll('[data-mode]').forEach((b) => {
        b.addEventListener('click', () => {
          mode = b.dataset.mode;
          router.render();
        });
      });
      wrap.querySelector('#newAppBtn').addEventListener('click', () => openAppModal());
      return wrap;
    },

    async render(view) {
      view.innerHTML = `<div id="appsRoot">${loading()}</div>`;
    },

    async afterRender() {
      const root = document.getElementById('appsRoot');
      try {
        const [{ items: apps }, companies, resumes] = await Promise.all([
          api.get('/applications'),
          api.get('/companies').then((r) => r.items),
          api.get('/resumes').then((r) => r.items),
        ]);
        // stash for modals
        store.set('apps', apps, 60_000);
        store.set('companies', companies, 60_000);
        store.set('resumes', resumes, 60_000);

        // mobile auto switches table/cards
        if (mode === 'board' && window.innerWidth <= 640) {
          renderBoardMobile(root, apps);
        } else if (mode === 'board') {
          renderBoard(root, apps);
        } else {
          renderTable(root, apps);
        }
      } catch (e) {
        root.innerHTML = h.emptyState('Failed to load', e.message);
      }
    },
  };

  function loading() {
    return `<div class="empty"><div class="loader" style="margin:0 auto"></div></div>`;
  }

  function renderBoard(root, apps) {
    const grouped = Object.fromEntries(STATUSES.map((s) => [s, []]));
    apps.forEach((a) => grouped[a.status]?.push(a));
    root.innerHTML = `
      <div class="kanban">
        ${STATUSES.map((s) => `
          <div class="kanban-col" data-status="${s}">
            <div class="kanban-col-header">
              <div class="row gap-2">${h.status(s)}</div>
              <span class="kanban-col-count">${grouped[s].length}</span>
            </div>
            <div class="kanban-list" data-status="${s}">
              ${grouped[s].map(cardHtml).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    `;
    bindBoard(root);
  }

  function renderBoardMobile(root, apps) {
    const grouped = Object.fromEntries(STATUSES.map((s) => [s, []]));
    apps.forEach((a) => grouped[a.status]?.push(a));
    let active = 'Applied';
    const draw = () => {
      root.innerHTML = `
        <div class="kanban-mobile-toolbar" style="display:flex">
          ${STATUSES.map((s) => `<button class="kanban-status-chip ${s === active ? 'active' : ''}" data-s="${s}">${s} <span class="muted">(${grouped[s].length})</span></button>`).join('')}
        </div>
        <div class="col gap-3">
          ${grouped[active].length ? grouped[active].map(cardHtml).join('') : h.emptyState('Empty column', 'No applications in ' + active)}
        </div>
      `;
      root.querySelectorAll('[data-s]').forEach((b) => {
        b.addEventListener('click', () => { active = b.dataset.s; draw(); });
      });
      bindBoard(root);
    };
    draw();
  }

  function cardHtml(a) {
    const company = a.companyId?.name || a.companyName || '—';
    const resume = a.resumeId?.version ? `<span class="chip chip-mono">${h.escape(a.resumeId.version)}</span>` : '';
    const days = a.appliedAt ? h.fmtRelDays(a.appliedAt) : '';
    const fav = a.companyId?.domain ? `<img src="${h.favicon(a.companyId.domain)}" alt="" style="width:14px;height:14px;border-radius:3px"/>` : '';
    return `
      <div class="kanban-card" data-id="${a._id}">
        <div class="kanban-card-title">${h.escape(a.role)}</div>
        <div class="row gap-2 muted" style="font-size:12px;margin-bottom:6px">
          ${fav}<span>${h.escape(company)}</span>
        </div>
        <div class="kanban-card-meta">
          ${resume}
          ${days ? `<span class="chip">${days}</span>` : ''}
          ${a.salaryMin ? `<span class="chip chip-mono">${(a.salaryMin/100000).toFixed(1)}L+</span>` : ''}
        </div>
      </div>
    `;
  }

  function bindBoard(root) {
    // Click → open detail
    root.querySelectorAll('.kanban-card').forEach((c) => {
      c.addEventListener('click', () => openDetail(c.dataset.id));
    });
    // Drag-drop
    kanban.bind(root, {
      onMove: async (id, status) => {
        try {
          await api.patch(`/applications/${id}`, { status });
          toast.ok('Status updated');
          store.invalidate('apps');
          router.render();
        } catch (e) { toast.bad(e.message); }
      },
    });
  }

  function renderTable(root, apps) {
    if (!apps.length) {
      root.innerHTML = h.emptyState('No applications yet', 'Click + New to add your first.');
      return;
    }
    root.innerHTML = `
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>Company</th><th>Role</th><th>Status</th><th>Applied</th><th>Resume</th><th>Follow-up</th><th></th>
            </tr>
          </thead>
          <tbody>
            ${apps.map((a) => `
              <tr class="hoverable" data-id="${a._id}">
                <td data-label="Company">${h.escape(a.companyId?.name || a.companyName || '—')}</td>
                <td data-label="Role">${h.escape(a.role)}</td>
                <td data-label="Status">${h.status(a.status)}</td>
                <td data-label="Applied" class="muted">${h.fmtDate(a.appliedAt)}</td>
                <td data-label="Resume">${a.resumeId?.version ? `<span class="chip chip-mono">${h.escape(a.resumeId.version)}</span>` : '—'}</td>
                <td data-label="Follow-up" class="muted">${h.fmtDate(a.nextFollowUpAt)}</td>
                <td data-label=""><button class="btn btn-ghost btn-sm" data-edit="${a._id}">${h.ic.edit}</button></td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
    `;
    root.querySelectorAll('tr.hoverable').forEach((tr) => {
      tr.addEventListener('click', (e) => {
        if (e.target.closest('[data-edit]')) {
          e.stopPropagation();
          openAppModal(apps.find((a) => a._id === tr.dataset.id));
          return;
        }
        openDetail(tr.dataset.id);
      });
    });
  }

  // ============ Detail Drawer ============
  async function openDetail(id) {
    let drawer = document.getElementById('appDrawer');
    if (!drawer) {
      drawer = document.createElement('div');
      drawer.id = 'appDrawer';
      document.body.insertAdjacentHTML('beforeend', `
        <div class="drawer-backdrop" id="appDrawerBackdrop"></div>
        <aside class="drawer" id="appDrawer">
          <div class="drawer-header">
            <div class="drawer-title" id="appDrawerTitle"></div>
            <button class="btn btn-ghost btn-icon" id="appDrawerClose">${h.ic.x}</button>
          </div>
          <div class="drawer-body" id="appDrawerBody"></div>
        </aside>
      `);
      const close = () => {
        document.getElementById('appDrawer').classList.remove('open');
        document.getElementById('appDrawerBackdrop').classList.remove('open');
      };
      document.getElementById('appDrawerClose').onclick = close;
      document.getElementById('appDrawerBackdrop').onclick = close;
    }
    document.getElementById('appDrawer').classList.add('open');
    document.getElementById('appDrawerBackdrop').classList.add('open');
    document.getElementById('appDrawerBody').innerHTML = loading();
    document.getElementById('appDrawerTitle').textContent = 'Application';

    try {
      const [{ item: app }, { items: interviews }] = await Promise.all([
        api.get(`/applications/${id}`),
        api.get(`/applications/${id}/interviews`),
      ]);
      const company = app.companyId?.name || app.companyName || '—';
      document.getElementById('appDrawerTitle').textContent = `${app.role} · ${company}`;
      document.getElementById('appDrawerBody').innerHTML = `
        <div class="col gap-4">
          <div class="row gap-2">${h.status(app.status)} ${app.resumeId?.version ? `<span class="chip chip-mono">${h.escape(app.resumeId.version)}</span>` : ''}</div>
          <div class="grid grid-2">
            <div><div class="muted" style="font-size:11px;text-transform:uppercase">Source</div><div>${h.escape(app.source || '—')}</div></div>
            <div><div class="muted" style="font-size:11px;text-transform:uppercase">Recruiter</div><div>${h.escape(app.recruiterName || '—')}</div></div>
            <div><div class="muted" style="font-size:11px;text-transform:uppercase">Applied</div><div>${h.fmtDate(app.appliedAt)}</div></div>
            <div><div class="muted" style="font-size:11px;text-transform:uppercase">Next follow-up</div><div>${h.fmtDate(app.nextFollowUpAt)}</div></div>
            ${app.salaryMin || app.salaryMax ? `<div><div class="muted" style="font-size:11px;text-transform:uppercase">Salary</div><div class="mono">${app.salaryMin ?? '?'} – ${app.salaryMax ?? '?'} ${h.escape(app.salaryCurrency || '')}</div></div>` : ''}
            ${app.jdUrl ? `<div><div class="muted" style="font-size:11px;text-transform:uppercase">JD</div><a href="${h.escape(app.jdUrl)}" target="_blank" rel="noopener">Open ${h.ic.external}</a></div>` : ''}
          </div>
          ${app.notes ? `<div><div class="muted" style="font-size:11px;text-transform:uppercase;margin-bottom:4px">Notes</div><div style="white-space:pre-wrap">${h.escape(app.notes)}</div></div>` : ''}
          ${app.status === 'Rejected' ? `
            <div class="card compact">
              <div class="muted" style="font-size:11px;text-transform:uppercase;margin-bottom:4px">Rejection</div>
              <div>${h.escape(app.rejectionReason || '—')}</div>
              <div class="row gap-2" style="margin-top:6px">${(app.rejectionTags || []).map((t) => h.chip(t)).join('')}</div>
            </div>` : ''}

          <div>
            <div class="row-between" style="margin-bottom:8px">
              <strong>Interview rounds</strong>
              <button class="btn btn-sm" id="addRoundBtn">${h.ic.plus} Round</button>
            </div>
            ${interviews.length ? interviews.map((i) => `
              <div class="card compact" style="margin-bottom:8px">
                <div class="row-between">
                  <div><strong>${h.escape(i.roundType)}</strong> · <span class="muted">${h.fmtDate(i.scheduledAt)}</span></div>
                  <span class="chip ${i.outcome === 'passed' ? 'chip-accent' : ''}">${i.outcome}</span>
                </div>
                ${i.weakConcepts?.length ? `<div class="row gap-2" style="margin-top:6px;flex-wrap:wrap">${i.weakConcepts.map((c) => h.chip(c)).join('')}</div>` : ''}
              </div>`).join('') : `<div class="muted" style="font-size:13px">No interviews yet.</div>`}
          </div>

          <div class="row gap-2">
            <button class="btn" id="editAppBtn">${h.ic.edit} Edit</button>
            <button class="btn btn-danger" id="delAppBtn">${h.ic.trash} Delete</button>
          </div>
        </div>
      `;
      document.getElementById('editAppBtn').onclick = () => openAppModal(app);
      document.getElementById('delAppBtn').onclick = async () => {
        if (!await modal.confirm('Delete this application?', { danger: true, okLabel: 'Delete' })) return;
        await api.del(`/applications/${id}`);
        toast.ok('Deleted');
        document.getElementById('appDrawer').classList.remove('open');
        document.getElementById('appDrawerBackdrop').classList.remove('open');
        store.invalidate('apps');
        router.render();
      };
      document.getElementById('addRoundBtn').onclick = () => pages.interviews.openModal({ applicationId: id });
    } catch (e) {
      document.getElementById('appDrawerBody').innerHTML = h.emptyState('Failed', e.message);
    }
  }

  // ============ Create / Edit Modal ============
  function openAppModal(app) {
    const isEdit = !!app;
    const a = app || {};
    const companies = store.get('companies') || [];
    const resumes = store.get('resumes') || [];

    const body = document.createElement('div');
    body.innerHTML = `
      <div class="field">
        <label>Company</label>
        <select class="select" name="companyId">
          <option value="">— Select —</option>
          ${companies.map((c) => `<option value="${c._id}" ${c._id === (a.companyId?._id || a.companyId) ? 'selected' : ''}>${h.escape(c.name)}</option>`).join('')}
        </select>
      </div>
      <div class="field">
        <label>or company name</label>
        <input class="input" name="companyName" value="${h.escape(a.companyName || '')}" placeholder="If not in the list above">
      </div>
      <div class="field">
        <label>Role *</label>
        <input class="input" name="role" required value="${h.escape(a.role || '')}">
      </div>
      <div class="field-row">
        <div class="field"><label>Status</label>
          <select class="select" name="status">
            ${STATUSES.map((s) => `<option ${s === (a.status || 'Wishlist') ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
        </div>
        <div class="field"><label>Resume</label>
          <select class="select" name="resumeId">
            <option value="">—</option>
            ${resumes.map((r) => `<option value="${r._id}" ${r._id === (a.resumeId?._id || a.resumeId) ? 'selected' : ''}>${h.escape(r.version)} ${r.targetRole ? '· ' + h.escape(r.targetRole) : ''}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="field-row">
        <div class="field"><label>Applied date</label>
          <input class="input" type="date" name="appliedAt" value="${a.appliedAt ? new Date(a.appliedAt).toISOString().slice(0, 10) : ''}">
        </div>
        <div class="field"><label>Next follow-up</label>
          <input class="input" type="date" name="nextFollowUpAt" value="${a.nextFollowUpAt ? new Date(a.nextFollowUpAt).toISOString().slice(0, 10) : ''}">
        </div>
      </div>
      <div class="field-row">
        <div class="field"><label>Salary min (LPA → enter raw, e.g. 1500000)</label>
          <input class="input" type="number" name="salaryMin" value="${a.salaryMin ?? ''}">
        </div>
        <div class="field"><label>Salary max</label>
          <input class="input" type="number" name="salaryMax" value="${a.salaryMax ?? ''}">
        </div>
      </div>
      <div class="field-row">
        <div class="field"><label>Source</label>
          <input class="input" name="source" value="${h.escape(a.source || '')}" placeholder="LinkedIn, referral, …">
        </div>
        <div class="field"><label>Recruiter</label>
          <input class="input" name="recruiterName" value="${h.escape(a.recruiterName || '')}">
        </div>
      </div>
      <div class="field"><label>JD URL</label>
        <input class="input" name="jdUrl" value="${h.escape(a.jdUrl || '')}">
      </div>
      <div class="field"><label>Notes</label>
        <textarea class="textarea" name="notes">${h.escape(a.notes || '')}</textarea>
      </div>
      <div class="field"><label>Rejection reason (if rejected)</label>
        <input class="input" name="rejectionReason" value="${h.escape(a.rejectionReason || '')}">
      </div>
      <div class="field"><label>Rejection tags (comma-separated)</label>
        <input class="input" name="rejectionTags" value="${(a.rejectionTags || []).join(', ')}" placeholder="dsa, system-design, comms">
      </div>
    `;
    const footer = document.createElement('div');
    footer.innerHTML = `
      <button class="btn btn-ghost" id="cancelBtn">Cancel</button>
      <button class="btn btn-primary" id="saveBtn">${isEdit ? 'Save' : 'Create'}</button>
    `;
    footer.querySelector('#cancelBtn').onclick = () => modal.close();
    footer.querySelector('#saveBtn').onclick = async () => {
      const data = collectForm(body);
      try {
        if (isEdit) await api.patch(`/applications/${a._id}`, data);
        else await api.post('/applications', data);
        toast.ok(isEdit ? 'Saved' : 'Created');
        modal.close();
        store.invalidate('apps');
        router.render();
      } catch (e) { toast.bad(e.message); }
    };
    modal.open({ title: isEdit ? 'Edit application' : 'New application', body, footer });
  }

  function collectForm(root) {
    const data = {};
    root.querySelectorAll('input, textarea, select').forEach((el) => {
      const k = el.name;
      if (!k) return;
      let v = el.value;
      if (el.type === 'number') v = v === '' ? null : Number(v);
      if (el.type === 'date') v = v ? new Date(v).toISOString() : null;
      if (k === 'rejectionTags') v = v.split(',').map((s) => s.trim()).filter(Boolean);
      if (v === '') v = null;
      data[k] = v;
    });
    if (!data.companyId) delete data.companyId;
    return data;
  }

  return pages.applications;
})();
