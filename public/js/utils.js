/* global utilities */
const Utils = {
  debounce(fn, delay) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  },

  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  basename(filePath) {
    return filePath.split('/').pop();
  },

  dirname(filePath) {
    const parts = filePath.split('/');
    parts.pop();
    return parts.join('/');
  },

  stripExtension(filename) {
    return filename.replace(/\.md$/, '');
  },
};
