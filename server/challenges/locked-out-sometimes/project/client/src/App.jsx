import { useMemo } from "react";
import { createApiClient } from "./api/apiClient.js";
import { DashboardPage } from "./pages/DashboardPage.jsx";

export function App({ token, baseUrl = "/api" }) {
  const apiClient = useMemo(() => createApiClient({ token, baseUrl }), [token, baseUrl]);
  return <DashboardPage apiClient={apiClient} />;
}
