export function createApiClient({ token, baseUrl = "/api", fetchImpl = fetch }) {
  return {
    getDashboard() {
      return fetchImpl(`${baseUrl}/dashboard`, {
        headers: {
          "x-auth-token": token,
        },
      });
    },
  };
}
