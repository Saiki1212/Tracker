pages.notes = (function () {
  const KINDS = ['debug', 'architecture', 'snippet', 'command', 'interview'];
  let activeKind = 'all';
  let q = '';

  const mod = {
    name: 'notes',
    title: 'Notes',
    renderActions() {
      const el = document.createElement('div');
      el.innerHTML = `<button class="btn btn-primary btn-sm" id="newBtn">${h.ic.plus} Note</button>`;
      el.querySelector('#newBtn').onclick = () => openModal();
      return el;
    },
    async render(view) {
      view.innerHTML = `<div id="ntRoot"><div class="empty"><div class="loader" style="margin:0 auto"></div></div></div>`;
    },
    async afterRender() {
      const root = document.getElementById('ntRoot');
      try {
        const { items } = await api.get('/notes');
        const draw = () => {
          const filtered = items.filter((n) =>
            (activeKind === 'all' || n.kind === activeKind) &&
            (!q || (n.title + ' ' + n.body + ' ' + (n.tags || []).join(' ')).toLowerCase().includes(q))
          );
          root.innerHTML = `
            <div class="search" style="margin-bottom:12px;max-width:360px">
              ${h.ic.search}
              <input class="input" id="search" placeholder="Search notes…" value="${h.escape(q)}">
            </div>
            <div class="row gap-2" style="overflow-x:auto;flex-wrap:nowrap;padding-bottom:8px;margin-bottom:12px">
              ${['all', ...KINDS].map((k) => `<button class="kanban-status-chip ${k === activeKind ? 'active' : ''}" data-k="${k}">${k}</button>`).join('')}
            </div>
            ${filtered.length
              ? `<div class="grid grid-3">${filtered.map(noteCard).join('')}</div>`
              : h.emptyState('No notes', 'Capture a debug fix, snippet, or interview note.')}
          `;
          root.querySelectorAll('[data-k]').forEach((b) => { b.onclick = () => { activeKind = b.dataset.k; draw(); }; });
          const search = document.getElementById('search');
          search.oninput = h.debounce((e) => { q = e.target.value.toLowerCase(); draw(); }, 200);
          root.querySelectorAll('[data-id]').forEach((el) => {
            const item = items.find((x) => x._id === el.dataset.id);
            el.querySelector('[data-edit]')?.addEventListener('click', (e) => { e.stopPropagation(); openModal(item); });
            el.querySelector('[data-pin]')?.addEventListener('click', async (e) => {
              e.stopPropagation();
              try { await api.patch(`/notes/${item._id}`, { pinned: !item.pinned }); router.render(); }
              catch (err) { toast.bad(err.message); }
            });
            el.querySelector('[data-del]')?.addEventListener('click', async (e) => {
              e.stopPropagation();
              if (!await modal.confirm('Delete this note?', { danger: true, okLabel: 'Delete' })) return;
              await api.del(`/notes/${item._id}`);
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

  function noteCard(n) {
    return `
      <div class="card hoverable" data-id="${n._id}">
        <div class="row-between" style="margin-bottom:8px">
          <div class="row gap-2">
            <strong>${h.escape(n.title)}</strong>
            ${n.pinned ? '<span class="chip chip-accent">pinned</span>' : ''}
          </div>
          <div class="row gap-1">
            <button class="btn btn-ghost btn-icon btn-sm" data-pin title="Pin">${h.ic.pin}</button>
            <button class="btn btn-ghost btn-icon btn-sm" data-edit>${h.ic.edit}</button>
            <button class="btn btn-ghost btn-icon btn-sm" data-del>${h.ic.trash}</button>
          </div>
        </div>
        <div class="row gap-2" style="margin-bottom:8px"><span class="chip">${n.kind}</span>${(n.tags || []).slice(0,3).map((t) => h.chip(t)).join('')}</div>
        <div class="muted" style="font-size:12.5px;line-height:1.5;max-height:56px;overflow:hidden">${h.escape((n.body || '').slice(0, 160))}</div>
      </div>
    `;
  }

  function openView(n) {
    const body = document.createElement('div');
    body.innerHTML = `
      <div class="row gap-2" style="margin-bottom:12px">
        <span class="chip">${n.kind}</span>
        ${(n.tags || []).map((t) => h.chip(t)).join('')}
      </div>
      ${n.kind === 'snippet' || n.kind === 'command'
        ? `<pre style="background:var(--bg-1);padding:12px;border-radius:8px;font-family:var(--font-mono);font-size:13px;color:var(--text-0);overflow-x:auto;white-space:pre-wrap">${h.escape(n.body)}</pre>`
        : `<div style="white-space:pre-wrap;font-size:13.5px">${h.escape(n.body || '—')}</div>`}
    `;
    const footer = document.createElement('div');
    footer.innerHTML = `<button class="btn btn-primary" id="c">Close</button>`;
    footer.querySelector('#c').onclick = () => modal.close();
    modal.open({ title: n.title, body, footer });
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
          <select class="select" name="kind">${KINDS.map((k) => `<option ${k === (seed.kind || 'snippet') ? 'selected' : ''}>${k}</option>`).join('')}</select>
        </div>
        <div class="field"><label>Tags (comma-separated)</label>
          <input class="input" name="tags" value="${(seed.tags || []).join(', ')}">
        </div>
      </div>
      <div class="field"><label>Body</label>
        <textarea class="textarea" name="body" style="min-height:180px;font-family:var(--font-mono)">${h.escape(seed.body || '')}</textarea>
      </div>
      <label class="checkbox">
        <input type="checkbox" name="pinned" ${seed.pinned ? 'checked' : ''}>
        <span class="checkbox-mark"></span>
        Pin to top
      </label>
    `;
    const footer = document.createElement('div');
    footer.innerHTML = `<button class="btn btn-ghost" id="c">Cancel</button><button class="btn btn-primary" id="s">${isEdit ? 'Save' : 'Create'}</button>`;
    footer.querySelector('#c').onclick = () => modal.close();
    footer.querySelector('#s').onclick = async () => {
      const data = {};
      body.querySelectorAll('[name]').forEach((el) => {
        if (el.type === 'checkbox') data[el.name] = el.checked;
        else if (el.name === 'tags') data[el.name] = el.value.split(',').map((s) => s.trim()).filter(Boolean);
        else data[el.name] = el.value;
      });
      try {
        if (isEdit) await api.patch(`/notes/${seed._id}`, data);
        else await api.post('/notes', data);
        toast.ok(isEdit ? 'Saved' : 'Created');
        modal.close();
        router.render();
      } catch (e) { toast.bad(e.message); }
    };
    modal.open({ title: isEdit ? 'Edit note' : 'New note', body, footer });
  }

  return mod;
})();
