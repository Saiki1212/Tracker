pages.settings = (function () {
  return {
    name: 'settings',
    title: 'Settings',
    async render(view) {
      const u = auth.getUser() || {};
      view.innerHTML = `
        <div class="page-header"><h1>Settings</h1></div>

        <div class="card" style="max-width:560px">
          <div class="card-header"><div class="card-title">Profile</div></div>
          <div class="field"><label>Name</label><div class="mono">${h.escape(u.name || '—')}</div></div>
          <div class="field"><label>Email</label><div class="mono">${h.escape(u.email || '—')}</div></div>
        </div>

        <div class="card" style="max-width:560px;margin-top:16px">
          <div class="card-header"><div class="card-title">Change password</div></div>
          <div class="field"><label>Current password</label><input class="input" type="password" id="cur"></div>
          <div class="field"><label>New password (min 8 chars)</label><input class="input" type="password" id="nw"></div>
          <button class="btn btn-primary" id="changeBtn">Update</button>
        </div>

        <div class="card" style="max-width:560px;margin-top:16px">
          <div class="card-header"><div class="card-title">Export data</div></div>
          <p class="muted" style="font-size:13px;margin-bottom:10px">Download all your collections as JSON.</p>
          <button class="btn" id="exportBtn">Export JSON</button>
        </div>

        <div class="card" style="max-width:560px;margin-top:16px">
          <div class="card-header"><div class="card-title">Session</div></div>
          <button class="btn btn-danger" id="logoutBtn2">Sign out</button>
        </div>
      `;
    },
    async afterRender() {
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
})();
