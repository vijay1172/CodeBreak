import { AuthForm } from "@/components/auth-form";
export const metadata = { title: "Create an account — free debugging practice", description: "Create a free BrokenRepo account to save your fix-the-code exercises and track progress across all fifteen debugging challenges.", alternates: { canonical: "/signup" } };
export default function Page() { return <AuthForm mode="signup"/>; }
