import { AppHeader } from './components/AppHeader.jsx';
import { ProductsPage } from './pages/ProductsPage.jsx';
export function App() { return <><AppHeader name='Marketplace' description='Shop catalogue browser'/><ProductsPage shopId='shopA' /></>; }