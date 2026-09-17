import { useEffect, useState } from "react";
import { readJson } from "../api/http.js";

export function useDashboard(apiClient) {
  const [state, setState] = useState({ data: null, error: null, loading: true });

  useEffect(() => {
    let active = true;
    apiClient.getDashboard()
      .then(readJson)
      .then((data) => active && setState({ data, error: null, loading: false }))
      .catch((error) => active && setState({ data: null, error, loading: false }));
    return () => { active = false; };
  }, [apiClient]);

  return state;
}
