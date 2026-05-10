pages.weekly = (function () {
  let currentWeek = null;
  const saveDebounced = h.debounce(async (id, patch) => {
    try { await api.patch(`/weekly/${id}`, patch); toast.ok('Saved', 1200); }
    catch (e) { toast.bad(e.message); }
  }, 500);

  const mod = {
    name: 'weekly',
    title: 'Weekly Execution',
    async render(view) {
      view.innerHTML = `<div id="wkRoot"><div class="empty"><div class="loader" style="margin:0 auto"></div></div></div>`;
    },
    async afterRender() {
      const root = document.getElementById('wkRoot');
      try {
        const { item } = await api.get('/weekly/current');
        currentWeek = item;
        draw(root, item);
      } catch (e) { root.innerHTML = h.emptyState('Failed', e.message); }
    },
  };

  function draw(root, w) {
    const goalsTotal = (w.goals || []).length;
    const done = (w.goals || []).filter((g) => g.done).length;
    const pct = goalsTotal ? Math.round((done / goalsTotal) * 100) : 0;
    root.innerHTML = `
      <div class="page-header">
        <h1>Week of ${h.fmtDate(w.weekStart)}</h1>
        ${h.ring(pct, 56)}
      </div>
      <div class="grid grid-2">
        <div class="card">
          <div class="card-header"><div class="card-title">Goals</div><span class="card-sub">${done}/${goalsTotal}</span></div>
          <div id="goals" class="col gap-2"></div>
          <div class="row gap-2" style="margin-top:10px">
            <input class="input" id="newGoal" placeholder="Add goal and press Enter">
          </div>
        </div>
        <div class="card">
          <div class="card-header"><div class="card-title">Reflection</div></div>
          <textarea class="textarea" id="reflection" style="min-height:140px">${h.escape(w.reflection || '')}</textarea>
        </div>
      </div>
      <div class="grid grid-2" style="margin-top:16px">
        ${listCard('Completed tasks', 'completedTasks', w.completedTasks)}
        ${listCard('Blockers', 'blockers', w.blockers)}
      </div>
      <div class="grid grid-2" style="margin-top:16px">
        ${listCard('Wasted time', 'wastedTime', w.wastedTime)}
        ${listCard('Focus areas', 'focusAreas', w.focusAreas)}
      </div>
    `;

    bindGoals(w);
    bindReflection(w);
    bindLists(w);
  }

  function listCard(label, field, items) {
    return `
      <div class="card">
        <div class="card-header"><div class="card-title">${label}</div><span class="card-sub">${(items || []).length}</span></div>
        <div id="list-${field}" class="col gap-1"></div>
        <div class="row gap-2" style="margin-top:8px">
          <input class="input" data-add="${field}" placeholder="Add and press Enter">
        </div>
      </div>
    `;
  }

  function bindGoals(w) {
    const wrap = document.getElementById('goals');
    const renderGoals = () => {
      wrap.innerHTML = (w.goals || []).map((g, idx) => `
        <label class="checkbox" style="padding:6px 0">
          <input type="checkbox" data-i="${idx}" ${g.done ? 'checked' : ''}>
          <span class="checkbox-mark"></span>
          <span style="${g.done ? 'text-decoration:line-through;color:var(--text-2)' : ''}">${h.escape(g.text)}</span>
          <button class="btn btn-ghost btn-icon btn-sm" data-rm="${idx}" style="margin-left:auto">${h.ic.x}</button>
        </label>
      `).join('') || '<span class="muted">No goals yet.</span>';
      wrap.querySelectorAll('[data-i]').forEach((cb) => {
        cb.addEventListener('change', () => {
          const i = +cb.dataset.i;
          w.goals[i].done = cb.checked;
          saveDebounced(w._id, { goals: w.goals });
          renderGoals();
        });
      });
      wrap.querySelectorAll('[data-rm]').forEach((b) => {
        b.addEventListener('click', () => {
          const i = +b.dataset.rm;
          w.goals.splice(i, 1);
          saveDebounced(w._id, { goals: w.goals });
          renderGoals();
        });
      });
    };
    renderGoals();
    document.getElementById('newGoal').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.target.value.trim()) {
        w.goals = w.goals || [];
        w.goals.push({ text: e.target.value.trim(), done: false });
        e.target.value = '';
        saveDebounced(w._id, { goals: w.goals });
        renderGoals();
      }
    });
  }

  function bindReflection(w) {
    document.getElementById('reflection').addEventListener('input', (e) => {
      saveDebounced(w._id, { reflection: e.target.value });
    });
  }

  function bindLists(w) {
    ['completedTasks', 'blockers', 'wastedTime', 'focusAreas'].forEach((field) => {
      const list = document.getElementById('list-' + field);
      const draw = () => {
        list.innerHTML = (w[field] || []).map((t, i) => `
          <div class="row" style="padding:4px 0;font-size:13px">
            <span class="muted">·</span>
            <span class="flex-1">${h.escape(t)}</span>
            <button class="btn btn-ghost btn-icon btn-sm" data-rm="${i}">${h.ic.x}</button>
          </div>
        `).join('') || '<span class="muted" style="font-size:12px">Empty.</span>';
        list.querySelectorAll('[data-rm]').forEach((b) => {
          b.onclick = () => {
            const i = +b.dataset.rm;
            w[field].splice(i, 1);
            saveDebounced(w._id, { [field]: w[field] });
            draw();
          };
        });
      };
      draw();
      document.querySelector(`[data-add="${field}"]`).addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.target.value.trim()) {
          w[field] = w[field] || [];
          w[field].push(e.target.value.trim());
          e.target.value = '';
          saveDebounced(w._id, { [field]: w[field] });
          draw();
        }
      });
    });
  }

  return mod;
})();
