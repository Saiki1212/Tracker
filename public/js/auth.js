window.auth = (function () {
  function getUser() {
    try {
      return JSON.parse(localStorage.getItem('forge.user') || 'null');
    } catch {
      return null;
    }
  }

  function logout() {
    localStorage.removeItem('forge.token');
    localStorage.removeItem('forge.user');
    location.replace('/index.html');
  }

  async function refresh() {
    try {
      const { user } = await api.get('/auth/me');
      localStorage.setItem('forge.user', JSON.stringify(user));
      return user;
    } catch {
      return getUser();
    }
  }

  return { getUser, logout, refresh };
})();
