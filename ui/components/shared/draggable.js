export const dragState = { isDragging: false };

export function makeDraggable(element, handle = null) {
  let startX = 0, startY = 0;
  let initialX = 0, initialY = 0;
  let moved = false;
  const target = handle || element;

  function onStart(e) {
    const p = e.type === 'touchstart' ? e.touches[0] : e;
    startX = p.clientX;
    startY = p.clientY;
    const rect = element.getBoundingClientRect();
    initialX = rect.left;
    initialY = rect.top;
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onEnd);
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', onEnd);
    moved = false;
  }

  function onMove(e) {
    if (e.type === 'touchmove') e.preventDefault();
    const p = e.type === 'touchmove' ? e.touches[0] : e;
    const dx = p.clientX - startX;
    const dy = p.clientY - startY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      moved = true;
      dragState.isDragging = true;
      let nx = initialX + dx;
      let ny = initialY + dy;
      const maxX = window.innerWidth - element.offsetWidth;
      const maxY = window.innerHeight - element.offsetHeight;
      nx = Math.max(0, Math.min(nx, maxX));
      ny = Math.max(0, Math.min(ny, maxY));
      element.style.left = nx + 'px';
      element.style.top = ny + 'px';
      element.style.right = 'auto';
      element.style.bottom = 'auto';
      element.style.position = 'fixed';
    }
  }

  function onEnd() {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onEnd);
    document.removeEventListener('touchmove', onMove);
    document.removeEventListener('touchend', onEnd);
    setTimeout(() => { dragState.isDragging = false }, 50);
  }

  target.addEventListener('mousedown', onStart);
  target.addEventListener('touchstart', onStart);
  return () => {
    target.removeEventListener('mousedown', onStart);
    target.removeEventListener('touchstart', onStart);
  };
}