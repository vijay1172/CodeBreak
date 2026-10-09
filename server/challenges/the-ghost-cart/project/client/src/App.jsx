import { AppHeader } from './components/AppHeader.jsx';
import { DashboardPage } from './pages/DashboardPage.jsx';
export function App() { return <><AppHeader name='Membership' description='Plans and premium access'/><DashboardPage plan='free' /></>; }