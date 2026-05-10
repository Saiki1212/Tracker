pages.dashboard = (function () {
  let timelineChart, weakChart;

  return {
    name: 'dashboard',
    title: 'Dashboard',

    async render(view) {
      view.innerHTML = `
        <div class="page-header">
          <h1>Dashboard</h1>
          <span class="muted mono" style="font-size:11px">${h.fmtDate(new Date())}</span>
        </div>

        <div class="grid grid-4" style="margin-bottom:16px" id="statRow"></div>

        <div class="grid grid-2">
          <div class="card">
            <div class="card-header"><div class="card-title">Applications timeline</div><span class="card-sub">Last 90 days</span></div>
            <div style="height:220px"><canvas id="timeline"></canvas></div>
          </div>
          <div class="card">
            <div class="card-header"><div class="card-title">Failure Intelligence</div><span class="card-sub">Top weak concepts</span></div>
            <div style="height:220px"><canvas id="weakBar"></canvas></div>
          </div>
        </div>

        <div class="grid grid-2" style="margin-top:16px">
          <div class="card">
            <div class="card-header"><div class="card-title">Upcoming follow-ups</div></div>
            <div id="followups"></div>
          </div>
          <div class="card">
            <div class="card-header"><div class="card-title">This week</div><a class="btn btn-sm btn-ghost" href="#/weekly">Open</a></div>
            <div id="weekly"></div>
          </div>
        </div>
      `;
    },

    async afterRender(view) {
      try {
        const [overview, timeline, weak, apps, week] = await Promise.all([
          api.get('/analytics/overview'),
          api.get('/analytics/applications-timeline'),
          api.get('/analytics/weak-concepts'),
          api.get('/applications'),
          api.get('/weekly/current'),
        ]);

        // stats
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
              <div class="stat-value" data-stat data-kind="${s.kind}">0${s.kind === 'pct' ? '%' : ''}</div>
            </div>
          </div>`).join('');

        // animated counters with proper formatter
        row.querySelectorAll('[data-stat]').forEach((el, i) => {
          const s = stats[i];
          const target = Number(s.value) || 0;
          if (!window.gsap || (window.fx && fx.reduceMotion)) {
            el.textContent = s.kind === 'pct' ? target + '%' : target;
            return;
          }
          const obj = { v: 0 };
          gsap.to(obj, {
            v: target,
            duration: 1.2,
            ease: 'power2.out',
            delay: 0.1 + i * 0.05,
            onUpdate: () => {
              const n = s.kind === 'pct' ? obj.v.toFixed(1) : Math.round(obj.v);
              el.textContent = s.kind === 'pct' ? n + '%' : n.toLocaleString();
            },
          });
        });

        // charts
        if (window.Chart) {
          const tl = timeline.items || [];
          if (timelineChart) timelineChart.destroy();
          timelineChart = charts.line(
            document.getElementById('timeline'),
            tl.map((r) => r.date),
            tl.map((r) => r.n),
            'Applied'
          );
          const top = (weak.top || []).slice(0, 8);
          if (weakChart) weakChart.destroy();
          weakChart = charts.bar(
            document.getElementById('weakBar'),
            top.map((t) => t.tag),
            top.map((t) => t.total),
            { horizontal: true, label: 'Frequency' }
          );
        }

        // followups
        const upcoming = (apps.items || [])
          .filter((a) => a.nextFollowUpAt)
          .sort((a, b) => new Date(a.nextFollowUpAt) - new Date(b.nextFollowUpAt))
          .slice(0, 5);
        const fu = document.getElementById('followups');
        fu.innerHTML = upcoming.length
          ? upcoming.map((a) => `
            <div class="row-between" style="padding:10px 0;border-bottom:1px solid var(--border)">
              <div class="col" style="gap:2px">
                <div>${h.escape(a.role)} · <span class="muted">${h.escape(a.companyId?.name || a.companyName || '—')}</span></div>
                <div class="muted" style="font-size:12px">${h.fmtRelDays(a.nextFollowUpAt)}</div>
              </div>
              ${h.status(a.status)}
            </div>`).join('')
          : h.emptyState('No follow-ups scheduled', 'Set nextFollowUpAt on an application.');

        // weekly
        const w = week.item || {};
        const goalsTotal = (w.goals || []).length;
        const goalsDone = (w.goals || []).filter((g) => g.done).length;
        const pct = goalsTotal ? Math.round((goalsDone / goalsTotal) * 100) : 0;
        document.getElementById('weekly').innerHTML = `
          <div class="row gap-4">
            ${h.ring(pct, 64)}
            <div class="col" style="gap:6px">
              <div class="muted" style="font-size:12px">Week of ${h.fmtDate(w.weekStart)}</div>
              <div><strong>${goalsDone}</strong> / ${goalsTotal} goals done</div>
              <div class="muted" style="font-size:12px">${(w.focusAreas || []).slice(0,3).join(' · ') || 'No focus areas'}</div>
            </div>
          </div>
        `;
      } catch (e) {
        toast.bad(e.message);
      }
    },
  };
})();
