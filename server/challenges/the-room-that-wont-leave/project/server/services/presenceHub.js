import { EventEmitter } from 'node:events';
export function createPresenceHub() {
  const events = new EventEmitter();
  events.setMaxListeners(100);
  return {
    publish: update => events.emit('presence', update),
    subscribe(listener) {
      events.on('presence', listener);
      return () => events.off('presence', listener);
    },
  };
}
