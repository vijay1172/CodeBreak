import { AuthForm } from "@/components/auth-form";
export const metadata = { title: "Create an account", description: "Create your CodeBreak account to save debugging practice, code, and challenge progress." };
export default function Page() { return <AuthForm mode="signup"/>; }
