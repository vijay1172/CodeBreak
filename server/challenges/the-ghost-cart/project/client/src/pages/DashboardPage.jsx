import { PremiumBanner } from '../components/PremiumBanner.jsx';
export function DashboardPage({ plan }) {
  return <section><h1>Dashboard</h1><PremiumBanner isPremium={plan === 'premium'} /></section>;
}