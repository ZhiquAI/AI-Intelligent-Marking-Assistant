export function injectStyles(relativePath) {
  try {
    const existing = document.querySelector(`link[data-zhixue-ui-css="${relativePath}"]`);
    if (existing) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    const href = typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL
      ? chrome.runtime.getURL(`ui/styles/${relativePath}`)
      : `ui/styles/${relativePath}`;
    link.href = href;
    link.setAttribute('data-zhixue-ui-css', relativePath);
    document.head.appendChild(link);
  } catch {}
}

export function ensureStyles(paths = []) {
  paths.forEach(p => injectStyles(p));
}