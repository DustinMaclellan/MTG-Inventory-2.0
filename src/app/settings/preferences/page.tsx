import { AccentForm } from "@/components/accent-form";
import { LanguageForm } from "@/components/locale-switcher";
import { getMessages, isLocale } from "@/i18n";
import { isAccent } from "@/lib/accent";
import { requireUser } from "@/lib/auth";
import { PreferencesForm } from "../settings-forms";

export const metadata = { title: "Preferences" };

export default async function SettingsPreferencesPage() {
  const user = await requireUser();
  const locale = isLocale(user.preferredLocale) ? user.preferredLocale : "en";
  const m = getMessages(locale);

  return (
    <div>
      <h2 className="text-xl font-semibold tracking-tight">{m.settings.preferences}</h2>
      <p className="mt-1 mb-6 text-sm leading-6 text-zinc-500">{m.settings.preferencesBody}</p>
      <div className="panel divide-y divide-white/6">
        <section className="p-6">
          <h3 className="text-sm font-semibold">{m.settings.language}</h3>
          <p className="mt-1 mb-5 text-sm text-zinc-500">{m.settings.languageBody}</p>
          <LanguageForm />
        </section>
        <section className="p-6">
          <h3 className="text-sm font-semibold">{m.settings.appearance}</h3>
          <p className="mt-1 mb-5 text-sm text-zinc-500">{m.settings.appearanceBody}</p>
          <AccentForm accent={isAccent(user.preferredAccent) ? user.preferredAccent : "emerald"} />
        </section>
        <section className="p-6">
          <h3 className="text-sm font-semibold">{m.settings.collection}</h3>
          <p className="mt-1 mb-5 text-sm text-zinc-500">{m.settings.collectionBody}</p>
          <PreferencesForm
            currency={user.preferredCurrency}
            lotsPerPage={user.lotsPerPage}
            defaultCondition={user.defaultCondition}
          />
        </section>
      </div>
    </div>
  );
}
