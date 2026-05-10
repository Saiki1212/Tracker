/* Theme system.
   - Source of truth: MongoDB (UserSettings.theme), accessed via /api/settings.
   - Local cache: localStorage 'forge.theme' (only to avoid first-paint flash
     while we fetch the server value).
   - Login screen always uses DEFAULT (Midnight); user theme only applies
     after authentication.
   - Theme switch uses View Transitions API where available. */
window.themes = (function () {
  const KEY = 'forge.theme';
  const DEFAULT = 'midnight';

  const ALL = [
    // Dark
    { id: 'midnight', name: 'Midnight', mode: 'dark',
      bg: '#0B0D14', accent: '#6366F1', accent2: '#06B6D4',
      blurb: 'Deep blue glass · indigo' },
    { id: 'graphite', name: 'Graphite', mode: 'dark',
      bg: '#0A0A0A', accent: '#3B82F6', accent2: '#FAFAFA',
      blurb: 'Pure neutral · monochrome' },
    { id: 'onyx', name: 'Onyx', mode: 'dark',
      bg: '#050608', accent: '#22D3EE', accent2: '#34D399',
      blurb: 'True black · terminal cyan' },
    { id: 'carbon', name: 'Carbon', mode: 'dark',
      bg: '#15110B', accent: '#F59E0B', accent2: '#F97316',
      blurb: 'Warm dark · amber' },
    // Light
    { id: 'paper', name: 'Paper', mode: 'light',
      bg: '#FAFAF8', accent: '#4F46E5', accent2: '#0891B2',
      blurb: 'Warm white · indigo' },
    { id: 'frost', name: 'Frost', mode: 'light',
      bg: '#FFFFFF', accent: '#2563EB', accent2: '#7C3AED',
      blurb: 'Pure white · sharp blue' },
    { id: 'linen', name: 'Linen', mode: 'light',
      bg: '#F6EFE0', accent: '#475569', accent2: '#B45309',
      blurb: 'Cream sand · slate + amber' },
    { id: 'pearl', name: 'Pearl', mode: 'light',
      bg: '#EFF4FA', accent: '#0F766E', accent2: '#4338CA',
      blurb: 'Cool blue-white · teal' },
  ];

  function getMeta(id) {
    return ALL.find((t) => t.id === id) || ALL[0];
  }

  function applyToDom(meta, opts = {}) {
    const root = document.documentElement;
    const swap = () => {
      root.setAttribute('data-theme', meta.id);
      root.style.colorScheme = meta.mode;
      const tc = document.querySelector('meta[name="theme-color"]');
      if (tc) tc.setAttribute('content', meta.bg);
    };
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (
      !opts.skipAnim &&
      !reduceMotion &&
      typeof document.startViewTransition === 'function' &&
      document.documentElement.getAttribute('data-theme')
    ) {
      document.startViewTransition(swap);
    } else {
      swap();
    }
    window.dispatchEvent(new CustomEvent('forge:theme', { detail: { id: meta.id, meta } }));
  }

  /* Apply locally (cache). Called for instant paint before server sync. */
  function applyLocal(id, opts) {
    const meta = getMeta(id);
    applyToDom(meta, opts);
    try { localStorage.setItem(KEY, meta.id); } catch {}
  }

  /* Set: apply locally + persist to server. Returns the applied id. */
  async function set(id) {
    const meta = getMeta(id);
    applyLocal(meta.id);
    try {
      if (window.api) {
        await api.patch('/settings', { theme: meta.id });
      }
    } catch (e) {
      console.warn('[themes] failed to save to server:', e.message);
      if (window.toast) toast.bad('Theme saved locally; failed to sync');
    }
    return meta.id;
  }

  /* Pull from server (called once after login) and apply if different
     from currently-applied local cache. */
  async function syncFromServer() {
    if (!window.api) return null;
    try {
      const { settings } = await api.get('/settings');
      const wanted = settings?.theme || DEFAULT;
      const current = document.documentElement.getAttribute('data-theme');
      if (wanted !== current) applyLocal(wanted);
      try { localStorage.setItem(KEY, wanted); } catch {}
      return wanted;
    } catch (e) {
      // Silent failure — keep whatever's cached
      return null;
    }
  }

  function get() {
    return document.documentElement.getAttribute('data-theme') || DEFAULT;
  }

  function list() { return ALL; }
  function byMode(mode) { return ALL.filter((t) => t.mode === mode); }

  function cycle() {
    const cur = getMeta(get());
    const sameMode = byMode(cur.mode);
    const i = sameMode.findIndex((t) => t.id === cur.id);
    return set(sameMode[(i + 1) % sameMode.length].id);
  }

  function toggleMode() {
    const cur = getMeta(get());
    const targetMode = cur.mode === 'dark' ? 'light' : 'dark';
    const lastKey = `forge.theme.last.${targetMode}`;
    let last = null;
    try { last = localStorage.getItem(lastKey); } catch {}
    const fallback = targetMode === 'dark' ? 'midnight' : 'paper';
    return set(last || fallback);
  }

  /* Force-apply default Midnight (used on login screen). */
  function applyDefault() {
    const root = document.documentElement;
    root.setAttribute('data-theme', DEFAULT);
    root.style.colorScheme = 'dark';
    const tc = document.querySelector('meta[name="theme-color"]');
    if (tc) tc.setAttribute('content', getMeta(DEFAULT).bg);
  }

  /* Apply cached theme on early script load (only when caller expects it).
     This is called from the bootstrap block at the bottom of this file
     based on the data-mode attribute on the script tag. */
  function applyCached() {
    let saved = DEFAULT;
    try { saved = localStorage.getItem(KEY) || DEFAULT; } catch {}
    const meta = getMeta(saved);
    document.documentElement.setAttribute('data-theme', meta.id);
    document.documentElement.style.colorScheme = meta.mode;
    const tc = document.querySelector('meta[name="theme-color"]');
    if (tc) tc.setAttribute('content', meta.bg);
  }

  // Track last-picked-per-mode so toggleMode() can restore it
  window.addEventListener('forge:theme', (e) => {
    try {
      localStorage.setItem(`forge.theme.last.${e.detail.meta.mode}`, e.detail.meta.id);
    } catch {}
  });

  return {
    DEFAULT, ALL,
    get, getMeta, list, byMode,
    set, applyLocal, applyDefault, applyCached, syncFromServer,
    cycle, toggleMode,
  };
})();

/* Bootstrap: read the <script data-mode="..."> attribute that loaded us.
   - data-mode="default" → force default theme (login screen)
   - data-mode="cached"  → apply cached theme immediately (app shell)
   If absent, default behaviour = cached. */
(function () {
  const tag = document.currentScript;
  const mode = tag && tag.dataset.mode;
  if (mode === 'default') {
    window.themes.applyDefault();
  } else {
    window.themes.applyCached();
  }
})();
