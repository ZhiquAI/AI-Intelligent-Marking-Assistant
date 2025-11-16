export const qs = (sel, root = document) => root.querySelector(sel);
export const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));
export const on = (el, evt, handler) => { if (el) el.addEventListener(evt, handler); };
export const appendHtml = (root, html) => { const wrap = document.createElement('div'); wrap.innerHTML = html; root.appendChild(wrap); return wrap; };