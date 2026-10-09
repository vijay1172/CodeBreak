import { useEffect, useState } from 'react';
import { fetchJSON } from '../api/http.js';
export function useResource(url, revision = 0) {
  const key = url + '\n' + revision;
  const [state, setState] = useState({ key: null, data: null, error: null });
  useEffect(() => {
    const controller = new AbortController();
    fetchJSON(url, { signal: controller.signal })
      .then(data => { if (!controller.signal.aborted) setState({ key, data, error: null }); })
      .catch(error => { if (!controller.signal.aborted) setState({ key, data: null, error }); });
    return () => controller.abort();
  }, [url, key]);
  return state.key === key ? { ...state, loading: false } : { data: null, error: null, loading: true };
}
