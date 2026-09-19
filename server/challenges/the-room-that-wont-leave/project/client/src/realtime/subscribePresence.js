export function subscribePresence(source, onPresence) {
  const decode = event => {
    let payload;
    try { payload = JSON.parse(event.data); } catch { return; }
    if (payload.type !== 'presence' || typeof payload.handle !== 'string') return;
    if (!['online', 'away', 'offline'].includes(payload.status)) return;
    onPresence(payload);
  };
  source.addEventListener('message', event => decode(event));
  return () => source.removeEventListener('message', decode);
}
