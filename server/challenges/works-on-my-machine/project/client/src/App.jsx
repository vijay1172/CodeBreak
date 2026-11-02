import { useMemo } from "react";
import { createApiClient } from "./api/apiClient.js";
import { DashboardPage } from "./pages/DashboardPage.jsx";

const previewEnv = {
  VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL || window.location.origin,
};

export function App({ token, env = previewEnv, fetchImpl = fetch }) {
  const apiClient = useMemo(() => createApiClient({ token, env, fetchImpl }), [token, env, fetchImpl]);
  return <DashboardPage apiClient={apiClient} />;
}
