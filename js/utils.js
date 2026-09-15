/* ============================================
   NEONWAVE — Shared Utilities
   ============================================ */

const Utils = {
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },
};
