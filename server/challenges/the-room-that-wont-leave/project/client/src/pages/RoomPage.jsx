import { useCallback, useState } from 'react';
import { usePresenceFeed } from '../hooks/usePresenceFeed.js';
import { useResource } from '../hooks/useResource.js';
import { MemberList } from '../components/MemberList.jsx';
import { Notice } from '../components/Notice.jsx';
import { LoadingState } from '../components/LoadingState.jsx';
export function RoomPage({ onPresence }) {
  const [revision, setRevision] = useState(0);
  const receivePresence = useCallback(event => {
    onPresence(event);
    setRevision(value => value + 1);
  }, [onPresence]);
  usePresenceFeed(receivePresence);
  const members = useResource('/api/members', revision);
  const [error, setError] = useState(null);
  return <section><h1>Team room</h1><Notice error={error || members.error}/><LoadingState loading={members.loading}><MemberList members={members.data?.members || []} onError={setError}/></LoadingState></section>;
}
