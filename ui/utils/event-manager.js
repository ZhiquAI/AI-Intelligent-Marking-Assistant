const channels = new Map();

export function on(channel, handler) {
  const list = channels.get(channel) || [];
  list.push(handler);
  channels.set(channel, list);
  return () => off(channel, handler);
}

export function off(channel, handler) {
  const list = channels.get(channel) || [];
  const i = list.indexOf(handler);
  if (i >= 0) list.splice(i, 1);
  channels.set(channel, list);
}

export function emit(channel, payload) {
  const list = channels.get(channel) || [];
  list.forEach(fn => {
    try { fn(payload); } catch {}
  });
}