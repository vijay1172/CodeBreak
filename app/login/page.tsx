import { AuthForm } from "@/components/auth-form";
export const metadata = { title: "Log in to your debugging practice", description: "Log in to BrokenRepo to resume your code debugging practice, saved code, and challenge progress.", alternates: { canonical: "/login" } };
export default function Page() { return <AuthForm mode="login"/>; }
