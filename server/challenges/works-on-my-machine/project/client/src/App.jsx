import { useMemo } from "react";
import { createApiClient } from "./api/apiClient.js";
import { DashboardPage } from "./pages/DashboardPage.jsx";

export function App({ token }) {
  const apiClient = useMemo(() => createApiClient({ token }), [token]);
  return <DashboardPage apiClient={apiClient} />;
}
