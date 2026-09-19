import { useCallback, useEffect, useState } from 'react';
import { AppHeader } from './components/AppHeader.jsx';
import { NotificationTray } from './components/NotificationTray.jsx';
import { RoomPage } from './pages/RoomPage.jsx';
import { closePresenceSource } from './realtime/presenceSource.js';
export function App() {
  const [screen, setScreen] = useState('room');
  const [messages, setMessages] = useState([]);
  const notify = useCallback(event => setMessages(old => [...old.slice(-49), event.name + ' is ' + event.status]), []);
  useEffect(() => () => closePresenceSource(), []);
  return <><AppHeader name="Teamspace" description="Shared room and presence updates"/><main><nav><button onClick={() => setScreen('room')}>Team room</button><button onClick={() => setScreen('notes')}>Project notes</button></nav>{screen === 'room' ? <RoomPage onPresence={notify}/> : <section><h1>Project notes</h1><p>The next review is on Thursday.</p></section>}<NotificationTray messages={messages}/></main></>;
}
