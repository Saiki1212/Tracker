/* Shared helpers, formatters, icon library */
window.h = (function () {
  function el(tag, props = {}, ...kids) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(props || {})) {
      if (k === 'class') node.className = v;
      else if (k === 'style' && typeof v === 'object') Object.assign(node.style, v);
      else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
      else if (k === 'html') node.innerHTML = v;
      else if (v !== undefined && v !== null && v !== false) node.setAttribute(k, v);
    }
    kids.flat().forEach((kid) => {
      if (kid == null || kid === false) return;
      node.appendChild(typeof kid === 'string' ? document.createTextNode(kid) : kid);
    });
    return node;
  }
  function escape(s) {
    if (s == null) return '';
    return String(s).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }
  function fmtDate(d) {
    if (!d) return '—';
    const x = new Date(d);
    if (isNaN(x)) return '—';
    return x.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }
  function fmtDateTime(d) {
    if (!d) return '—';
    const x = new Date(d);
    if (isNaN(x)) return '—';
    return x.toLocaleString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }
  function fmtRelDays(d) {
    if (!d) return '—';
    const now = Date.now();
    const t = new Date(d).getTime();
    const days = Math.round((now - t) / (24 * 3600 * 1000));
    if (days === 0) return 'today';
    if (days === 1) return 'yesterday';
    if (days > 0) return `${days}d ago`;
    return `in ${-days}d`;
  }
  function debounce(fn, ms = 200) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), ms);
    };
  }
  function startOfWeek(d = new Date()) {
    const x = new Date(d);
    const day = x.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    x.setDate(x.getDate() + diff);
    x.setHours(0, 0, 0, 0);
    return x;
  }
  function favicon(domain) {
    if (!domain) return '';
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`;
  }
  function stars(n) {
    let s = '<span class="stars">';
    for (let i = 1; i <= 5; i++) s += `<span class="star ${i <= n ? 'on' : ''}">★</span>`;
    return s + '</span>';
  }
  function status(s) {
    return `<span class="status-pill status-${s}">${s}</span>`;
  }
  function chip(text, cls = '') {
    return `<span class="chip ${cls}">${escape(text)}</span>`;
  }
  function progressBar(pct) {
    const p = Math.max(0, Math.min(100, +pct || 0));
    return `<div class="progress"><div class="progress-bar" style="width:${p}%"></div></div>`;
  }
  function ring(pct, size = 56) {
    const p = Math.max(0, Math.min(100, +pct || 0));
    return `<div class="ring" style="--p:${p};--size:${size}px"><span class="ring-label">${p}%</span></div>`;
  }
  function emptyState(title, sub) {
    return `<div class="empty"><h3>${escape(title)}</h3><p>${escape(sub || '')}</p></div>`;
  }

  // Common SVG icons
  const ic = {
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
    edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>',
    x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
    grid: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>',
    list: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><circle cx="4" cy="6" r="0.5" fill="currentColor"/><circle cx="4" cy="12" r="0.5" fill="currentColor"/><circle cx="4" cy="18" r="0.5" fill="currentColor"/></svg>',
    pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14V7l-7 -5 -7 5v10z"/></svg>',
    external: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>',
    chevron: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>',
  };

  return { el, escape, fmtDate, fmtDateTime, fmtRelDays, debounce, startOfWeek, favicon, stars, status, chip, progressBar, ring, emptyState, ic };
})();
