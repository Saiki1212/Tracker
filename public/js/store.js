/* Tiny pub/sub state cache with TTL */
window.store = (function () {
  const cache = new Map();
  const subs = new Map();
  const DEFAULT_TTL = 60 * 1000;

  function set(key, value, ttl = DEFAULT_TTL) {
    cache.set(key, { value, expires: Date.now() + ttl });
    (subs.get(key) || []).forEach((fn) => fn(value));
  }

  function get(key) {
    const entry = cache.get(key);
    if (!entry) return null;
    if (entry.expires < Date.now()) {
      cache.delete(key);
      return null;
    }
    return entry.value;
  }

  function invalidate(prefix = '') {
    [...cache.keys()].forEach((k) => {
      if (k.startsWith(prefix)) cache.delete(k);
    });
  }

  function subscribe(key, fn) {
    if (!subs.has(key)) subs.set(key, []);
    subs.get(key).push(fn);
    return () => {
      const arr = subs.get(key) || [];
      subs.set(key, arr.filter((f) => f !== fn));
    };
  }

  return { get, set, invalidate, subscribe };
})();
