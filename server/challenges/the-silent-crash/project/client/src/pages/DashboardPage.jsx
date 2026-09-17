import { DashboardCard } from "../components/DashboardCard.jsx";
import { LoadingState } from "../components/LoadingState.jsx";
import { useDashboard } from "../hooks/useDashboard.js";

export function DashboardPage({ apiClient }) {
  const { data, error, loading } = useDashboard(apiClient);
  if (loading) return <LoadingState />;
  if (error) return <p role="alert">{error.message}</p>;
  return <DashboardCard title="Account" value={data.message} />;
}
