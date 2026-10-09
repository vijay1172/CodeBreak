import { describe, it, expect, vi } from 'vitest';
import { createProfileSaver } from '../client/src/hooks/useProfile.js';
import { saveProfileName } from '../client/src/api/userApi.js';
describe('profile save flow', () => {
  it('sends profile saves to the current endpoint', async () => {
    const calls = [];
    vi.stubGlobal('fetch', async (url, init) => { calls.push({ url, init }); return { ok: true, json: async () => ({ name: JSON.parse(init.body).name }) }; });
    await saveProfileName('Renamed Person');
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe('/api/user/profile');
    expect(calls[0].init.method).toBe('PUT');
    vi.unstubAllGlobals();
  });
  it('reverts the shown name when a save fails', async () => {
    const seen = [];
    const saver = createProfileSaver({ saveName: async () => { throw new Error('offline'); }, displayName: 'Maya Rivera', setDisplayName: (value) => seen.push(value) });
    const result = await saver.save('Maya R. Chen');
    expect(result.ok).toBe(false);
    expect(seen.at(-1)).toBe('Maya Rivera');
  });
});