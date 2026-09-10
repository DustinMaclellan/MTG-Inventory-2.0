import { requestPasswordResetAction } from "@/app/actions";
import { AuthChrome } from "@/components/auth-chrome";
import { ForgotPasswordForm } from "@/components/forgot-password-form";

export const metadata = { title: "Forgot password" };

export default function ForgotPasswordPage() {
  return (
    <AuthChrome
      eyebrow="Account recovery"
      title="Reset your password"
      subtitle="Enter the email on your account. If it exists, we will send a reset link."
    >
      <ForgotPasswordForm action={requestPasswordResetAction} />
    </AuthChrome>
  );
}
