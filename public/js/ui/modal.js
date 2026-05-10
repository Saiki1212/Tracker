window.modal = (function () {
  let backdrop = null;
  let onCloseCb = null;

  function ensure() {
    if (backdrop) return;
    backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true">
        <div class="modal-header">
          <div class="modal-title" id="modalTitle">Title</div>
          <button class="btn btn-ghost btn-icon" id="modalClose" aria-label="Close">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="modal-body" id="modalBody"></div>
        <div class="modal-footer" id="modalFooter"></div>
      </div>`;
    document.body.appendChild(backdrop);
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) close();
    });
    backdrop.querySelector('#modalClose').addEventListener('click', close);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && backdrop.classList.contains('open')) close();
    });

    // swipe-down to dismiss on touch
    let startY = 0;
    const modalEl = backdrop.querySelector('.modal');
    modalEl.addEventListener('touchstart', (e) => {
      if (modalEl.scrollTop === 0) startY = e.touches[0].clientY;
    }, { passive: true });
    modalEl.addEventListener('touchmove', (e) => {
      if (!startY) return;
      const dy = e.touches[0].clientY - startY;
      if (dy > 80 && window.innerWidth <= 640) close();
    }, { passive: true });
    modalEl.addEventListener('touchend', () => { startY = 0; }, { passive: true });
  }

  function open({ title, body, footer, onClose }) {
    ensure();
    backdrop.querySelector('#modalTitle').textContent = title || '';
    const bodyEl = backdrop.querySelector('#modalBody');
    const footEl = backdrop.querySelector('#modalFooter');

    bodyEl.innerHTML = '';
    if (typeof body === 'string') bodyEl.innerHTML = body;
    else if (body instanceof Node) bodyEl.appendChild(body);

    footEl.innerHTML = '';
    if (footer) {
      if (typeof footer === 'string') footEl.innerHTML = footer;
      else if (footer instanceof Node) footEl.appendChild(footer);
    } else {
      footEl.style.display = 'none';
    }
    if (footer) footEl.style.display = '';

    onCloseCb = onClose || null;
    requestAnimationFrame(() => {
      backdrop.classList.add('open');
      if (window.fx && window.gsap && !fx.reduceMotion) {
        fx.modalIn(backdrop, backdrop.querySelector('.modal'));
      }
      const firstInput = backdrop.querySelector('input, textarea, select');
      if (firstInput && window.innerWidth > 640) firstInput.focus();
    });
  }

  async function close() {
    if (!backdrop) return;
    if (window.fx && window.gsap && !fx.reduceMotion) {
      await fx.modalOut(backdrop, backdrop.querySelector('.modal'));
    }
    backdrop.classList.remove('open');
    backdrop.style.opacity = '';
    const m = backdrop.querySelector('.modal');
    if (m) {
      m.style.opacity = '';
      m.style.transform = '';
    }
    if (onCloseCb) onCloseCb();
    onCloseCb = null;
  }

  function confirm(message, opts = {}) {
    return new Promise((resolve) => {
      const footer = document.createElement('div');
      const cancel = document.createElement('button');
      cancel.className = 'btn btn-ghost';
      cancel.textContent = opts.cancelLabel || 'Cancel';
      cancel.onclick = () => { close(); resolve(false); };
      const ok = document.createElement('button');
      ok.className = 'btn ' + (opts.danger ? 'btn-danger' : 'btn-primary');
      ok.textContent = opts.okLabel || 'Confirm';
      ok.onclick = () => { close(); resolve(true); };
      footer.appendChild(cancel);
      footer.appendChild(ok);
      open({ title: opts.title || 'Confirm', body: `<p>${message}</p>`, footer });
    });
  }

  return { open, close, confirm };
})();
