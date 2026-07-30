/*
  shared persistent store — load after core.js. attaches R1.store, the
  creationStorage.plain bridge with a localStorage fallback for desktop testing.
  values must be base64 (see AGENTS.md).
*/
window.R1 = window.R1 || {};
var R1 = window.R1;
R1.store = window.creationStorage?.plain || {
  async getItem(k) {
    return localStorage.getItem(k);
  },
  async setItem(k, v) {
    localStorage.setItem(k, v);
  },
  async removeItem(k) {
    localStorage.removeItem(k);
  },
};
