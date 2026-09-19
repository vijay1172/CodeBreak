import { useEffect } from 'react';
import { presenceSource } from '../realtime/presenceSource.js';
import { subscribePresence } from '../realtime/subscribePresence.js';
export function usePresenceFeed(onPresence, suppliedSource) {
  useEffect(() => {
    const source = suppliedSource || presenceSource();
    return subscribePresence(source, onPresence);
  }, [onPresence, suppliedSource]);
}
