import type { Metadata } from "next";
import "./globals.css";
import "@fontsource-variable/manrope";
import { Notifications } from "@/components/site-shell";
import { ThemeProvider } from "@/components/theme-provider";

export const metadata: Metadata = {
  title: { default: "CodeBreak — Practice debugging real code", template: "%s | CodeBreak" },
  description: "Find and fix bugs in JavaScript, React, and Express projects. Practice in a real sandbox, run tests on your changes, and save your progress.",
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
