pages.learning = (function () {
  const CATEGORIES = ['backend', 'systemDesign', 'db', 'devops', 'lang', 'other'];
  let activeKind = 'deep';

  const mod = {
    name: 'learning',
    title: 'Learning Hub',
    renderActions() {
      const el = document.createElement('div');
      el.innerHTML = `<button class="btn btn-primary btn-sm" id="newBtn">${h.ic.plus} Topic</button>`;
      el.querySelector('#newBtn').onclick = () => openModal();
      return el;
    },
    async render(view) {
      view.innerHTML = `<div id="lrnRoot"><div class="empty"><div class="loader" style="margin:0 auto"></div></div></div>`;
    },
    async afterRender() {
      const root = document.getElementById('lrnRoot');
      try {
        const { items } = await api.get('/learning');
        const draw = () => {
          const filtered = items.filter((i) => i.kind === activeKind);
          root.innerHTML = `
            <div class="tabs">
              <button class="tab ${activeKind === 'deep' ? 'active' : ''}" data-k="deep">Deep concepts</button>
              <button class="tab ${activeKind === 'quick' ? 'active' : ''}" data-k="quick">Quick notes</button>
            </div>
            ${filtered.length
              ? activeKind === 'deep'
                ? `<div class="grid grid-3">${filtered.map(deepCard).join('')}</div>`
                : `<div class="col gap-2">${filtered.map(quickRow).join('')}</div>`
              : h.emptyState('No items yet', 'Add a learning topic.')}
          `;
          root.querySelectorAll('[data-k]').forEach((b) => {
            b.onclick = () => { activeKind = b.dataset.k; draw(); };
          });
          root.querySelectorAll('[data-id]').forEach((el) => {
            const item = items.find((x) => x._id === el.dataset.id);
            el.querySelector('[data-edit]')?.addEventListener('click', (e) => { e.stopPropagation(); openModal(item); });
            el.querySelector('[data-revise]')?.addEventListener('click', async (e) => {
              e.stopPropagation();
              try { await api.post(`/learning/${item._id}/revise`); toast.ok('Revised'); router.render(); }
              catch (err) { toast.bad(err.message); }
            });
            el.querySelector('[data-del]')?.addEventListener('click', async (e) => {
              e.stopPropagation();
              if (!await modal.confirm('Delete this topic?', { danger: true, okLabel: 'Delete' })) return;
              await api.del(`/learning/${item._id}`);
              toast.ok('Deleted');
              router.render();
            });
            el.addEventListener('click', () => openView(item));
          });
        };
        draw();
      } catch (e) { root.innerHTML = h.emptyState('Failed', e.message); }
    },
  };

  function deepCard(t) {
    const pct = Math.round((t.confidence / 5) * 100);
    return `
      <div class="card hoverable" data-id="${t._id}">
        <div class="row-between" style="margin-bottom:10px">
          <div class="card-title">${h.escape(t.title)}</div>
          <span class="chip">${t.category}</span>
        </div>
        <div class="row gap-4" style="margin-bottom:10px">
          ${h.ring(pct, 48)}
          <div class="col gap-1">
            <div class="muted" style="font-size:11px;text-transform:uppercase">Revisions</div>
            <div class="mono">${t.revisionCount}</div>
            <div class="muted" style="font-size:11px">${t.lastRevisedAt ? h.fmtRelDays(t.lastRevisedAt) : 'never'}</div>
          </div>
        </div>
        <div class="row gap-2">
          <button class="btn btn-sm" data-revise>Revise</button>
          <button class="btn btn-ghost btn-icon btn-sm" data-edit>${h.ic.edit}</button>
          <button class="btn btn-ghost btn-icon btn-sm" data-del>${h.ic.trash}</button>
        </div>
      </div>
    `;
  }

  function quickRow(t) {
    return `
      <div class="card compact hoverable" data-id="${t._id}">
        <div class="row-between">
          <div class="row gap-2">
            <strong>${h.escape(t.title)}</strong>
            <span class="chip">${t.category}</span>
          </div>
          <div class="row gap-2">
            <span class="muted" style="font-size:12px">${t.revisionCount}× · ${t.lastRevisedAt ? h.fmtRelDays(t.lastRevisedAt) : 'new'}</span>
            <button class="btn btn-ghost btn-icon btn-sm" data-revise title="Revise">↻</button>
            <button class="btn btn-ghost btn-icon btn-sm" data-edit>${h.ic.edit}</button>
            <button class="btn btn-ghost btn-icon btn-sm" data-del>${h.ic.trash}</button>
          </div>
        </div>
      </div>
    `;
  }

  function openView(t) {
    const body = document.createElement('div');
    body.innerHTML = `
      <div class="row gap-2" style="margin-bottom:12px">
        <span class="chip">${t.category}</span>
        <span class="chip">conf ${t.confidence}/5</span>
        <span class="chip">${t.revisionCount} revisions</span>
      </div>
      <div style="white-space:pre-wrap;font-size:13.5px">${h.escape(t.body || '—')}</div>
    `;
    const footer = document.createElement('div');
    footer.innerHTML = `<button class="btn" id="r">Mark revised</button><button class="btn btn-primary" id="c">Close</button>`;
    footer.querySelector('#c').onclick = () => modal.close();
    footer.querySelector('#r').onclick = async () => {
      try { await api.post(`/learning/${t._id}/revise`); toast.ok('Revised'); modal.close(); router.render(); }
      catch (e) { toast.bad(e.message); }
    };
    modal.open({ title: t.title, body, footer });
  }

  function openModal(seed) {
    seed = seed || {};
    const isEdit = !!seed._id;
    const body = document.createElement('div');
    body.innerHTML = `
      <div class="field"><label>Title *</label>
        <input class="input" name="title" required value="${h.escape(seed.title || '')}">
      </div>
      <div class="field-row">
        <div class="field"><label>Kind</label>
          <select class="select" name="kind">
            <option value="deep" ${seed.kind === 'deep' ? 'selected' : ''}>Deep</option>
            <option value="quick" ${seed.kind === 'quick' ? 'selected' : ''}>Quick</option>
          </select>
        </div>
        <div class="field"><label>Category</label>
          <select class="select" name="category">
            ${CATEGORIES.map((c) => `<option ${c === (seed.category || 'other') ? 'selected' : ''}>${c}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="field-row">
        <div class="field"><label>Confidence (1–5)</label>
          <input class="input" type="number" min="1" max="5" name="confidence" value="${seed.confidence || 3}">
        </div>
        <div class="field"><label>Interview frequency (1–5)</label>
          <input class="input" type="number" min="1" max="5" name="interviewFrequency" value="${seed.interviewFrequency || 3}">
        </div>
      </div>
      <div class="field"><label>Body (markdown OK)</label>
        <textarea class="textarea" name="body" style="min-height:160px">${h.escape(seed.body || '')}</textarea>
      </div>
    `;
    const footer = document.createElement('div');
    footer.innerHTML = `<button class="btn btn-ghost" id="c">Cancel</button><button class="btn btn-primary" id="s">${isEdit ? 'Save' : 'Create'}</button>`;
    footer.querySelector('#c').onclick = () => modal.close();
    footer.querySelector('#s').onclick = async () => {
      const data = {};
      body.querySelectorAll('[name]').forEach((el) => {
        let v = el.value;
        if (el.type === 'number') v = Number(v);
        data[el.name] = v;
      });
      try {
        if (isEdit) await api.patch(`/learning/${seed._id}`, data);
        else await api.post('/learning', data);
        toast.ok(isEdit ? 'Saved' : 'Created');
        modal.close();
        router.render();
      } catch (e) { toast.bad(e.message); }
    };
    modal.open({ title: isEdit ? 'Edit topic' : 'New topic', body, footer });
  }

  return mod;
})();
