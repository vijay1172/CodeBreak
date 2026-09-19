import type { Metadata } from "next";
import "./globals.css";
import "@fontsource-variable/manrope";
import { Notifications } from "@/components/site-shell";
import { ThemeProvider } from "@/components/theme-provider";

export const metadata: Metadata = {
  metadataBase: new URL("https://codebreak-vijay1172s-projects.vercel.app"),
  title: { default: "CodeBreak — Code debugging practice on real repo bugs", template: "%s | CodeBreak" },
  description: "Practice code debugging in full MERN repos — the repo-based pattern behind Amazon’s new OA and SDE-1 interviews. Find the bug, fix it, prove it with live tests.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "CodeBreak",
    title: "CodeBreak — Code debugging practice on real repo bugs",
    description: "Fix real bugs in full MERN repos and prove the fix with live tests. Repo-based debugging practice for SDE-1 interview and OA prep.",
    url: "/",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "CodeBreak — code debugging practice on real repo bugs" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "CodeBreak — Code debugging practice on real repo bugs",
    description: "Fix real bugs in full MERN repos and prove the fix with live tests. Repo-based debugging practice for SDE-1 interview and OA prep.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased"><ThemeProvider><a className="skip-link" href="#main-content">Skip to content</a>{children}<Notifications/></ThemeProvider></body>
    </html>
  );
}
