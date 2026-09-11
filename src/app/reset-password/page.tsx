import { resetPasswordAction } from "@/app/actions";
import { AuthChrome } from "@/components/auth-chrome";
import { ResetPasswordForm } from "@/components/reset-password-form";
import { interpolate } from "@/i18n";
import { getRequestMessages } from "@/i18n/request";
import { PASSWORD_MIN_LENGTH } from "@/lib/password";

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
      subtitle={interpolate(m.auth.resetSubtitle, { count: PASSWORD_MIN_LENGTH })}
    >
      <ResetPasswordForm action={resetPasswordAction} token={token} />
    </AuthChrome>
  );
}
