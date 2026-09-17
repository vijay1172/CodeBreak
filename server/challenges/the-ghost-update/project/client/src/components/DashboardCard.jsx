export function DashboardCard({ title, value }) {
  return (
    <article className="dashboard-card">
      <h2>{title}</h2>
      <strong>{value}</strong>
    </article>
  );
}
