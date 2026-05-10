pages.dashboard = (function () {
  let timelineChart;

  /* ============ icons ============ */
  const ic = {
    apps: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 8v13H3V8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>',
    bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>',
    chart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>',
    interview: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
    resume: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/></svg>',
    task: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>',
    project: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7l9-4 9 4v10l-9 4-9-4V7z"/></svg>',
    learning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>',
  };

  return {
    name: 'dashboard',
    title: 'Dashboard',

    async render(view) {
      const user = (window.auth && auth.getUser()) || {};
      const greet = user.name ? `, ${h.escape(user.name.split(' ')[0])}` : '';

      view.innerHTML = `
        <div class="page-header" style="margin-bottom:6px;align-items:flex-start;flex-direction:column;gap:4px">
          <h1>Welcome back${greet}</h1>
        </div>
        <p class="page-subtitle">Here's what's happening with your career trajectory today.</p>

        <!-- Hero quick-action cards -->
        <div class="hero-grid" style="margin-bottom:20px">
          <a href="#/applications" class="hero-card tone-emerald" data-anim="card">
            <div class="hero-icon">${ic.apps}</div>
            <h3>Track every application</h3>
            <p>Log jobs with the resume version sent, recruiter contact, and follow-up dates.</p>
          </a>
          <a href="#/tasks" class="hero-card tone-amber" data-anim="card">
            <div class="hero-icon">${ic.bell}</div>
            <h3>Never miss a routine</h3>
            <p>Daily Naukri update, weekly resume review — Forge emails you on schedule.</p>
          </a>
          <a href="#/analytics" class="hero-card tone-violet" data-anim="card">
            <div class="hero-icon">${ic.chart}</div>
            <h3>Failure intelligence</h3>
            <p>See your weakest interview concepts and recurring rejection patterns.</p>
          </a>
        </div>

        <!-- Stat row -->
        <div class="grid grid-4" id="statRow" style="margin-bottom:20px"></div>

        <!-- Two-column main + sidebar -->
        <div class="dashboard-grid">
          <div class="col gap-4">
            <div class="card" data-anim="card">
              <div class="card-header">
                <div class="card-title">Recent activity</div>
                <span class="card-sub">Latest across applications, interviews, and tasks</span>
              </div>
              <div class="activity-list" id="activityList">
                <div class="empty"><div class="loader" style="margin:0 auto"></div></div>
              </div>
            </div>

            <div class="card" data-anim="card">
              <div class="card-header">
                <div class="card-title">Applications timeline</div>
                <span class="card-sub">Last 90 days</span>
              </div>
              <div style="height:200px"><canvas id="timeline"></canvas></div>
            </div>
          </div>

          <div class="col gap-4">
            <div class="card" data-anim="card">
              <div class="card-header">
                <div class="card-title">This week</div>
                <a class="card-sub" href="#/weekly" style="color:var(--accent)">Open →</a>
              </div>
              <div id="weeklyWidget"></div>
            </div>

            <div class="card" data-anim="card">
              <div class="card-header">
                <div class="card-title">Get started</div>
                <span class="card-sub" id="checklistProgress">0 of 6</span>
              </div>
              <div class="checklist" id="checklist"></div>
            </div>

            <div class="card" data-anim="card">
              <div class="card-header">
                <div class="card-title">Upcoming follow-ups</div>
              </div>
              <div id="followups"></div>
            </div>
          </div>
        </div>
      `;
    },

    async afterRender(view) {
      try {
        const [overview, timeline, apps, week, projects, resumes, tasks, interviews, learning] = await Promise.all([
          api.get('/analytics/overview'),
          api.get('/analytics/applications-timeline'),
          api.get('/applications'),
          api.get('/weekly/current'),
          api.get('/projects').catch(() => ({ items: [] })),
          api.get('/resumes').catch(() => ({ items: [] })),
          api.get('/tasks').catch(() => ({ items: [] })),
          api.get('/interviews').catch(() => ({ items: [] })),
          api.get('/learning').catch(() => ({ items: [] })),
        ]);

        renderStats(overview);
        renderTimeline(timeline);
        renderActivity(apps.items || [], interviews.items || [], tasks.items || []);
        renderFollowups(apps.items || []);
        renderWeekly(week.item || {});
        renderChecklist({
          projects: projects.items || [],
          resumes: resumes.items || [],
          applications: apps.items || [],
          tasks: tasks.items || [],
          interviews: interviews.items || [],
          learning: learning.items || [],
        });
      } catch (e) {
        toast.bad(e.message);
      }
    },
  };

  /* ============ Stats ============ */
  function renderStats(overview) {
    const stats = [
      { label: 'Active applications', value: overview.activeApplications, kind: 'int' },
      { label: 'Interviews this month', value: overview.interviewsThisMonth, kind: 'int' },
      { label: 'Rejection ratio', value: overview.rejectionRatio, kind: 'pct' },
      { label: 'Learning days', value: overview.learningDays, kind: 'int' },
    ];
    const row = document.getElementById('statRow');
    row.innerHTML = stats.map((s) => `
      <div class="card stat-card hoverable" data-anim="card">
        <div class="stat">
          <div class="stat-label">${h.escape(s.label)}</div>
          <div class="stat-value" data-stat>0${s.kind === 'pct' ? '%' : ''}</div>
        </div>
      </div>`).join('');

    row.querySelectorAll('[data-stat]').forEach((el, i) => {
      const s = stats[i];
      const target = Number(s.value) || 0;
      if (!window.gsap || (window.fx && fx.reduceMotion)) {
        el.textContent = s.kind === 'pct' ? target + '%' : target;
        return;
      }
      const obj = { v: 0 };
      gsap.to(obj, {
        v: target, duration: 1.1, ease: 'power2.out', delay: 0.1 + i * 0.05,
        onUpdate: () => {
          const n = s.kind === 'pct' ? obj.v.toFixed(1) : Math.round(obj.v);
          el.textContent = s.kind === 'pct' ? n + '%' : n.toLocaleString();
        },
      });
    });
  }

  /* ============ Timeline chart ============ */
  function renderTimeline(timeline) {
    if (!window.Chart) return;
    if (timelineChart) timelineChart.destroy();
    const tl = timeline.items || [];
    timelineChart = charts.line(
      document.getElementById('timeline'),
      tl.map((r) => r.date),
      tl.map((r) => r.n),
      'Applied'
    );
  }

  /* ============ Activity list ============ */
  function renderActivity(apps, interviews, tasks) {
    const events = [];

    apps.slice(0, 30).forEach((a) => {
      events.push({
        when: new Date(a.updatedAt || a.createdAt),
        href: '#/applications',
        icon: ic.apps,
        color: 'blue',
        title: `${a.role}`,
        sub: `${a.companyId?.name || a.companyName || '—'} · ${a.status}`,
        amount: a.salaryMin ? `${(a.salaryMin / 100000).toFixed(1)}L` : '',
      });
    });

    interviews.slice(0, 30).forEach((i) => {
      events.push({
        when: new Date(i.scheduledAt || i.updatedAt || i.createdAt),
        href: '#/interviews',
        icon: ic.interview,
        color: 'violet',
        title: `${i.roundType} interview`,
        sub: i.applicationId?.role
          ? `${i.applicationId.role} · ${i.applicationId.companyName || ''}`
          : i.outcome,
        amount: i.confidence ? `${i.confidence}/5` : '',
      });
    });

    tasks.slice(0, 30).forEach((t) => {
      if (!t.lastCompletionAt && !t.lastReminderSentAt) return;
      events.push({
        when: new Date(t.lastCompletionAt || t.lastReminderSentAt || t.updatedAt),
        href: '#/tasks',
        icon: ic.task,
        color: t.lastCompletionAt ? 'emerald' : 'amber',
        title: t.title,
        sub: `${t.category} · ${t.lastCompletionAt ? 'completed' : 'reminded'}`,
        amount: t.streakCount ? `🔥 ${t.streakCount}` : '',
      });
    });

    events.sort((a, b) => b.when - a.when);
    const top = events.slice(0, 8);

    const list = document.getElementById('activityList');
    if (!top.length) {
      list.innerHTML = `<div class="empty"><h3>Nothing yet</h3><p>Add an application or task to start your timeline.</p></div>`;
      return;
    }
    list.innerHTML = top.map((e) => `
      <a class="activity-row" href="${e.href}">
        <div class="icon-avatar color-${e.color}">${e.icon}</div>
        <div class="body">
          <div class="title">${h.escape(e.title)}</div>
          <div class="sub">${h.escape(e.sub || '')}</div>
        </div>
        <div class="meta">
          ${e.amount ? `<div class="amount">${h.escape(e.amount)}</div>` : ''}
          <span class="muted" style="font-size:11px">${h.fmtRelDays(e.when)}</span>
        </div>
      </a>`).join('');
  }

  /* ============ Follow-ups ============ */
  function renderFollowups(apps) {
    const upcoming = apps
      .filter((a) => a.nextFollowUpAt)
      .sort((a, b) => new Date(a.nextFollowUpAt) - new Date(b.nextFollowUpAt))
      .slice(0, 4);
    const fu = document.getElementById('followups');
    if (!upcoming.length) {
      fu.innerHTML = `<div class="muted" style="font-size:12.5px;padding:6px 0">No follow-ups scheduled.</div>`;
      return;
    }
    fu.innerHTML = upcoming.map((a) => `
      <div class="row-between" style="padding:9px 0;border-bottom:1px solid var(--border)">
        <div class="col" style="gap:2px;min-width:0">
          <div style="font-size:13px;color:var(--text-0);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${h.escape(a.role)}</div>
          <div class="muted" style="font-size:11.5px">${h.escape(a.companyId?.name || a.companyName || '—')} · ${h.fmtRelDays(a.nextFollowUpAt)}</div>
        </div>
        ${h.status(a.status)}
      </div>`).join('');
  }

  /* ============ Weekly widget ============ */
  function renderWeekly(w) {
    const goalsTotal = (w.goals || []).length;
    const goalsDone = (w.goals || []).filter((g) => g.done).length;
    const pct = goalsTotal ? Math.round((goalsDone / goalsTotal) * 100) : 0;
    document.getElementById('weeklyWidget').innerHTML = `
      <div class="row gap-4">
        ${h.ring(pct, 56)}
        <div class="col" style="gap:4px;flex:1;min-width:0">
          <div class="muted" style="font-size:11.5px">Week of ${h.fmtDate(w.weekStart)}</div>
          <div style="font-size:14px;color:var(--text-0)"><strong>${goalsDone}</strong> / ${goalsTotal} goals</div>
          <div class="muted" style="font-size:11.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
            ${(w.focusAreas || []).slice(0, 3).join(' · ') || 'No focus areas'}
          </div>
        </div>
      </div>
    `;
  }

  /* ============ Checklist ============ */
  function renderChecklist(d) {
    const items = [
      { label: 'Add your first project', done: d.projects.length > 0, href: '#/projects' },
      { label: 'Save a resume version', done: d.resumes.length > 0, href: '#/resumes' },
      { label: 'Track an application', done: d.applications.length > 0, href: '#/applications' },
      { label: 'Set up a recurring task', done: d.tasks.length > 0, href: '#/tasks' },
      { label: 'Log an interview round', done: d.interviews.length > 0, href: '#/interviews' },
      { label: 'Add a learning topic', done: d.learning.length > 0, href: '#/learning' },
    ];
    const done = items.filter((i) => i.done).length;
    document.getElementById('checklistProgress').textContent = `${done} of ${items.length}`;

    document.getElementById('checklist').innerHTML = items.map((i) => `
      <a class="checklist-item ${i.done ? 'done' : ''}" href="${i.href}">
        <div class="checklist-check">${ic.check}</div>
        <div class="checklist-text">${h.escape(i.label)}</div>
      </a>`).join('');
  }
})();
