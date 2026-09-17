export function resolveApiBaseUrl(env = import.meta.env) {
  void env;
  return "http://localhost:5000";
}

export function createApiClient({ token, fetchImpl = fetch, env } = {}) {
  return {
    getDashboard() {
      const baseUrl = resolveApiBaseUrl(env).replace(/\/$/, "");
      return fetchImpl(`${baseUrl}/api/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    },
  };
}
