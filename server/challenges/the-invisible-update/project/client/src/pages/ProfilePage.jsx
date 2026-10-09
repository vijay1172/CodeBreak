import { useEffect, useState } from 'react';
import { ProfileForm } from '../components/ProfileForm.jsx';
import { loadProfile, saveProfileName } from '../api/userApi.js';
import { createProfileSaver } from '../hooks/useProfile.js';
export function ProfilePage() {
  const [name, setName] = useState('');
  useEffect(() => { loadProfile().then((p) => setName(p.name)).catch(() => setName('')); }, []);
  const saver = createProfileSaver({ saveName: saveProfileName, displayName: name, setDisplayName: setName });
  return <><h1>Your profile</h1><ProfileForm displayName={name} onSave={(next) => saver.save(next)} /></>;
}