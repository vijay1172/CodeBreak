import { updatePresence } from '../api/presence.js';
export function MemberList({ members, onError }) {
  return <ul>{members.map(member => <li key={member.handle}>{member.name} — {member.status} <button onClick={() => updatePresence(member.handle, member.status === 'online' ? 'away' : 'online').catch(onError)}>Change status</button></li>)}</ul>;
}
