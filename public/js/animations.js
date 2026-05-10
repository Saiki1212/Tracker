/* GSAP + AOS orchestration — premium dev-tool feel without overdoing it */
window.fx = (function () {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const has = () => window.gsap && !reduceMotion;

  function initAOS() {
    if (reduceMotion || !window.AOS) return;
    AOS.init({
      duration: 450,
      easing: 'ease-out-cubic',
      once: true,
      offset: 24,
      delay: 0,
    });
  }

  function refreshAOS() {
    if (window.AOS) AOS.refreshHard();
  }

  /* App boot — runs once after DOMContentLoaded.
     IMPORTANT: every gsap.from() must use clearProps so inline styles
     don't leak after the animation and fight the responsive CSS
     (especially the mobile drawer's translateX(-100%)). */
  function bootApp() {
    if (!has()) return;
    const isMobile = window.innerWidth <= 640;
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

    if (!isMobile) {
      // Slide the whole sidebar in only on desktop/tablet — mobile drawer
      // is already off-screen and shouldn't be animated at boot.
      tl.from('.sidebar', {
        x: -28, opacity: 0, duration: 0.45,
        clearProps: 'transform,opacity',
      });
    }

    tl.from('.sidebar-brand', {
      y: -10, opacity: 0, duration: 0.35,
      clearProps: 'transform,opacity',
    }, '-=0.25')
      .from('.nav .nav-link', {
        x: -16, opacity: 0, duration: 0.3, stagger: 0.035,
        clearProps: 'transform,opacity',
      }, '-=0.2')
      .from('.sidebar-footer', {
        y: 10, opacity: 0, duration: 0.3,
        clearProps: 'transform,opacity',
      }, '-=0.2')
      .from('.topbar', {
        y: -12, opacity: 0, duration: 0.35,
        clearProps: 'transform,opacity',
      }, isMobile ? '-=0.1' : '-=0.45')
      .from('.bottom-nav a', {
        y: 16, opacity: 0, duration: 0.25, stagger: 0.04,
        clearProps: 'transform,opacity',
      }, '-=0.2');
  }

  /* Page enter — fades view + staggers children */
  function pageEnter(view) {
    if (!view) return;
    if (!has()) {
      view.style.opacity = '1';
      return;
    }
    const tl = gsap.timeline({ defaults: { ease: 'power2.out' } });
    tl.fromTo(
      view,
      { opacity: 0, y: 6 },
      { opacity: 1, y: 0, duration: 0.25 }
    );
    const cards = view.querySelectorAll('[data-anim="card"], .card, .stat-card, .table-wrap, .kanban-col');
    if (cards.length) {
      tl.from(
        cards,
        {
          y: 12,
          opacity: 0,
          duration: 0.4,
          stagger: { each: 0.04, from: 'start' },
          clearProps: 'transform,opacity',
        },
        '-=0.1'
      );
    }
    const header = view.querySelector('.page-header');
    if (header) {
      tl.from(header, { x: -10, opacity: 0, duration: 0.3, clearProps: 'all' }, 0);
    }
  }

  /* Page exit — short fade out, returns a Promise resolving when done */
  function pageExit(view) {
    if (!view) return Promise.resolve();
    if (!has()) return Promise.resolve();
    return new Promise((resolve) => {
      gsap.to(view, {
        opacity: 0,
        y: -4,
        duration: 0.14,
        ease: 'power1.in',
        onComplete: resolve,
      });
    });
  }

  /* Animate progress rings from 0 → their --p value */
  function animateRings(scope = document) {
    if (!has()) return;
    scope.querySelectorAll('.ring').forEach((el) => {
      if (el.dataset.ringAnimated) return;
      const target = parseFloat(getComputedStyle(el).getPropertyValue('--p')) || 0;
      el.style.setProperty('--p', '0');
      const obj = { p: 0 };
      gsap.to(obj, {
        p: target,
        duration: 1.1,
        ease: 'power2.out',
        delay: 0.15,
        onUpdate: () => el.style.setProperty('--p', obj.p),
      });
      const label = el.querySelector('.ring-label');
      if (label) {
        const labelObj = { v: 0 };
        gsap.to(labelObj, {
          v: target,
          duration: 1.1,
          ease: 'power2.out',
          delay: 0.15,
          onUpdate: () => { label.textContent = Math.round(labelObj.v) + '%'; },
        });
      }
      el.dataset.ringAnimated = '1';
    });
  }

  /* Animate progress bars from 0 → width */
  function animateProgress(scope = document) {
    if (!has()) return;
    scope.querySelectorAll('.progress-bar').forEach((el) => {
      if (el.dataset.barAnimated) return;
      const target = el.style.width || '0%';
      el.style.width = '0%';
      gsap.to(el, { width: target, duration: 0.9, ease: 'power2.out', delay: 0.2 });
      el.dataset.barAnimated = '1';
    });
  }

  /* Animated number counter */
  function countUp(el, to, duration = 1) {
    if (!el) return;
    if (!has()) {
      el.textContent = to;
      return;
    }
    const obj = { v: 0 };
    gsap.to(obj, {
      v: to,
      duration,
      ease: 'power2.out',
      onUpdate: () => {
        el.textContent = Math.round(obj.v).toLocaleString();
      },
    });
  }

  /* Modal open/close — GSAP scale+fade with rubber-band */
  function modalIn(backdrop, panel) {
    if (!has()) return;
    gsap.fromTo(backdrop, { opacity: 0 }, { opacity: 1, duration: 0.18, ease: 'power1.out' });
    gsap.fromTo(
      panel,
      { y: 24, opacity: 0, scale: 0.96 },
      { y: 0, opacity: 1, scale: 1, duration: 0.32, ease: 'back.out(1.4)' }
    );
  }

  function modalOut(backdrop, panel) {
    if (!has()) return Promise.resolve();
    return new Promise((resolve) => {
      const tl = gsap.timeline({ onComplete: resolve });
      tl.to(panel, { y: 12, opacity: 0, scale: 0.98, duration: 0.16, ease: 'power1.in' })
        .to(backdrop, { opacity: 0, duration: 0.14 }, '-=0.1');
    });
  }

  /* Drawer slide */
  function drawerIn(backdrop, panel) {
    if (!has()) return;
    gsap.fromTo(backdrop, { opacity: 0 }, { opacity: 1, duration: 0.18 });
    gsap.fromTo(panel, { x: 64, opacity: 0 }, { x: 0, opacity: 1, duration: 0.35, ease: 'power3.out' });
  }

  /* Hover lift / press feedback for cards */
  function bindCardHover(scope = document) {
    if (!has()) return;
    scope.querySelectorAll('.card.hoverable, .kanban-card').forEach((el) => {
      if (el.dataset.hoverBound) return;
      el.dataset.hoverBound = '1';
      el.addEventListener('mouseenter', () => {
        if (window.matchMedia('(hover: none)').matches) return;
        gsap.to(el, { y: -2, duration: 0.18, ease: 'power2.out' });
      });
      el.addEventListener('mouseleave', () => {
        gsap.to(el, { y: 0, duration: 0.22, ease: 'power2.out' });
      });
      el.addEventListener('pointerdown', () => {
        gsap.to(el, { scale: 0.985, duration: 0.08, ease: 'power1.out' });
      });
      el.addEventListener('pointerup', () => {
        gsap.to(el, { scale: 1, duration: 0.18, ease: 'back.out(2)' });
      });
      el.addEventListener('pointerleave', () => {
        gsap.to(el, { scale: 1, duration: 0.18 });
      });
    });
  }

  /* Animate the active nav indicator (left bar) sliding between routes */
  function moveNavIndicator() {
    const nav = document.getElementById('nav');
    if (!nav) return;
    let bar = nav.querySelector('.nav-indicator');
    if (!bar) {
      bar = document.createElement('span');
      bar.className = 'nav-indicator';
      nav.appendChild(bar);
    }
    const active = nav.querySelector('.nav-link.active');
    if (!active) {
      bar.style.opacity = '0';
      return;
    }
    const r = active.getBoundingClientRect();
    const nr = nav.getBoundingClientRect();
    const top = r.top - nr.top + 8;
    const height = r.height - 16;
    if (!has()) {
      bar.style.opacity = '1';
      bar.style.top = top + 'px';
      bar.style.height = height + 'px';
      return;
    }
    gsap.to(bar, {
      top, height, opacity: 1,
      duration: 0.32,
      ease: 'power3.out',
    });
  }

  /* Toast slide-in */
  function toastIn(el) {
    if (!has()) return;
    gsap.fromTo(el, { x: 32, opacity: 0 }, { x: 0, opacity: 1, duration: 0.28, ease: 'power3.out' });
  }
  function toastOut(el) {
    if (!has()) return Promise.resolve();
    return new Promise((resolve) => {
      gsap.to(el, { x: 32, opacity: 0, duration: 0.22, ease: 'power2.in', onComplete: resolve });
    });
  }

  /* Pulse a status pill or chip when it changes */
  function pulse(el) {
    if (!has() || !el) return;
    gsap.fromTo(
      el,
      { scale: 1.18, filter: 'brightness(1.4)' },
      { scale: 1, filter: 'brightness(1)', duration: 0.45, ease: 'power2.out' }
    );
  }

  /* Shake on error */
  function shake(el) {
    if (!has() || !el) return;
    gsap.fromTo(
      el,
      { x: -8 },
      { x: 0, duration: 0.4, ease: 'elastic.out(1, 0.4)' }
    );
  }

  return {
    initAOS, refreshAOS,
    bootApp, pageEnter, pageExit,
    countUp, pulse, shake,
    animateRings, animateProgress,
    modalIn, modalOut, drawerIn,
    bindCardHover, moveNavIndicator,
    toastIn, toastOut,
    get reduceMotion() { return reduceMotion; },
  };
})();
