/* App boot — registers nav, routes, top-level handlers */
(function () {
  const NAV = [
    { route: 'dashboard', label: 'Dashboard', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>' },
    { route: 'projects', label: 'Projects', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7l9-4 9 4v10l-9 4-9-4V7z"/><path d="M3 7l9 4 9-4"/><line x1="12" y1="11" x2="12" y2="21"/></svg>' },
    { route: 'applications', label: 'Applications', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 8v13H3V8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>' },
    { route: 'interviews', label: 'Interviews', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>' },
    { route: 'resumes', label: 'Resume Vault', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="15" y2="17"/></svg>' },
    { route: 'learning', label: 'Learning', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>' },
    { route: 'weekly', label: 'Weekly', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>' },
    { route: 'notes', label: 'Notes', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>' },
    { route: 'analytics', label: 'Analytics', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>' },
    { route: 'settings', label: 'Settings', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>' },
  ];

  // Bottom nav: 4 most-used items for thumb reach on mobile
  const BOTTOM = ['dashboard', 'applications', 'interviews', 'weekly'];

  function buildNav() {
    const nav = document.getElementById('nav');
    nav.innerHTML = '';
    NAV.forEach((item) => {
      const a = document.createElement('a');
      a.href = '#/' + item.route;
      a.className = 'nav-link';
      a.dataset.route = item.route;
      a.dataset.label = item.label; // for tooltip on tablet rail
      a.setAttribute('aria-label', item.label);
      a.innerHTML = `${item.icon}<span>${item.label}</span>`;
      a.addEventListener('click', () => {
        closeDrawer();
        // If clicking the route we're already on, scroll the view to top
        if (router.current === item.route) {
          const view = document.getElementById('view');
          view?.scrollTo({ top: 0, behavior: 'smooth' });
        }
      });
      nav.appendChild(a);
    });

    const bn = document.getElementById('bottomNav');
    bn.innerHTML = '';
    BOTTOM.forEach((r) => {
      const item = NAV.find((n) => n.route === r);
      if (!item) return;
      const a = document.createElement('a');
      a.href = '#/' + item.route;
      a.dataset.route = item.route;
      a.setAttribute('aria-label', item.label);
      a.innerHTML = `${item.icon}<span>${item.label}</span>`;
      a.addEventListener('click', () => {
        if (router.current === item.route) {
          document.getElementById('view')?.scrollTo({ top: 0, behavior: 'smooth' });
        }
      });
      bn.appendChild(a);
    });
  }

  function bindHeaderUser() {
    const user = auth.getUser() || {};
    const av = document.getElementById('userAvatar');
    if (av) av.textContent = (user.name || user.email || 'F').slice(0, 1).toUpperCase();
    const un = document.getElementById('userName');
    if (un) un.textContent = user.name || 'Operator';
    const ue = document.getElementById('userEmail');
    if (ue) ue.textContent = user.email || '';
  }

  function openDrawer() {
    if (window.innerWidth > 640) return;
    document.getElementById('sidebar')?.classList.add('open');
    document.getElementById('sidebarBackdrop')?.classList.add('open');
    document.body.classList.add('drawer-open');
  }
  function closeDrawer() {
    document.getElementById('sidebar')?.classList.remove('open');
    document.getElementById('sidebarBackdrop')?.classList.remove('open');
    document.body.classList.remove('drawer-open');
  }
  function toggleDrawer() {
    const sb = document.getElementById('sidebar');
    if (sb?.classList.contains('open')) closeDrawer();
    else openDrawer();
  }
  // Expose for router
  window.__forge = window.__forge || {};
  window.__forge.closeDrawer = closeDrawer;

  function bindMobileDrawer() {
    const ham = document.getElementById('hamburger');
    const bd = document.getElementById('sidebarBackdrop');
    if (ham) ham.addEventListener('click', toggleDrawer);
    if (bd) bd.addEventListener('click', closeDrawer);

    // Escape closes
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeDrawer();
    });

    // Drawer must close if window resizes past mobile breakpoint
    window.addEventListener('resize', () => {
      if (window.innerWidth > 640) closeDrawer();
    });
  }

  function bindLogout() {
    document.getElementById('logoutBtn')?.addEventListener('click', () => auth.logout());
  }

  function bindKeyboard() {
    let g = false;
    let gT;
    document.addEventListener('keydown', (e) => {
      if (e.target.matches('input, textarea, [contenteditable]')) return;
      if (e.key === 'g') {
        g = true;
        clearTimeout(gT);
        gT = setTimeout(() => { g = false; }, 800);
        return;
      }
      if (g) {
        const map = { d: 'dashboard', a: 'applications', i: 'interviews', p: 'projects', r: 'resumes', l: 'learning', w: 'weekly', n: 'notes', y: 'analytics', s: 'settings' };
        if (map[e.key]) { router.go(map[e.key]); g = false; }
      }
    });
  }

  function registerRoutes() {
    [
      pages.dashboard, pages.projects, pages.applications, pages.interviews,
      pages.resumes, pages.learning, pages.weekly, pages.notes,
      pages.analytics, pages.settings,
    ].forEach((p) => router.register(p.name, p));
  }

  function waitForGSAP() {
    return new Promise((resolve) => {
      if (window.gsap) return resolve();
      let tries = 0;
      const t = setInterval(() => {
        if (window.gsap || ++tries > 30) { clearInterval(t); resolve(); }
      }, 50);
    });
  }

  document.addEventListener('DOMContentLoaded', async () => {
    buildNav();
    bindHeaderUser();
    bindMobileDrawer();
    bindLogout();
    bindKeyboard();
    registerRoutes();
    if (!location.hash) location.hash = '#/dashboard';

    // GSAP loads via <script defer> — wait briefly so boot animation runs
    await waitForGSAP();

    if (window.fx) {
      fx.initAOS();
      fx.bootApp();
      fx.moveNavIndicator();
      fx.bindMagneticButtons(document);
      fx.bindRipples(document);
    }
    auth.refresh().then(bindHeaderUser).catch(() => {});
    // Pull persisted theme from MongoDB (UserSettings) and apply if changed
    if (window.themes && window.themes.syncFromServer) {
      themes.syncFromServer().catch(() => {});
    }
    router.render();
  });
})();
