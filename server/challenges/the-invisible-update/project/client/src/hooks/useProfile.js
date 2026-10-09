export function createProfileSaver({ saveName, displayName, setDisplayName }) {
  return {
    displayName,
    async save(nextName) {
      setDisplayName(nextName);
      try {
        const saved = await saveName(nextName);
        setDisplayName(saved.name);
        return { ok: true };
      } catch (error) {
        console.warn('Profile save failed:', error.message);
        return { ok: false };
      }
    },
  };
}