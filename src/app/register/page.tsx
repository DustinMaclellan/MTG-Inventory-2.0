import { redirect } from "next/navigation";
import { registerAction } from "@/app/actions";
import { AuthChrome } from "@/components/auth-chrome";
import { AuthForm } from "@/components/auth-form";
import { interpolate } from "@/i18n";
import { getRequestMessages } from "@/i18n/request";
import { getCurrentUser } from "@/lib/auth";
import { TRIAL_DAYS } from "@/lib/constants";

export const metadata = { title: "Create account" };

export default async function RegisterPage() {
  if (await getCurrentUser()) redirect("/dashboard");
  const { m } = await getRequestMessages();
  return (
    <AuthChrome
      eyebrow={m.auth.createAccount}
      title={m.auth.registerTitle}
      subtitle={interpolate(m.auth.registerSubtitle, { days: TRIAL_DAYS })}
    >
      <AuthForm action={registerAction} mode="register" />
    </AuthChrome>
  );
}
