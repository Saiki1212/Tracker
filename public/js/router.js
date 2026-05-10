/* Hash-based SPA router with GSAP-driven transitions */
window.router = (function () {
  const routes = new Map();
  let current = null;
  let rendering = false;

  function register(name, def) {
    routes.set(name, def);
  }

  function parseHash() {
    const raw = location.hash.replace(/^#\/?/, '');
    const [name, ...rest] = raw.split('/');
    return { name: name || 'dashboard', params: rest };
  }

  async function go(name, params = []) {
    const hash = '#/' + name + (params.length ? '/' + params.join('/') : '');
    if (location.hash !== hash) {
      location.hash = hash;
      return;
    }
    await render();
  }

  async function render() {
    if (rendering) return;
    rendering = true;
    const { name, params } = parseHash();
    const def = routes.get(name) || routes.get('dashboard');
    const view = document.getElementById('view');
    const titleEl = document.getElementById('topbarTitle');
    const actionsEl = document.getElementById('topbarActions');
    const isFirst = current === null;
    current = name;

    if (titleEl) titleEl.textContent = def.title || name;
    if (actionsEl) actionsEl.innerHTML = '';

    // Update nav active state
    document.querySelectorAll('.nav-link').forEach((el) => {
      el.classList.toggle('active', el.dataset.route === name);
    });
    document.querySelectorAll('.bottom-nav a').forEach((el) => {
      el.classList.toggle('active', el.dataset.route === name);
    });
    if (window.fx) fx.moveNavIndicator();

    // Close mobile drawer if open
    if (window.__forge?.closeDrawer) window.__forge.closeDrawer();

    // Exit current view (skip on first paint)
    if (!isFirst && window.fx) {
      await fx.pageExit(view);
    }

    view.classList.remove('view-enter');
    view.innerHTML = '<div class="empty"><div class="loader" style="margin: 0 auto;"></div></div>';
    view.style.opacity = '';
    view.style.transform = '';

    try {
      const html = await def.render(view, params);
      if (typeof html === 'string') view.innerHTML = html;

      if (def.afterRender) await def.afterRender(view, params);

      // Trigger animations after content is in DOM
      if (window.fx) {
        fx.pageEnter(view);
        fx.bindCardHover(view);
        fx.animateRings(view);
        fx.animateProgress(view);
        fx.refreshAOS();
      } else {
        // Fallback CSS stagger
        // eslint-disable-next-line no-unused-expressions
        view.offsetHeight;
        view.classList.add('view-enter');
      }

      if (def.renderActions && actionsEl) {
        const actions = def.renderActions(params);
        if (actions) {
          actionsEl.appendChild(actions);
          if (window.gsap && window.fx && !fx.reduceMotion) {
            gsap.from(actions.children, {
              y: -6, opacity: 0, duration: 0.3, stagger: 0.05, ease: 'power2.out',
              clearProps: 'all',
            });
          }
        }
      }
      view.scrollTop = 0;
    } catch (e) {
      console.error(e);
      view.innerHTML = `<div class="empty"><h3>Couldn't load ${name}</h3><p>${e.message || 'Error'}</p></div>`;
    } finally {
      rendering = false;
    }
  }

  window.addEventListener('hashchange', render);
  window.addEventListener('resize', () => {
    if (window.fx) fx.moveNavIndicator();
  });

  return { register, go, render, get current() { return current; } };
})();
