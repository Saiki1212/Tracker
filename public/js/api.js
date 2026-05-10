/* Auth-aware fetch wrapper. All API calls go through this. */
window.api = (function () {
  const TOKEN_KEY = 'forge.token';

  function token() {
    return localStorage.getItem(TOKEN_KEY);
  }

  async function request(path, opts = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
    };
    const t = token();
    if (t) headers['Authorization'] = `Bearer ${t}`;

    const r = await fetch('/api' + path, { ...opts, headers });

    if (r.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem('forge.user');
      location.replace('/index.html');
      throw new Error('Unauthorized');
    }

    const ct = r.headers.get('content-type') || '';
    const data = ct.includes('application/json') ? await r.json() : await r.text();
    if (!r.ok) {
      const msg = (data && data.error) || `HTTP ${r.status}`;
      const err = new Error(msg);
      err.status = r.status;
      err.details = data && data.details;
      throw err;
    }
    return data;
  }

  return {
    get: (p) => request(p),
    post: (p, body) => request(p, { method: 'POST', body: JSON.stringify(body || {}) }),
    patch: (p, body) => request(p, { method: 'PATCH', body: JSON.stringify(body || {}) }),
    del: (p) => request(p, { method: 'DELETE' }),
  };
})();
