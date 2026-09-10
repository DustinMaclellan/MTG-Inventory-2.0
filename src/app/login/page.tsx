import { redirect } from "next/navigation";
import { loginAction } from "@/app/actions";
import { AuthChrome } from "@/components/auth-chrome";
import { AuthForm } from "@/components/auth-form";
import { getRequestMessages } from "@/i18n/request";
import { getCurrentUser } from "@/lib/auth";

export const metadata = { title: "Sign in" };

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/dashboard");
  const { m } = await getRequestMessages();
  return (
    <AuthChrome
      eyebrow={m.auth.welcomeBack}
      title={m.auth.signInTitle}
      subtitle={m.auth.signInSubtitle}
    >
      <AuthForm action={loginAction} mode="login" />
    </AuthChrome>
  );
}
