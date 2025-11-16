/*
 * Local library loader for MV3 compliance
 * - Attempts to load local copies under libs/
 * - Falls back to safe no-op stubs to avoid runtime crashes
 */
(function () {
  const runtimeURL = (path) => {
    try {
      return typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL
        ? chrome.runtime.getURL(path)
        : path;
    } catch {
      return path;
    }
  };

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.onload = () => resolve(true);
      s.onerror = () => reject(new Error('load fail: ' + src));
      document.head.appendChild(s);
    });
  }

  function ensureStubbedGlobals() {
    // lucide
    if (typeof window.lucide === 'undefined') {
      window.lucide = { createIcons: function () { /* noop */ } };
    }

    // Chart.js
    if (typeof window.Chart === 'undefined') {
      window.Chart = function () {
        return { destroy: function(){}, update: function(){} };
      };
    }

    // jsPDF
    if (typeof window.jspdf === 'undefined') {
      window.jspdf = { jsPDF: function () { /* noop */ } };
    }

    // pdf.js
    if (typeof window.pdfjsLib === 'undefined') {
      window.pdfjsLib = {
        getDocument: function () { return { promise: Promise.reject(new Error('pdf.js not bundled')) }; }
      };
    }

    // Tesseract
    if (typeof window.Tesseract === 'undefined') {
      window.Tesseract = { recognize: async function(){ return { data: { text: '' } }; } };
    }

    // SheetJS
    if (typeof window.XLSX === 'undefined') {
      window.XLSX = {
        read: function(){ return {}; },
        utils: { sheet_to_json: function(){ return []; } }
      };
    }
  }

  async function init() {
    const libs = [
      'libs/lucide.min.js',
      'libs/chart.umd.min.js',
      'libs/jspdf.umd.min.js',
      'libs/pdf.min.js',
      'libs/tesseract.min.js',
      'libs/xlsx.full.min.js'
    ];

    for (const lib of libs) {
      try {
        await loadScript(runtimeURL(lib));
      } catch (_e) {
        // ignore, will stub later
      }
    }

    ensureStubbedGlobals();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

