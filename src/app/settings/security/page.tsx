import { DeleteAccountForm } from "@/components/billing-forms";
import { getMessages, isLocale } from "@/i18n";
import { requireUser } from "@/lib/auth";
import { PasswordForm } from "../settings-forms";

export const metadata = { title: "Security" };

export default async function SettingsSecurityPage() {
  const user = await requireUser();
  const locale = isLocale(user.preferredLocale) ? user.preferredLocale : "en";
  const m = getMessages(locale);

  return (
    <div>
      <h2 className="text-xl font-semibold tracking-tight">{m.settings.security}</h2>
      <p className="mt-1 mb-6 text-sm leading-6 text-zinc-500">{m.settings.securityBody}</p>
      <div className="space-y-6">
        <section className="panel p-6">
          <h3 className="text-sm font-semibold">{m.settings.password}</h3>
          <p className="mt-1 mb-5 text-sm text-zinc-500">{m.settings.passwordBody}</p>
          <PasswordForm />
        </section>
        <section className="panel border-rose-500/15 p-6">
          <h3 className="text-sm font-semibold text-rose-200">{m.settings.deleteAccount}</h3>
          <p className="mt-3 mb-5 text-sm leading-6 text-zinc-500">{m.settings.deleteBody}</p>
          <DeleteAccountForm />
        </section>
      </div>
    </div>
  );
}
