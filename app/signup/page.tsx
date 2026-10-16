import { AuthForm } from "@/components/auth-form";
export const metadata = { title: "Create an account — free debugging practice", description: "Create a free BrokenRepo account to save your fix-the-code exercises and track progress across all twenty-five debugging challenges.", alternates: { canonical: "/signup" }, robots: { index: false, follow: false } };
export default function Page() { return <AuthForm mode="signup"/>; }
