import { useEffect, useState } from 'react';
import { ProfileForm } from '../components/ProfileForm.jsx';
import { loadProfile, saveProfileName } from '../api/userApi.js';
import { createProfileSaver } from '../hooks/useProfile.js';
export function ProfilePage() {
  const [name, setName] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    loadProfile().then((profile) => { if (active) { setName(profile.name); setLoaded(true); } })
      .catch(() => { if (active) setError("The profile could not be loaded."); });
    return () => { active = false; };
  }, []);
  const saver = createProfileSaver({ saveName: saveProfileName, displayName: name, setDisplayName: setName });
  return <><h1>Your profile</h1>{error ? <p role="alert">{error}</p> : !loaded ? <p role="status">Loading profile…</p> :
    <ProfileForm displayName={name} onSave={(next) => saver.save(next)} />}</>;
}
