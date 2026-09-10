import { requestPasswordResetAction } from "@/app/actions";
import { AuthChrome } from "@/components/auth-chrome";
import { ForgotPasswordForm } from "@/components/forgot-password-form";
import { getRequestMessages } from "@/i18n/request";

export const metadata = { title: "Forgot password" };

export default async function ForgotPasswordPage() {
  const { m } = await getRequestMessages();
  return (
    <AuthChrome
      eyebrow={m.auth.accountRecovery}
      title={m.auth.forgotTitle}
      subtitle={m.auth.forgotSubtitle}
    >
      <ForgotPasswordForm action={requestPasswordResetAction} />
    </AuthChrome>
  );
}
