pages.tasks = (function () {
  const CATEGORIES = [
    'Learning', 'Resume', 'Job Applications', 'Interview Prep',
    'Networking', 'Project Work', 'Daily Review', 'Weekly Review',
  ];
  const STATUSES = ['Pending', 'In Progress', 'Completed', 'Missed', 'Archived'];
  const FREQUENCIES = ['DAILY', 'WEEKLY', 'MONTHLY', 'CUSTOM', 'WEEKDAYS_ONLY'];
  const PRIORITIES = ['P0', 'P1', 'P2', 'P3'];
  const DOW_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  let activeTab = 'active';

  const mod = {
    name: 'tasks',
    title: 'Tasks',

    renderActions() {
      const wrap = document.createElement('div');
      wrap.innerHTML = `<button class="btn btn-primary btn-sm" id="newTaskBtn">${h.ic.plus} New task</button>`;
      wrap.querySelector('#newTaskBtn').onclick = () => openModal();
      return wrap;
    },

    async render(view) {
      view.innerHTML = `
        <div class="page-header">
          <h1>Tasks &amp; reminders</h1>
        </div>
        <div class="grid grid-4" id="taskStats" style="margin-bottom:18px"></div>
        <div class="tabs" id="taskTabs">
          <button class="tab" data-tab="active">Active</button>
          <button class="tab" data-tab="overdue">Overdue</button>
          <button class="tab" data-tab="upcoming">Upcoming</button>
          <button class="tab" data-tab="history">History</button>
          <button class="tab" data-tab="analytics">Analytics</button>
        </div>
        <div id="tasksBody"></div>
      `;
    },

    async afterRender() {
      bindTabs();
      await refresh();
    },
  };

  function bindTabs() {
    document.querySelectorAll('#taskTabs .tab').forEach((b) => {
      b.classList.toggle('active', b.dataset.tab === activeTab);
      b.onclick = () => {
        activeTab = b.dataset.tab;
        document.querySelectorAll('#taskTabs .tab').forEach((x) => {
          x.classList.toggle('active', x.dataset.tab === activeTab);
        });
        refresh();
      };
    });
  }

  async function refresh() {
    const body = document.getElementById('tasksBody');
    const stats = document.getElementById('taskStats');
    body.innerHTML = `<div class="empty"><div class="loader" style="margin:0 auto"></div></div>`;

    try {
      // Always fetch overview + analytics for stat cards
      const [allRes, analyticsRes] = await Promise.all([
        api.get('/tasks'),
        api.get('/tasks/analytics'),
      ]);
      renderStats(stats, allRes.items, analyticsRes);

      if (activeTab === 'active') {
        const items = allRes.items.filter((t) => t.status !== 'Archived' && t.status !== 'Completed');
        renderTaskGrid(body, items);
      } else if (activeTab === 'overdue') {
        const { items } = await api.get('/tasks/overdue');
        if (!items.length) {
          body.innerHTML = h.emptyState('Nothing overdue', 'Every recurring task is on schedule.');
        } else renderTaskGrid(body, items, { highlightOverdue: true });
      } else if (activeTab === 'upcoming') {
        const { items } = await api.get('/tasks/upcoming?days=14');
        if (!items.length) {
          body.innerHTML = h.emptyState('Nothing scheduled', 'No reminders due in the next 14 days.');
        } else renderUpcomingTimeline(body, items);
      } else if (activeTab === 'history') {
        const { items } = await api.get('/tasks/history?limit=80');
        renderHistory(body, items);
      } else if (activeTab === 'analytics') {
        renderAnalytics(body, analyticsRes);
      }
      if (window.fx) {
        fx.bindCardHover(body);
        fx.bindRipples(body);
      }
    } catch (e) {
      body.innerHTML = h.emptyState('Failed to load', e.message);
    }
  }

  /* ============ Stat row ============ */
  function renderStats(root, all, an) {
    const now = Date.now();
    const overdue = all.filter((t) =>
      t.reminderEnabled &&
      t.status !== 'Archived' && t.status !== 'Completed' &&
      t.nextReminderAt && new Date(t.nextReminderAt).getTime() <= now
    ).length;
    const active = all.filter((t) => t.status !== 'Archived' && t.status !== 'Completed').length;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const doneToday = all.filter((t) =>
      t.lastCompletionAt && new Date(t.lastCompletionAt) >= today
    ).length;
    const bestStreak = all.reduce((m, t) => Math.max(m, t.streakCount || 0), 0);

    const stats = [
      { label: 'Active tasks', value: active, kind: 'int' },
      { label: 'Overdue', value: overdue, kind: 'int', accent: overdue > 0 ? 'bad' : '' },
      { label: 'Done today', value: doneToday, kind: 'int' },
      { label: 'Best streak', value: bestStreak, kind: 'int' },
    ];
    root.innerHTML = stats.map((s) => `
      <div class="card stat-card hoverable" data-anim="card">
        <div class="stat">
          <div class="stat-label">${h.escape(s.label)}</div>
          <div class="stat-value" data-stat>${s.value}</div>
        </div>
      </div>`).join('');

    if (window.gsap && !(window.fx && fx.reduceMotion)) {
      root.querySelectorAll('[data-stat]').forEach((el, i) => {
        const target = stats[i].value;
        const obj = { v: 0 };
        gsap.to(obj, {
          v: target, duration: 0.9, ease: 'power2.out', delay: 0.05 * i,
          onUpdate: () => { el.textContent = Math.round(obj.v); },
        });
      });
    }
    if (window.fx) fx.bindCardHover(root);
  }

  /* ============ Active / Overdue grid ============ */
  function renderTaskGrid(root, items, opts = {}) {
    if (!items.length) {
      root.innerHTML = h.emptyState('No tasks yet', 'Create your first recurring task — daily Naukri update, weekly resume review, etc.');
      return;
    }
    root.innerHTML = `<div class="grid grid-3">${items.map((t) => taskCard(t, opts)).join('')}</div>`;
    bindCardActions(root, items);
  }

  function taskCard(t, opts = {}) {
    const next = t.nextReminderAt ? new Date(t.nextReminderAt) : null;
    const now = Date.now();
    const isOverdue = next && next.getTime() <= now && t.reminderEnabled && t.status !== 'Completed';
    const overdueChip = isOverdue
      ? `<span class="chip" style="background:rgba(239,68,68,0.15);color:var(--bad);border-color:rgba(239,68,68,0.3)">overdue</span>`
      : '';
    const streak = (t.streakCount || 0) > 0
      ? `<span class="chip" style="background:rgba(16,185,129,0.12);color:var(--ok);border-color:rgba(16,185,129,0.25)">🔥 ${t.streakCount}</span>`
      : '';
    const missedChip = (t.missedCount || 0) > 0
      ? `<span class="chip" title="Missed">·· ${t.missedCount}</span>`
      : '';
    const nextLabel = next
      ? `<span class="muted" style="font-size:11.5px">Next: ${nextRelative(next)}</span>`
      : '<span class="muted" style="font-size:11.5px">No reminder</span>';

    return `
      <div class="card hoverable" data-anim="card" data-id="${t._id}">
        <div class="row-between" style="margin-bottom:8px">
          <div class="row gap-2" style="min-width:0">
            <span class="prio prio-${t.priority}">${t.priority}</span>
            <strong style="overflow:hidden;text-overflow:ellipsis">${h.escape(t.title)}</strong>
          </div>
          ${overdueChip}
        </div>
        <div class="muted" style="font-size:12.5px;min-height:34px;margin-bottom:10px">
          ${h.escape((t.description || '').slice(0, 110))}
        </div>
        <div class="row gap-2" style="flex-wrap:wrap;margin-bottom:10px">
          <span class="chip">${h.escape(t.category)}</span>
          <span class="chip chip-mono">${frequencyLabel(t)}</span>
          ${streak}${missedChip}
        </div>
        <div class="row-between">
          ${nextLabel}
          <div class="row gap-1">
            <button class="btn btn-sm btn-primary" data-act="complete" title="Mark done">✓ Done</button>
            <button class="btn btn-ghost btn-icon btn-sm" data-act="edit" title="Edit">${h.ic.edit}</button>
            <button class="btn btn-ghost btn-icon btn-sm" data-act="more" title="More">⋯</button>
          </div>
        </div>
      </div>`;
  }

  function bindCardActions(root, items) {
    root.querySelectorAll('[data-id]').forEach((card) => {
      const t = items.find((x) => x._id === card.dataset.id);
      if (!t) return;
      card.querySelector('[data-act="complete"]').onclick = async (e) => {
        e.stopPropagation();
        try {
          await api.post(`/tasks/${t._id}/complete`);
          toast.ok('Marked done · streak +1');
          refresh();
        } catch (err) { toast.bad(err.message); }
      };
      card.querySelector('[data-act="edit"]').onclick = (e) => {
        e.stopPropagation();
        openModal(t);
      };
      card.querySelector('[data-act="more"]').onclick = (e) => {
        e.stopPropagation();
        openMoreMenu(t, e.currentTarget);
      };
    });
  }

  async function openMoreMenu(t, btn) {
    const body = document.createElement('div');
    body.innerHTML = `
      <div class="col gap-2">
        <button class="btn" data-a="skip">Skip this round (resets streak)</button>
        <button class="btn" data-a="archive">Archive task</button>
        <button class="btn btn-danger" data-a="delete">Delete permanently</button>
      </div>`;
    const footer = document.createElement('div');
    footer.innerHTML = `<button class="btn btn-ghost" id="c">Close</button>`;
    footer.querySelector('#c').onclick = () => modal.close();
    body.querySelector('[data-a="skip"]').onclick = async () => {
      try { await api.post(`/tasks/${t._id}/skip`); toast.ok('Skipped'); modal.close(); refresh(); }
      catch (e) { toast.bad(e.message); }
    };
    body.querySelector('[data-a="archive"]').onclick = async () => {
      try { await api.post(`/tasks/${t._id}/archive`); toast.ok('Archived'); modal.close(); refresh(); }
      catch (e) { toast.bad(e.message); }
    };
    body.querySelector('[data-a="delete"]').onclick = async () => {
      modal.close();
      if (!await modal.confirm('Delete this task permanently?', { danger: true, okLabel: 'Delete' })) return;
      try { await api.del(`/tasks/${t._id}`); toast.ok('Deleted'); refresh(); }
      catch (e) { toast.bad(e.message); }
    };
    modal.open({ title: t.title, body, footer });
  }

  /* ============ Upcoming timeline ============ */
  function renderUpcomingTimeline(root, items) {
    const grouped = {};
    items.forEach((t) => {
      const k = new Date(t.nextReminderAt).toISOString().slice(0, 10);
      if (!grouped[k]) grouped[k] = [];
      grouped[k].push(t);
    });
    root.innerHTML = `<div class="col gap-4">${
      Object.entries(grouped).map(([day, list]) => `
        <div>
          <div class="muted" style="font-size:11px;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:8px">
            ${h.fmtDate(day)} · ${list.length} reminder${list.length === 1 ? '' : 's'}
          </div>
          <div class="col gap-2">${list.map((t) => upcomingRow(t)).join('')}</div>
        </div>`).join('')
    }</div>`;
  }
  function upcomingRow(t) {
    const time = new Date(t.nextReminderAt);
    return `
      <div class="card compact hoverable" data-id="${t._id}">
        <div class="row-between">
          <div class="row gap-2">
            <span class="mono muted" style="font-size:12px;min-width:54px">${time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            <strong>${h.escape(t.title)}</strong>
          </div>
          <div class="row gap-2">
            <span class="chip">${h.escape(t.category)}</span>
            <span class="chip chip-mono">${frequencyLabel(t)}</span>
          </div>
        </div>
      </div>`;
  }

  /* ============ History ============ */
  function renderHistory(root, items) {
    if (!items.length) {
      root.innerHTML = h.emptyState('No completions yet', 'Complete a task to start a streak.');
      return;
    }
    root.innerHTML = `<div class="table-wrap"><table class="table">
      <thead><tr><th>Task</th><th>Category</th><th>Last completed</th><th>Total</th><th>Streak</th></tr></thead>
      <tbody>${items.map((t) => `
        <tr>
          <td data-label="Task">${h.escape(t.title)}</td>
          <td data-label="Category">${h.escape(t.category)}</td>
          <td data-label="Last completed" class="muted">${h.fmtRelDays(t.lastCompletionAt)}</td>
          <td data-label="Total" class="mono">${t.totalCompletions || 0}</td>
          <td data-label="Streak" class="mono">${t.streakCount || 0}</td>
        </tr>`).join('')}</tbody>
    </table></div>`;
  }

  /* ============ Analytics ============ */
  function renderAnalytics(root, an) {
    const cats = Object.entries(an.byCategory || {});
    root.innerHTML = `
      <div class="grid grid-3" style="margin-bottom:16px">
        <div class="card hoverable">
          <div class="stat-label">Completion</div>
          <div class="stat-value">${an.totals.completionPct}%</div>
          <div class="muted" style="font-size:12px">${an.totals.completions} done · ${an.totals.missed} missed</div>
        </div>
        <div class="card hoverable">
          <div class="stat-label">Total tasks</div>
          <div class="stat-value">${an.totals.taskCount}</div>
          <div class="muted" style="font-size:12px">recurring + one-off</div>
        </div>
        <div class="card hoverable">
          <div class="stat-label">Total events</div>
          <div class="stat-value">${an.totals.total}</div>
          <div class="muted" style="font-size:12px">completions + misses</div>
        </div>
      </div>

      <div class="grid grid-2">
        <div class="card">
          <div class="card-header"><div class="card-title">By category</div></div>
          ${cats.length ? cats.map(([cat, c]) => {
            const t = c.completions + c.missed;
            const pct = t ? Math.round((c.completions / t) * 100) : 0;
            return `
              <div style="margin-bottom:10px">
                <div class="row-between" style="margin-bottom:4px">
                  <span style="font-size:13px">${h.escape(cat)}</span>
                  <span class="mono muted" style="font-size:12px">${pct}% · ${c.completions}/${t}</span>
                </div>
                ${h.progressBar(pct)}
              </div>`;
          }).join('') : '<div class="muted">No data yet.</div>'}
        </div>

        <div class="card">
          <div class="card-header"><div class="card-title">Strongest habits</div></div>
          ${an.strongest && an.strongest.length ? an.strongest.map((s) => `
            <div class="row-between" style="padding:8px 0;border-bottom:1px solid var(--border)">
              <div class="col" style="gap:2px">
                <strong style="font-size:13px">${h.escape(s.title)}</strong>
                <span class="muted" style="font-size:11px">${h.escape(s.category)}</span>
              </div>
              <span class="chip chip-accent">🔥 ${s.streakCount}</span>
            </div>`).join('') : '<div class="muted">Build a streak to see this.</div>'}

          <div class="card-header" style="margin-top:14px"><div class="card-title">Weakest habits</div></div>
          ${an.weakest && an.weakest.length ? an.weakest.map((s) => `
            <div class="row-between" style="padding:8px 0;border-bottom:1px solid var(--border)">
              <div class="col" style="gap:2px">
                <strong style="font-size:13px">${h.escape(s.title)}</strong>
                <span class="muted" style="font-size:11px">${h.escape(s.category)}</span>
              </div>
              <span class="chip" style="background:rgba(239,68,68,0.12);color:var(--bad);border-color:rgba(239,68,68,0.3)">·· ${s.missedCount}</span>
            </div>`).join('') : '<div class="muted">No misses yet.</div>'}
        </div>
      </div>
    `;
  }

  /* ============ Helpers ============ */
  function frequencyLabel(t) {
    switch (t.frequencyType) {
      case 'DAILY': return 'Daily';
      case 'WEEKDAYS_ONLY': return 'Weekdays';
      case 'WEEKLY': {
        const d = (t.customFrequency && t.customFrequency.daysOfWeek) || [];
        return d.length ? `Weekly · ${d.map((x) => DOW_NAMES[x]).join(',')}` : 'Weekly';
      }
      case 'MONTHLY': return 'Monthly';
      case 'CUSTOM': {
        const n = (t.customFrequency && t.customFrequency.intervalDays) || 1;
        return `Every ${n}d`;
      }
      default: return t.frequencyType;
    }
  }
  function nextRelative(date) {
    const ms = date.getTime() - Date.now();
    if (ms <= 0) return 'now';
    const mins = Math.round(ms / 60000);
    if (mins < 60) return `in ${mins}m`;
    const hrs = Math.round(mins / 60);
    if (hrs < 24) return `in ${hrs}h`;
    const days = Math.round(hrs / 24);
    return `in ${days}d`;
  }

  /* ============ Create / Edit modal ============ */
  function openModal(seed) {
    seed = seed || {};
    const isEdit = !!seed._id;
    const cf = seed.customFrequency || {};
    const dows = new Set(cf.daysOfWeek || []);

    const body = document.createElement('div');
    body.innerHTML = `
      <div class="field"><label>Title *</label>
        <input class="input" name="title" required maxlength="200" value="${h.escape(seed.title || '')}" placeholder="Update Naukri profile">
      </div>
      <div class="field"><label>Description</label>
        <textarea class="textarea" name="description" maxlength="2000">${h.escape(seed.description || '')}</textarea>
      </div>
      <div class="field-row">
        <div class="field"><label>Category</label>
          <select class="select" name="category">
            ${CATEGORIES.map((c) => `<option ${c === (seed.category || 'Daily Review') ? 'selected' : ''}>${c}</option>`).join('')}
          </select>
        </div>
        <div class="field"><label>Priority</label>
          <select class="select" name="priority">
            ${PRIORITIES.map((p) => `<option ${p === (seed.priority || 'P2') ? 'selected' : ''}>${p}</option>`).join('')}
          </select>
        </div>
      </div>

      <div class="card compact" style="margin-bottom:14px;background:var(--bg-1)">
        <label class="checkbox" style="margin-bottom:10px">
          <input type="checkbox" name="reminderEnabled" ${seed.reminderEnabled !== false ? 'checked' : ''}>
          <span class="checkbox-mark"></span>
          <span>Email reminders</span>
        </label>

        <div class="field-row">
          <div class="field"><label>Frequency</label>
            <select class="select" name="frequencyType" id="freqSel">
              ${FREQUENCIES.map((f) => `<option value="${f}" ${f === (seed.frequencyType || 'DAILY') ? 'selected' : ''}>${freqDisplay(f)}</option>`).join('')}
            </select>
          </div>
          <div class="field"><label>Time (UTC, HH:MM)</label>
            <input class="input" name="reminderTime" pattern="^([01]?\\d|2[0-3]):[0-5]\\d$" value="${h.escape(seed.reminderTime || '09:00')}">
          </div>
        </div>

        <div id="weeklyDays" style="display:none">
          <label style="font-size:12px;color:var(--text-1);margin-bottom:6px;display:block">Days of week</label>
          <div class="row gap-2" style="flex-wrap:wrap">
            ${DOW_NAMES.map((n, i) => `
              <label class="chip" style="cursor:pointer;${dows.has(i) ? 'background:rgba(var(--accent-rgb),0.15);color:var(--accent);border-color:rgba(var(--accent-rgb),0.3)' : ''}">
                <input type="checkbox" name="dow_${i}" ${dows.has(i) ? 'checked' : ''} style="margin-right:4px"> ${n}
              </label>`).join('')}
          </div>
        </div>

        <div id="customInterval" style="display:none">
          <div class="field" style="margin-top:10px"><label>Every N days</label>
            <input class="input" type="number" min="1" max="365" name="intervalDays" value="${cf.intervalDays || 3}">
          </div>
        </div>
      </div>

      <div class="field"><label>Notes</label>
        <textarea class="textarea" name="notes" maxlength="4000">${h.escape(seed.notes || '')}</textarea>
      </div>
    `;

    const footer = document.createElement('div');
    footer.innerHTML = `
      ${isEdit ? `<button class="btn btn-danger" id="d">${h.ic.trash}</button>` : ''}
      <button class="btn btn-ghost" id="c">Cancel</button>
      <button class="btn btn-primary" id="s">${isEdit ? 'Save' : 'Create'}</button>
    `;
    footer.querySelector('#c').onclick = () => modal.close();
    if (isEdit) footer.querySelector('#d').onclick = async () => {
      modal.close();
      if (!await modal.confirm('Delete this task permanently?', { danger: true, okLabel: 'Delete' })) return;
      await api.del(`/tasks/${seed._id}`);
      toast.ok('Deleted');
      refresh();
    };

    function syncFreqUI() {
      const f = body.querySelector('#freqSel').value;
      body.querySelector('#weeklyDays').style.display = f === 'WEEKLY' ? 'block' : 'none';
      body.querySelector('#customInterval').style.display = f === 'CUSTOM' ? 'block' : 'none';
    }
    body.querySelector('#freqSel').addEventListener('change', syncFreqUI);
    syncFreqUI();

    footer.querySelector('#s').onclick = async () => {
      const data = {};
      body.querySelectorAll('[name]').forEach((el) => {
        const k = el.name;
        if (k.startsWith('dow_')) return; // handled separately
        if (el.type === 'checkbox') data[k] = el.checked;
        else if (el.type === 'number') data[k] = el.value === '' ? null : Number(el.value);
        else data[k] = el.value;
      });
      const dowSel = [];
      body.querySelectorAll('[name^="dow_"]').forEach((el) => {
        if (el.checked) dowSel.push(+el.name.split('_')[1]);
      });
      data.customFrequency = {
        daysOfWeek: dowSel,
        intervalDays: data.intervalDays || undefined,
      };
      delete data.intervalDays;
      if (!data.title || !data.title.trim()) {
        toast.bad('Title is required'); return;
      }
      try {
        if (isEdit) await api.patch(`/tasks/${seed._id}`, data);
        else await api.post('/tasks', data);
        toast.ok(isEdit ? 'Saved' : 'Task created');
        modal.close();
        refresh();
      } catch (e) {
        toast.bad(e.message);
      }
    };

    modal.open({ title: isEdit ? 'Edit task' : 'New task & reminder', body, footer });
  }

  function freqDisplay(f) {
    return ({
      DAILY: 'Daily',
      WEEKDAYS_ONLY: 'Weekdays only',
      WEEKLY: 'Weekly (pick days)',
      MONTHLY: 'Monthly',
      CUSTOM: 'Every N days',
    })[f] || f;
  }

  return mod;
})();
