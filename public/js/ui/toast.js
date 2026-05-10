window.toast = (function () {
  function show(msg, kind = 'info', ms = 3000) {
    const c = document.getElementById('toastContainer');
    if (!c) return;
    const el = document.createElement('div');
    el.className = `toast ${kind}`;
    el.textContent = msg;
    c.appendChild(el);
    if (window.fx && window.gsap && !fx.reduceMotion) {
      fx.toastIn(el);
    } else {
      requestAnimationFrame(() => el.classList.add('show'));
    }
    setTimeout(async () => {
      if (window.fx && window.gsap && !fx.reduceMotion) {
        await fx.toastOut(el);
      } else {
        el.classList.remove('show');
      }
      setTimeout(() => el.remove(), 200);
    }, ms);
  }
  return {
    show,
    ok: (m, ms) => show(m, 'ok', ms),
    bad: (m, ms) => show(m, 'bad', ms || 4500),
    info: (m, ms) => show(m, 'info', ms),
  };
})();
