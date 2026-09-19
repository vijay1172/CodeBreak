import { AuthForm } from "@/components/auth-form";
export const metadata = { title: "Log in", description: "Log in to CodeBreak to resume your debugging challenges and saved code." };
export default function Page() { return <AuthForm mode="login"/>; }
