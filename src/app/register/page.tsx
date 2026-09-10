import { redirect } from "next/navigation";
import { registerAction } from "@/app/actions";
import { AuthChrome } from "@/components/auth-chrome";
import { AuthForm } from "@/components/auth-form";
import { getCurrentUser } from "@/lib/auth";
import { TRIAL_DAYS } from "@/lib/constants";

export const metadata = { title: "Create account" };

export default async function RegisterPage() {
  if (await getCurrentUser()) redirect("/dashboard");
  return (
    <AuthChrome
      eyebrow="Start your ledger"
      title="Build a precise MTG inventory"
      subtitle={`Every printing, finish, condition, and acquisition stays distinct. ${TRIAL_DAYS} days free, no card required.`}
    >
      <AuthForm action={registerAction} mode="register" />
    </AuthChrome>
  );
}
