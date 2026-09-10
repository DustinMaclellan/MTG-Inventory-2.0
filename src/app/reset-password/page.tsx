import { resetPasswordAction } from "@/app/actions";
import { AuthChrome } from "@/components/auth-chrome";
import { ResetPasswordForm } from "@/components/reset-password-form";

export const metadata = { title: "Reset password" };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const token = (await searchParams).token ?? "";
  return (
    <AuthChrome
      eyebrow="Choose a new password"
      title="Reset password"
      subtitle="Use a password with at least 10 characters. This link works once."
    >
      <ResetPasswordForm action={resetPasswordAction} token={token} />
    </AuthChrome>
  );
}
