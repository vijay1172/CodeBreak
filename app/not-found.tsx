import Link from "next/link";
import { SiteHeader, SiteFooter } from "@/components/site-shell";
export const metadata = { title: "Page not found", description: "This BrokenRepo page could not be found. Return home or choose a debugging challenge." };
export default function NotFound() { return <><SiteHeader/><main id="main-content" tabIndex={-1} className="page-width not-found"><span className="error-number">404</span><h1>This route has a bug.</h1><p>The page you’re looking for isn’t here. The challenges are.</p><div className="hero-actions"><Link className="button" href="/challenges">Browse challenges</Link><Link className="underlined" href="/">Back to home</Link></div></main><SiteFooter/></>; }
