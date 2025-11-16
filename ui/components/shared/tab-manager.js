export class TabManager {
  constructor(root) {
    this.root = root;
    this.tabs = Array.from(root.querySelectorAll('.zhixue-ai-tab'));
    this.contents = Array.from(root.querySelectorAll('.tab-content'));
  }

  bind() {
    this.tabs.forEach(btn => {
      btn.addEventListener('click', () => {
        const name = btn.dataset.tab;
        this.switchTo(name);
      });
    });
  }

  switchTo(name) {
    this.tabs.forEach(t => {
      if (t.dataset.tab === name) t.classList.add('active'); else t.classList.remove('active');
    });
    this.contents.forEach(c => {
      const id = c.id.replace('tab-', '');
      if (id === name) c.style.display = 'block'; else c.style.display = 'none';
    });
    this.root.dispatchEvent(new CustomEvent('tab-switched', { detail: { tab: name } }));
    try {
      const p = chrome.runtime.getURL('ui/utils/event-manager.js');
      import(p).then(m => m.emit('ui/tab-switched', { tab: name })).catch(() => {});
    } catch {}
  }

  destroy() {
    this.tabs.forEach(btn => {
      const clone = btn.cloneNode(true);
      btn.parentNode.replaceChild(clone, btn);
    });
  }
}