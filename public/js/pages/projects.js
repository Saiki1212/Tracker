pages.projects = (function () {
  const TASK_STATUSES = ['backlog', 'todo', 'doing', 'blocked', 'done'];
  const DEPLOYS = ['planned', 'building', 'live', 'archived'];

  const mod = {
    name: 'projects',
    title: 'Projects',
    renderActions(params) {
      const el = document.createElement('div');
      const inDetail = params && params[0];
      el.innerHTML = inDetail
        ? `<button class="btn btn-sm" id="backBtn">← All</button>
           <button class="btn btn-primary btn-sm" id="newTaskBtn">${h.ic.plus} Task</button>`
        : `<button class="btn btn-primary btn-sm" id="newProjectBtn">${h.ic.plus} Project</button>`;
      el.querySelector('#newProjectBtn')?.addEventListener('click', () => openProjectModal());
      el.querySelector('#backBtn')?.addEventListener('click', () => router.go('projects'));
      el.querySelector('#newTaskBtn')?.addEventListener('click', () => openTaskModal({ projectId: params[0] }));
      return el;
    },
    async render(view, params) {
      view.innerHTML = `<div id="prRoot"><div class="empty"><div class="loader" style="margin:0 auto"></div></div></div>`;
    },
    async afterRender(view, params) {
      const root = document.getElementById('prRoot');
      try {
        if (params && params[0]) await renderDetail(root, params[0]);
        else await renderList(root);
      } catch (e) { root.innerHTML = h.emptyState('Failed', e.message); }
    },
  };

  async function renderList(root) {
    const { items } = await api.get('/projects');
    if (!items.length) {
      root.innerHTML = h.emptyState('No projects yet', 'Add your first project to start tracking.');
      return;
    }
    root.innerHTML = `<div class="grid grid-3">${items.map(card).join('')}</div>`;
    root.querySelectorAll('[data-id]').forEach((el) => {
      el.addEventListener('click', (e) => {
        if (e.target.closest('[data-edit]')) return;
        router.go('projects', [el.dataset.id]);
      });
      el.querySelector('[data-edit]')?.addEventListener('click', (e) => {
        e.stopPropagation();
        openProjectModal(items.find((p) => p._id === el.dataset.id));
      });
    });
  }

  function card(p) {
    return `
      <div class="card hoverable" data-id="${p._id}" data-anim="card">
        <div class="row-between" style="margin-bottom:8px">
          <div class="card-title">${h.escape(p.title)}</div>
          <button class="btn btn-ghost btn-icon btn-sm" data-edit>${h.ic.edit}</button>
        </div>
        <div class="muted" style="font-size:12.5px;min-height:36px;margin-bottom:10px">${h.escape((p.description || '').slice(0, 120))}</div>
        <div class="row gap-2" style="flex-wrap:wrap;margin-bottom:10px">
          ${(p.techStack || []).slice(0, 5).map((t) => h.chip(t)).join('')}
        </div>
        <div class="row-between" style="margin-bottom:6px">
          <span class="chip">${p.deploymentStatus}</span>
          <span class="muted mono" style="font-size:12px">${p.progressPct || 0}%</span>
        </div>
        ${h.progressBar(p.progressPct)}
      </div>
    `;
  }

  async function renderDetail(root, id) {
    const [{ item: project }, { items: tasks }] = await Promise.all([
      api.get(`/projects/${id}`),
      api.get(`/projects/${id}/tasks`),
    ]);
    const tabs = ['Overview', 'Architecture', 'Kanban', 'Lessons'];
    let active = 'Overview';

    const draw = () => {
      root.innerHTML = `
        <div class="page-header" style="margin-bottom:12px">
          <h1>${h.escape(project.title)}</h1>
          <span class="chip">${project.deploymentStatus}</span>
          <span class="muted mono" style="font-size:12px">${project.progressPct || 0}%</span>
        </div>
        <div class="tabs">
          ${tabs.map((t) => `<button class="tab ${t === active ? 'active' : ''}" data-tab="${t}">${t}</button>`).join('')}
        </div>
        <div id="tabBody"></div>
      `;
      root.querySelectorAll('[data-tab]').forEach((b) => {
        b.onclick = () => { active = b.dataset.tab; draw(); };
      });
      const body = document.getElementById('tabBody');
      if (active === 'Overview') body.innerHTML = overviewHtml(project);
      else if (active === 'Architecture') body.innerHTML = `<div class="card"><pre style="white-space:pre-wrap;font-family:var(--font-mono);font-size:13px;color:var(--text-1)">${h.escape(project.architectureNotes || 'No notes yet.')}</pre></div>`;
      else if (active === 'Kanban') renderKanban(body, project, tasks);
      else if (active === 'Lessons') body.innerHTML = `<div class="card"><div class="muted" style="font-size:11px;text-transform:uppercase;margin-bottom:6px">Lessons learned</div><div style="white-space:pre-wrap">${h.escape(project.lessonsLearned || '—')}</div><div class="muted" style="font-size:11px;text-transform:uppercase;margin:14px 0 6px">Resume impact</div><div style="white-space:pre-wrap">${h.escape(project.resumeImpact || '—')}</div></div>`;
    };
    draw();
  }

  function overviewHtml(p) {
    return `
      <div class="grid grid-2">
        <div class="card">
          <div class="card-header"><div class="card-title">Description</div></div>
          <div style="white-space:pre-wrap">${h.escape(p.description || '—')}</div>
        </div>
        <div class="card">
          <div class="card-header"><div class="card-title">Links</div></div>
          <div class="col gap-2">
            ${p.githubUrl ? `<a href="${h.escape(p.githubUrl)}" target="_blank" rel="noopener">GitHub ${h.ic.external}</a>` : '<span class="muted">No GitHub URL</span>'}
            ${p.liveUrl ? `<a href="${h.escape(p.liveUrl)}" target="_blank" rel="noopener">Live ${h.ic.external}</a>` : '<span class="muted">No live URL</span>'}
          </div>
          <div class="card-header" style="margin-top:14px"><div class="card-title">Tech</div></div>
          <div class="row gap-2" style="flex-wrap:wrap">${(p.techStack || []).map((t) => h.chip(t)).join('') || '<span class="muted">—</span>'}</div>
          <div class="card-header" style="margin-top:14px"><div class="card-title">Scalability concepts</div></div>
          <div class="row gap-2" style="flex-wrap:wrap">${(p.scalabilityConcepts || []).map((t) => h.chip(t, 'chip-accent')).join('') || '<span class="muted">—</span>'}</div>
        </div>
      </div>
    `;
  }

  function renderKanban(body, project, tasks) {
    const grouped = Object.fromEntries(TASK_STATUSES.map((s) => [s, []]));
    tasks.forEach((t) => grouped[t.status]?.push(t));
    body.innerHTML = `
      <div class="kanban">
        ${TASK_STATUSES.map((s) => `
          <div class="kanban-col" data-status="${s}">
            <div class="kanban-col-header">
              <span style="text-transform:capitalize">${s}</span>
              <span class="kanban-col-count">${grouped[s].length}</span>
            </div>
            <div class="kanban-list" data-status="${s}">
              ${grouped[s].map(taskCard).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    `;
    body.querySelectorAll('.kanban-card').forEach((c) => {
      c.addEventListener('click', () => openTaskModal(tasks.find((t) => t._id === c.dataset.id)));
    });
    kanban.bind(body, {
      onMove: async (id, status, order) => {
        try {
          await api.patch(`/projects/${project._id}/tasks/reorder`, {
            updates: [{ taskId: id, status, order }],
          });
          toast.ok('Moved');
          router.render();
        } catch (e) { toast.bad(e.message); }
      },
    });
  }

  function taskCard(t) {
    return `
      <div class="kanban-card" data-id="${t._id}">
        <div class="kanban-card-title">${h.escape(t.title)}</div>
        <div class="kanban-card-meta">
          <span class="prio prio-${t.priority}">${t.priority}</span>
          ${t.dueDate ? `<span class="chip">${h.fmtDate(t.dueDate)}</span>` : ''}
          ${t.module ? `<span class="chip">${h.escape(t.module)}</span>` : ''}
        </div>
        ${t.blockerNote ? `<div class="muted" style="font-size:11.5px;margin-top:6px;color:var(--bad)">⚠ ${h.escape(t.blockerNote)}</div>` : ''}
      </div>
    `;
  }

  function openProjectModal(seed) {
    seed = seed || {};
    const isEdit = !!seed._id;
    const body = document.createElement('div');
    body.innerHTML = `
      <div class="field"><label>Title *</label>
        <input class="input" name="title" required value="${h.escape(seed.title || '')}">
      </div>
      <div class="field"><label>Description</label>
        <textarea class="textarea" name="description">${h.escape(seed.description || '')}</textarea>
      </div>
      <div class="field-row">
        <div class="field"><label>Deployment status</label>
          <select class="select" name="deploymentStatus">
            ${DEPLOYS.map((d) => `<option ${d === (seed.deploymentStatus || 'planned') ? 'selected' : ''}>${d}</option>`).join('')}
          </select>
        </div>
        <div class="field"><label>Progress %</label>
          <input class="input" type="number" min="0" max="100" name="progressPct" value="${seed.progressPct || 0}">
        </div>
      </div>
      <div class="field-row">
        <div class="field"><label>GitHub URL</label>
          <input class="input" name="githubUrl" value="${h.escape(seed.githubUrl || '')}">
        </div>
        <div class="field"><label>Live URL</label>
          <input class="input" name="liveUrl" value="${h.escape(seed.liveUrl || '')}">
        </div>
      </div>
      <div class="field"><label>Tech stack (comma-separated)</label>
        <input class="input" name="techStack" value="${(seed.techStack || []).join(', ')}">
      </div>
      <div class="field"><label>Scalability concepts (comma-separated)</label>
        <input class="input" name="scalabilityConcepts" value="${(seed.scalabilityConcepts || []).join(', ')}">
      </div>
      <div class="field"><label>Architecture notes</label>
        <textarea class="textarea" name="architectureNotes">${h.escape(seed.architectureNotes || '')}</textarea>
      </div>
      <div class="field"><label>Lessons learned</label>
        <textarea class="textarea" name="lessonsLearned">${h.escape(seed.lessonsLearned || '')}</textarea>
      </div>
      <div class="field"><label>Resume impact</label>
        <textarea class="textarea" name="resumeImpact">${h.escape(seed.resumeImpact || '')}</textarea>
      </div>
    `;
    const footer = document.createElement('div');
    footer.innerHTML = `
      ${isEdit ? `<button class="btn btn-danger" id="d">${h.ic.trash}</button>` : ''}
      <button class="btn btn-ghost" id="c">Cancel</button>
      <button class="btn btn-primary" id="s">${isEdit ? 'Save' : 'Create'}</button>
    `;
    footer.querySelector('#c').onclick = () => modal.close();
    footer.querySelector('#s').onclick = async () => {
      const data = {};
      body.querySelectorAll('[name]').forEach((el) => {
        let v = el.value;
        if (el.type === 'number') v = Number(v);
        if (el.name === 'techStack' || el.name === 'scalabilityConcepts')
          v = v.split(',').map((s) => s.trim()).filter(Boolean);
        if (v === '') v = null;
        data[el.name] = v;
      });
      try {
        if (isEdit) await api.patch(`/projects/${seed._id}`, data);
        else await api.post('/projects', data);
        toast.ok(isEdit ? 'Saved' : 'Created');
        modal.close();
        router.render();
      } catch (e) { toast.bad(e.message); }
    };
    if (isEdit) {
      footer.querySelector('#d').onclick = async () => {
        if (!await modal.confirm('Delete this project? Tasks will remain orphaned.', { danger: true, okLabel: 'Delete' })) return;
        await api.del(`/projects/${seed._id}`);
        toast.ok('Deleted');
        modal.close();
        router.go('projects');
      };
    }
    modal.open({ title: isEdit ? 'Edit project' : 'New project', body, footer });
  }

  function openTaskModal(seed) {
    seed = seed || {};
    const isEdit = !!seed._id;
    const projectId = seed.projectId || (seed.projectId?._id);
    const body = document.createElement('div');
    body.innerHTML = `
      <div class="field"><label>Title *</label>
        <input class="input" name="title" required value="${h.escape(seed.title || '')}">
      </div>
      <div class="field"><label>Description</label>
        <textarea class="textarea" name="description">${h.escape(seed.description || '')}</textarea>
      </div>
      <div class="field-row">
        <div class="field"><label>Status</label>
          <select class="select" name="status">
            ${TASK_STATUSES.map((s) => `<option ${s === (seed.status || 'todo') ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
        </div>
        <div class="field"><label>Priority</label>
          <select class="select" name="priority">
            ${['P0','P1','P2','P3'].map((p) => `<option ${p === (seed.priority || 'P2') ? 'selected' : ''}>${p}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="field-row">
        <div class="field"><label>Module</label>
          <input class="input" name="module" value="${h.escape(seed.module || '')}">
        </div>
        <div class="field"><label>Due date</label>
          <input class="input" type="date" name="dueDate" value="${seed.dueDate ? new Date(seed.dueDate).toISOString().slice(0,10) : ''}">
        </div>
      </div>
      <div class="field"><label>Blocker note</label>
        <input class="input" name="blockerNote" value="${h.escape(seed.blockerNote || '')}">
      </div>
    `;
    const footer = document.createElement('div');
    footer.innerHTML = `
      ${isEdit ? `<button class="btn btn-danger" id="d">${h.ic.trash}</button>` : ''}
      <button class="btn btn-ghost" id="c">Cancel</button>
      <button class="btn btn-primary" id="s">${isEdit ? 'Save' : 'Create'}</button>
    `;
    footer.querySelector('#c').onclick = () => modal.close();
    footer.querySelector('#s').onclick = async () => {
      const data = {};
      body.querySelectorAll('[name]').forEach((el) => {
        let v = el.value;
        if (el.type === 'date') v = v ? new Date(v).toISOString() : null;
        if (v === '') v = null;
        data[el.name] = v;
      });
      try {
        if (isEdit) await api.patch(`/projects/${projectId}/tasks/${seed._id}`, data);
        else await api.post(`/projects/${projectId}/tasks`, data);
        toast.ok(isEdit ? 'Saved' : 'Created');
        modal.close();
        router.render();
      } catch (e) { toast.bad(e.message); }
    };
    if (isEdit) {
      footer.querySelector('#d').onclick = async () => {
        if (!await modal.confirm('Delete this task?', { danger: true, okLabel: 'Delete' })) return;
        await api.del(`/projects/${projectId}/tasks/${seed._id}`);
        toast.ok('Deleted');
        modal.close();
        router.render();
      };
    }
    modal.open({ title: isEdit ? 'Edit task' : 'New task', body, footer });
  }

  return mod;
})();
