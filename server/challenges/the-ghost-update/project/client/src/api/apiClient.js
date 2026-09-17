export function createApiClient({ token, baseUrl = "/api", fetchImpl = fetch }) {
  return {
    getDashboard() {
      return fetchImpl(`${baseUrl}/dashboard`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    },
  };
}
