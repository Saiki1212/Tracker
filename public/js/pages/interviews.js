pages.interviews = (function () {
  const ROUNDS = ['Recruiter', 'OA', 'Technical', 'SystemDesign', 'Behavioral', 'Final'];
  const OUTCOMES = ['pending', 'passed', 'failed', 'ghosted'];

  const mod = {
    name: 'interviews',
    title: 'Interviews',

    renderActions() {
      const wrap = document.createElement('div');
      wrap.innerHTML = `<button class="btn btn-primary btn-sm" id="newRoundBtn">${h.ic.plus} Round</button>`;
      wrap.querySelector('#newRoundBtn').onclick = () => mod.openModal();
      return wrap;
    },

    async render(view) {
      view.innerHTML = `<div id="interviewsRoot"><div class="empty"><div class="loader" style="margin:0 auto"></div></div></div>`;
    },

    async afterRender() {
      const root = document.getElementById('interviewsRoot');
      try {
        const [{ items: interviews }, { items: apps }] = await Promise.all([
          api.get('/interviews'),
          api.get('/applications'),
        ]);
        store.set('apps', apps, 60_000);
        if (!interviews.length) {
          root.innerHTML = h.emptyState('No interviews logged', 'Add a round to start building interview intelligence.');
          return;
        }
        // group by application
        const groups = {};
        interviews.forEach((i) => {
          const k = i.applicationId?._id || 'orphan';
          if (!groups[k]) groups[k] = { app: i.applicationId, items: [] };
          groups[k].items.push(i);
        });
        root.innerHTML = `
          <div class="col gap-4">
            ${Object.values(groups).map((g) => `
              <div class="card">
                <div class="card-header">
                  <div class="card-title">${h.escape(g.app?.role || 'Unknown role')}</div>
                  <span class="card-sub">${h.escape(g.app?.companyName || '')}</span>
                  ${g.app?.status ? h.status(g.app.status) : ''}
                </div>
                <div class="col gap-2">
                  ${g.items.map(roundCard).join('')}
                </div>
              </div>
            `).join('')}
          </div>
        `;
        root.querySelectorAll('[data-iv-id]').forEach((el) => {
          el.addEventListener('click', (e) => {
            if (e.target.closest('button')) return;
            const id = el.dataset.ivId;
            const item = interviews.find((x) => x._id === id);
            mod.openModal(item);
          });
        });
      } catch (e) {
        root.innerHTML = h.emptyState('Failed to load', e.message);
      }
    },

    openModal(seed) {
      openInterviewModal(seed);
    },
  };

  function roundCard(i) {
    const conf = i.confidence || 0;
    return `
      <div class="card compact hoverable" data-iv-id="${i._id}">
        <div class="row-between">
          <div class="row gap-2">
            <strong>${h.escape(i.roundType)}</strong>
            <span class="muted" style="font-size:12px">${h.fmtDateTime(i.scheduledAt)}</span>
          </div>
          <div class="row gap-2">
            ${h.stars(conf)}
            <span class="chip">${i.outcome}</span>
          </div>
        </div>
        ${i.weakConcepts?.length ? `<div class="row gap-2" style="margin-top:8px;flex-wrap:wrap">${i.weakConcepts.map((c) => h.chip(c, 'chip-accent')).join('')}</div>` : ''}
        ${i.mistakes?.length ? `<div class="muted" style="margin-top:6px;font-size:12px">${i.mistakes.length} mistake${i.mistakes.length > 1 ? 's' : ''}</div>` : ''}
      </div>
    `;
  }

  async function openInterviewModal(seed) {
    seed = seed || {};
    const isEdit = !!seed._id;
    let apps = store.get('apps');
    if (!apps) {
      try { apps = (await api.get('/applications')).items; store.set('apps', apps); }
      catch { apps = []; }
    }

    const body = document.createElement('div');
    body.innerHTML = `
      <div class="field">
        <label>Application *</label>
        <select class="select" name="applicationId" required>
          <option value="">— Select —</option>
          ${apps.map((a) => `<option value="${a._id}" ${a._id === (seed.applicationId?._id || seed.applicationId) ? 'selected' : ''}>${h.escape(a.role)} · ${h.escape(a.companyId?.name || a.companyName || '')}</option>`).join('')}
        </select>
      </div>
      <div class="field-row">
        <div class="field"><label>Round type</label>
          <select class="select" name="roundType">
            ${ROUNDS.map((r) => `<option ${r === (seed.roundType || 'Technical') ? 'selected' : ''}>${r}</option>`).join('')}
          </select>
        </div>
        <div class="field"><label>Outcome</label>
          <select class="select" name="outcome">
            ${OUTCOMES.map((o) => `<option ${o === (seed.outcome || 'pending') ? 'selected' : ''}>${o}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="field-row">
        <div class="field"><label>Date</label>
          <input class="input" type="datetime-local" name="scheduledAt" value="${seed.scheduledAt ? new Date(seed.scheduledAt).toISOString().slice(0, 16) : ''}">
        </div>
        <div class="field"><label>Duration (min)</label>
          <input class="input" type="number" name="durationMin" value="${seed.durationMin || 60}">
        </div>
      </div>
      <div class="field"><label>Interviewer</label>
        <input class="input" name="interviewer" value="${h.escape(seed.interviewer || '')}">
      </div>
      <div class="field"><label>Confidence (1–5)</label>
        <input class="input" type="number" min="1" max="5" name="confidence" value="${seed.confidence || 3}">
      </div>
      <div class="field"><label>Weak concepts (comma-separated)</label>
        <input class="input" name="weakConcepts" value="${(seed.weakConcepts || []).join(', ')}" placeholder="sql-indexing, concurrency, k8s">
      </div>
      <div class="field"><label>Mistakes (one per line)</label>
        <textarea class="textarea" name="mistakes">${(seed.mistakes || []).join('\n')}</textarea>
      </div>
      <div class="field"><label>Communication issues (comma-separated)</label>
        <input class="input" name="communicationIssues" value="${(seed.communicationIssues || []).join(', ')}">
      </div>
      <div class="field"><label>Notes</label>
        <textarea class="textarea" name="notes">${h.escape(seed.notes || '')}</textarea>
      </div>
      <div class="field"><label>Recording URL</label>
        <input class="input" name="recordingUrl" value="${h.escape(seed.recordingUrl || '')}">
      </div>
    `;
    const footer = document.createElement('div');
    footer.innerHTML = `
      ${isEdit ? `<button class="btn btn-danger" id="delBtn">${h.ic.trash}</button>` : ''}
      <button class="btn btn-ghost" id="cancelBtn">Cancel</button>
      <button class="btn btn-primary" id="saveBtn">${isEdit ? 'Save' : 'Create'}</button>
    `;
    footer.querySelector('#cancelBtn').onclick = () => modal.close();
    footer.querySelector('#saveBtn').onclick = async () => {
      const data = {};
      body.querySelectorAll('[name]').forEach((el) => {
        const k = el.name;
        let v = el.value;
        if (el.type === 'number') v = Number(v);
        if (el.type === 'datetime-local') v = v ? new Date(v).toISOString() : null;
        if (k === 'weakConcepts' || k === 'communicationIssues') v = v.split(',').map((s) => s.trim()).filter(Boolean);
        if (k === 'mistakes') v = v.split('\n').map((s) => s.trim()).filter(Boolean);
        if (v === '') v = null;
        data[k] = v;
      });
      try {
        if (isEdit) await api.patch(`/interviews/${seed._id}`, data);
        else await api.post('/interviews', data);
        toast.ok(isEdit ? 'Saved' : 'Created');
        modal.close();
        router.render();
      } catch (e) { toast.bad(e.message); }
    };
    if (isEdit) {
      footer.querySelector('#delBtn').onclick = async () => {
        if (!await modal.confirm('Delete this interview?', { danger: true, okLabel: 'Delete' })) return;
        await api.del(`/interviews/${seed._id}`);
        toast.ok('Deleted');
        modal.close();
        router.render();
      };
    }
    modal.open({ title: isEdit ? 'Edit round' : 'New interview round', body, footer });
  }

  return mod;
})();
