import { redirect } from "next/navigation";
import { loginAction } from "@/app/actions";
import { AuthChrome } from "@/components/auth-chrome";
import { AuthForm } from "@/components/auth-form";
import { getCurrentUser } from "@/lib/auth";

export const metadata = { title: "Sign in" };

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/dashboard");
  return (
    <AuthChrome
      eyebrow="Welcome back"
      title="Sign in to your collection"
      subtitle="Your inventory and portfolio data stay private to your account."
    >
      <AuthForm action={loginAction} mode="login" />
    </AuthChrome>
  );
}
