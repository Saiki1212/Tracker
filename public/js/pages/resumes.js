pages.resumes = (function () {
  const mod = {
    name: 'resumes',
    title: 'Resume Vault',
    renderActions() {
      const el = document.createElement('div');
      el.innerHTML = `<button class="btn btn-primary btn-sm" id="newBtn">${h.ic.plus} Resume</button>`;
      el.querySelector('#newBtn').onclick = () => openModal();
      return el;
    },
    async render(view) {
      view.innerHTML = `<div id="resRoot"><div class="empty"><div class="loader" style="margin:0 auto"></div></div></div>`;
    },
    async afterRender() {
      const root = document.getElementById('resRoot');
      try {
        const [{ items }, perf] = await Promise.all([
          api.get('/resumes'),
          api.get('/analytics/resume-performance'),
        ]);
        const perfMap = Object.fromEntries((perf.items || []).map((p) => [String(p.resumeId), p]));
        if (!items.length) {
          root.innerHTML = h.emptyState('No resumes yet', 'Add your first resume version.');
          return;
        }
        root.innerHTML = `<div class="grid grid-3">${items.map((r) => card(r, perfMap[r._id])).join('')}</div>`;
        root.querySelectorAll('[data-id]').forEach((el) => {
          el.querySelector('[data-edit]').onclick = (e) => { e.stopPropagation(); openModal(items.find((x) => x._id === el.dataset.id)); };
          el.querySelector('[data-del]').onclick = async (e) => {
            e.stopPropagation();
            if (!await modal.confirm('Delete this resume version?', { danger: true, okLabel: 'Delete' })) return;
            await api.del(`/resumes/${el.dataset.id}`);
            toast.ok('Deleted');
            router.render();
          };
        });
      } catch (e) { root.innerHTML = h.emptyState('Failed', e.message); }
    },
  };

  function card(r, p) {
    p = p || { total: 0, callbackRate: 0, interviewRate: 0, offerRate: 0 };
    return `
      <div class="card hoverable" data-id="${r._id}">
        <div class="row-between" style="margin-bottom:10px">
          <div class="row gap-2">
            <span class="chip chip-mono chip-accent">${h.escape(r.version)}</span>
            <span class="muted">${h.escape(r.targetRole || '')}</span>
          </div>
          <div class="row gap-1">
            <button class="btn btn-ghost btn-icon btn-sm" data-edit>${h.ic.edit}</button>
            <button class="btn btn-ghost btn-icon btn-sm" data-del>${h.ic.trash}</button>
          </div>
        </div>
        <div class="row gap-2" style="flex-wrap:wrap;margin-bottom:10px">
          ${(r.skillsHighlighted || []).slice(0, 6).map((s) => h.chip(s)).join('')}
        </div>
        <div class="grid grid-3" style="gap:8px;margin-bottom:10px">
          ${perfBar('Callback', p.callbackRate)}
          ${perfBar('Interview', p.interviewRate)}
          ${perfBar('Offer', p.offerRate)}
        </div>
        <div class="row-between">
          <span class="muted" style="font-size:12px">${p.total} application${p.total === 1 ? '' : 's'}</span>
          ${r.driveUrl ? `<a class="btn btn-sm" href="${h.escape(r.driveUrl)}" target="_blank" rel="noopener">${h.ic.external} Open</a>` : ''}
        </div>
      </div>
    `;
  }

  function perfBar(label, pct) {
    const v = Math.max(0, Math.min(100, +pct || 0));
    return `
      <div class="col" style="gap:4px">
        <div style="font-size:10.5px;text-transform:uppercase;letter-spacing:0.06em;color:var(--text-2)">${label}</div>
        <div class="mono" style="font-size:13px">${v}%</div>
        <div class="progress"><div class="progress-bar" style="width:${v}%"></div></div>
      </div>
    `;
  }

  function openModal(seed) {
    seed = seed || {};
    const isEdit = !!seed._id;
    const body = document.createElement('div');
    body.innerHTML = `
      <div class="field"><label>Version *</label>
        <input class="input" name="version" required value="${h.escape(seed.version || '')}" placeholder="v1.0-backend">
      </div>
      <div class="field"><label>Target role</label>
        <input class="input" name="targetRole" value="${h.escape(seed.targetRole || '')}">
      </div>
      <div class="field"><label>Drive URL</label>
        <input class="input" name="driveUrl" value="${h.escape(seed.driveUrl || '')}">
      </div>
      <div class="field"><label>Skills highlighted (comma-separated)</label>
        <input class="input" name="skillsHighlighted" value="${(seed.skillsHighlighted || []).join(', ')}">
      </div>
      <div class="field"><label>ATS keywords (comma-separated)</label>
        <input class="input" name="atsKeywords" value="${(seed.atsKeywords || []).join(', ')}">
      </div>
      <div class="field"><label>Notes</label>
        <textarea class="textarea" name="notes">${h.escape(seed.notes || '')}</textarea>
      </div>
    `;
    const footer = document.createElement('div');
    footer.innerHTML = `<button class="btn btn-ghost" id="c">Cancel</button><button class="btn btn-primary" id="s">${isEdit ? 'Save' : 'Create'}</button>`;
    footer.querySelector('#c').onclick = () => modal.close();
    footer.querySelector('#s').onclick = async () => {
      const data = {};
      body.querySelectorAll('[name]').forEach((el) => {
        let v = el.value;
        if (el.name === 'skillsHighlighted' || el.name === 'atsKeywords')
          v = v.split(',').map((s) => s.trim()).filter(Boolean);
        if (v === '') v = null;
        data[el.name] = v;
      });
      try {
        if (isEdit) await api.patch(`/resumes/${seed._id}`, data);
        else await api.post('/resumes', data);
        toast.ok(isEdit ? 'Saved' : 'Created');
        modal.close();
        router.render();
      } catch (e) { toast.bad(e.message); }
    };
    modal.open({ title: isEdit ? 'Edit resume' : 'New resume version', body, footer });
  }

  return mod;
})();
