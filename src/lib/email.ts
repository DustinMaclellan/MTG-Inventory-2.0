import "server-only";

import { Resend } from "resend";

export async function sendPasswordResetEmail(email: string, resetUrl: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.info(`[dev] Password reset for ${email}: ${resetUrl}`);
    return { delivered: false as const, resetUrl };
  }

  const resend = new Resend(key);
  const from = process.env.EMAIL_FROM ?? "Mystic Ledger <onboarding@resend.dev>";
  const result = await resend.emails.send({
    from,
    to: email,
    subject: "Reset your Mystic Ledger password",
    html: `
      <p>We received a request to reset the password for ${email}.</p>
      <p><a href="${resetUrl}">Choose a new password</a>. This link expires in one hour.</p>
      <p>If you did not request this, you can ignore this email.</p>
    `,
  });
  if (result.error) throw new Error(result.error.message);
  return { delivered: true as const };
}
