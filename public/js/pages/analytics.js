pages.analytics = (function () {
  const charts_ = {};

  return {
    name: 'analytics',
    title: 'Analytics',

    async render(view) {
      view.innerHTML = `
        <div class="page-header"><h1>Analytics</h1><span class="muted mono" style="font-size:11px">Last refresh: ${h.fmtDateTime(new Date())}</span></div>

        <div class="grid grid-2">
          <div class="card"><div class="card-header"><div class="card-title">Applications timeline</div></div><div style="height:240px"><canvas id="aTl"></canvas></div></div>
          <div class="card"><div class="card-header"><div class="card-title">Status funnel</div></div><div style="height:240px"><canvas id="aFun"></canvas></div></div>
        </div>

        <div class="grid grid-2" style="margin-top:16px">
          <div class="card"><div class="card-header"><div class="card-title">Rejection reasons</div></div><div style="height:280px"><canvas id="aRej"></canvas></div></div>
          <div class="card"><div class="card-header"><div class="card-title">Interview performance</div></div><div style="height:280px"><canvas id="aInt"></canvas></div></div>
        </div>

        <div class="card" style="margin-top:16px">
          <div class="card-header"><div class="card-title">Resume effectiveness</div></div>
          <div style="height:300px"><canvas id="aRes"></canvas></div>
        </div>

        <div class="card" style="margin-top:16px">
          <div class="card-header">
            <div class="card-title">Failure Intelligence — recurring weak concepts</div>
            <span class="card-sub">Top 30 across interviews + rejections</span>
          </div>
          <div id="weakHeat" style="display:flex;flex-wrap:wrap;gap:6px"></div>
        </div>

        <div class="card" style="margin-top:16px">
          <div class="card-header"><div class="card-title">Consistency</div></div>
          <div id="consistency" style="overflow-x:auto"></div>
        </div>
      `;
    },

    async afterRender() {
      try {
        const [tl, rej, intp, res, weak, cons, overview] = await Promise.all([
          api.get('/analytics/applications-timeline'),
          api.get('/analytics/rejection-reasons'),
          api.get('/analytics/interview-performance'),
          api.get('/analytics/resume-performance'),
          api.get('/analytics/weak-concepts'),
          api.get('/analytics/consistency'),
          api.get('/analytics/overview'),
        ]);

        // Destroy any old charts
        Object.values(charts_).forEach((c) => c?.destroy?.());

        if (window.Chart) {
          charts_.tl = charts.line(
            document.getElementById('aTl'),
            (tl.items || []).map((r) => r.date),
            (tl.items || []).map((r) => r.n),
            'Applications'
          );

          const sc = overview.statusCounts || {};
          const order = ['Wishlist', 'Applied', 'OA', 'Interviewing', 'Offer', 'Rejected'];
          charts_.fun = charts.bar(
            document.getElementById('aFun'),
            order,
            order.map((s) => sc[s] || 0),
            { label: 'Count', colors: ['#6B7184', '#3B82F6', '#8B5CF6', '#F59E0B', '#10B981', '#EF4444'] }
          );

          charts_.rej = charts.bar(
            document.getElementById('aRej'),
            (rej.items || []).map((r) => r.tag),
            (rej.items || []).map((r) => r.n),
            { horizontal: true, colors: '#EF4444' }
          );

          const months = (intp.items || []).map((r) => r.month);
          charts_.int = charts.groupedBar(document.getElementById('aInt'), months, [
            { label: 'Passed', data: (intp.items || []).map((r) => r.passed), color: '#10B981' },
            { label: 'Failed', data: (intp.items || []).map((r) => r.failed), color: '#EF4444' },
          ]);

          charts_.res = charts.groupedBar(
            document.getElementById('aRes'),
            (res.items || []).map((r) => r.version),
            [
              { label: 'Callback %', data: (res.items || []).map((r) => r.callbackRate) },
              { label: 'Interview %', data: (res.items || []).map((r) => r.interviewRate) },
              { label: 'Offer %', data: (res.items || []).map((r) => r.offerRate) },
            ]
          );
        }

        // Failure Intelligence heatmap-ish — proportional chips
        const heat = document.getElementById('weakHeat');
        const top = (weak.top || []);
        const max = top[0]?.total || 1;
        heat.innerHTML = top.length ? top.map((t) => {
          const intensity = Math.round((t.total / max) * 100);
          return `<span class="chip" style="background:rgba(124,92,255,${0.15 + (intensity / 100) * 0.5});border-color:rgba(124,92,255,${0.2 + (intensity / 100) * 0.4});color:var(--text-0);font-size:13px;padding:6px 12px">
            ${h.escape(t.tag)} <span class="mono muted" style="margin-left:4px">×${t.total}</span>
          </span>`;
        }).join('') : '<div class="muted">No weak concepts captured yet.</div>';

        // Consistency heatmap (last 16 weeks)
        const cons2 = document.getElementById('consistency');
        const days = 16 * 7;
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        start.setDate(start.getDate() - days + 1);
        const counts = Object.fromEntries((cons.learning || []).map((r) => [r.date, r.n]));
        let cells = '';
        for (let i = 0; i < days; i++) {
          const d = new Date(start);
          d.setDate(start.getDate() + i);
          const key = d.toISOString().slice(0, 10);
          const n = counts[key] || 0;
          const lvl = n === 0 ? '' : n === 1 ? 'l1' : n === 2 ? 'l2' : n === 3 ? 'l3' : 'l4';
          cells += `<div class="heatmap-cell ${lvl}" title="${key} · ${n}"></div>`;
        }
        cons2.innerHTML = `<div class="heatmap">${cells}</div>`;
      } catch (e) { toast.bad(e.message); }
    },
  };
})();
