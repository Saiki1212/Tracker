pages.settings = (function () {
  return {
    name: 'settings',
    title: 'Settings',
    async render(view) {
      const u = auth.getUser() || {};
      const current = themes.get();
      const dark = themes.byMode('dark');
      const light = themes.byMode('light');

      view.innerHTML = `
        <div class="page-header"><h1>Settings</h1></div>

        <div class="card" data-anim="card" style="max-width:760px">
          <div class="card-header">
            <div class="card-title">Appearance</div>
            <span class="card-sub" id="modeLabel"></span>
          </div>

          <div class="row gap-2" style="margin-bottom:14px;flex-wrap:wrap">
            <button class="btn btn-sm" id="modeToggle" data-magnetic>
              <span id="modeIcon"></span>
              <span id="modeText"></span>
            </button>
            <span class="muted" style="font-size:12px">Or pick a specific theme below.</span>
          </div>

          <div class="muted" style="font-size:11px;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:8px">Dark</div>
          <div class="grid grid-4" id="darkGrid" style="margin-bottom:18px"></div>

          <div class="muted" style="font-size:11px;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:8px">Light</div>
          <div class="grid grid-4" id="lightGrid"></div>
        </div>

        <div class="card" data-anim="card" style="max-width:560px;margin-top:16px">
          <div class="card-header"><div class="card-title">Profile</div></div>
          <div class="field"><label>Name</label><div class="mono">${h.escape(u.name || '—')}</div></div>
          <div class="field"><label>Email</label><div class="mono">${h.escape(u.email || '—')}</div></div>
        </div>

        <div class="card" data-anim="card" style="max-width:560px;margin-top:16px">
          <div class="card-header"><div class="card-title">Change password</div></div>
          <div class="field"><label>Current password</label><input class="input" type="password" id="cur"></div>
          <div class="field"><label>New password (min 8 chars)</label><input class="input" type="password" id="nw"></div>
          <button class="btn btn-primary" id="changeBtn">Update</button>
        </div>

        <div class="card" data-anim="card" style="max-width:560px;margin-top:16px">
          <div class="card-header"><div class="card-title">Export data</div></div>
          <p class="muted" style="font-size:13px;margin-bottom:10px">Download all your collections as JSON.</p>
          <button class="btn" id="exportBtn">Export JSON</button>
        </div>

        <div class="card" data-anim="card" style="max-width:560px;margin-top:16px">
          <div class="card-header"><div class="card-title">Session</div></div>
          <button class="btn btn-danger" id="logoutBtn2">Sign out</button>
        </div>
      `;

      const dgrid = view.querySelector('#darkGrid');
      const lgrid = view.querySelector('#lightGrid');
      dgrid.innerHTML = dark.map(swatch).join('');
      lgrid.innerHTML = light.map(swatch).join('');
      this._bindSwatches(view);
      this._refreshModeChip();
    },

    _bindSwatches(view) {
      view.querySelectorAll('.theme-swatch').forEach((el) => {
        el.addEventListener('click', () => {
          themes.set(el.dataset.id);
          // Update selected state
          view.querySelectorAll('.theme-swatch').forEach((x) => x.classList.remove('selected'));
          el.classList.add('selected');
          this._refreshModeChip();
          toast.ok(`Theme: ${themes.getMeta(el.dataset.id).name}`, 1400);
        });
      });
    },

    _refreshModeChip() {
      const meta = themes.getMeta(themes.get());
      const isDark = meta.mode === 'dark';
      const lab = document.getElementById('modeLabel');
      const txt = document.getElementById('modeText');
      const icn = document.getElementById('modeIcon');
      if (lab) lab.textContent = `${meta.name} · ${meta.mode}`;
      if (txt) txt.textContent = isDark ? 'Switch to light' : 'Switch to dark';
      if (icn) icn.innerHTML = isDark
        ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>'
        : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
    },

    async afterRender(view) {
      const self = this;

      document.getElementById('modeToggle').onclick = () => {
        themes.toggleMode();
        // Re-mark selected and refresh chip
        const cur = themes.get();
        view.querySelectorAll('.theme-swatch').forEach((x) => {
          x.classList.toggle('selected', x.dataset.id === cur);
        });
        self._refreshModeChip();
      };

      document.getElementById('changeBtn').onclick = async () => {
        const cur = document.getElementById('cur').value;
        const nw = document.getElementById('nw').value;
        if (!cur || nw.length < 8) return toast.bad('Provide current + new (min 8 chars)');
        try {
          await api.post('/auth/change-password', { currentPassword: cur, newPassword: nw });
          toast.ok('Password updated');
          document.getElementById('cur').value = '';
          document.getElementById('nw').value = '';
        } catch (e) { toast.bad(e.message); }
      };
      document.getElementById('exportBtn').onclick = async () => {
        try {
          const [companies, projects, applications, interviews, resumes, learning, notes, weekly] = await Promise.all([
            api.get('/companies'), api.get('/projects'), api.get('/applications'),
            api.get('/interviews'), api.get('/resumes'), api.get('/learning'),
            api.get('/notes'), api.get('/weekly'),
          ]);
          const dump = {
            exportedAt: new Date().toISOString(),
            user: auth.getUser(),
            companies: companies.items, projects: projects.items, applications: applications.items,
            interviews: interviews.items, resumes: resumes.items, learning: learning.items,
            notes: notes.items, weekly: weekly.items,
          };
          const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `forge-export-${new Date().toISOString().slice(0, 10)}.json`;
          a.click();
          URL.revokeObjectURL(url);
          toast.ok('Exported');
        } catch (e) { toast.bad(e.message); }
      };
      document.getElementById('logoutBtn2').onclick = () => auth.logout();
    },
  };

  function swatch(t) {
    const sel = themes.get() === t.id ? 'selected' : '';
    const sub = t.mode === 'dark' ? '#0F1117' : '#FFFFFF';
    const subText = t.mode === 'dark' ? '#E6E8EE' : '#0F1320';
    return `<button
      type="button"
      class="theme-swatch ${sel}"
      data-id="${t.id}"
      data-name="${t.name}"
      style="--sw-bg:${t.bg};--sw-accent:${t.accent};--sw-accent-2:${t.accent2};--sw-text:${subText};--sw-card:${sub}"
      aria-label="${t.name} (${t.mode})"></button>`;
  }
})();
