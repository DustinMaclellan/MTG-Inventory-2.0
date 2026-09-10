import { resetPasswordAction } from "@/app/actions";
import { AuthChrome } from "@/components/auth-chrome";
import { ResetPasswordForm } from "@/components/reset-password-form";
import { getRequestMessages } from "@/i18n/request";

export const metadata = { title: "Reset password" };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const token = (await searchParams).token ?? "";
  const { m } = await getRequestMessages();
  return (
    <AuthChrome
      eyebrow={m.auth.resetTitle}
      title={m.auth.forgotTitle}
      subtitle={m.auth.resetSubtitle}
    >
      <ResetPasswordForm action={resetPasswordAction} token={token} />
    </AuthChrome>
  );
}
