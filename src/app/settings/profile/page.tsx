import { getMessages, isLocale } from "@/i18n";
import { requireUser } from "@/lib/auth";
import { ProfileForm } from "../settings-forms";

export const metadata = { title: "Profile" };

export default async function SettingsProfilePage() {
  const user = await requireUser();
  const locale = isLocale(user.preferredLocale) ? user.preferredLocale : "en";
  const m = getMessages(locale);

  return (
    <div>
      <h2 className="text-xl font-semibold tracking-tight">{m.settings.profile}</h2>
      <p className="mt-1 mb-6 text-sm leading-6 text-zinc-500">{m.settings.profileBody}</p>
      <section className="panel p-6">
        <ProfileForm displayName={user.displayName} email={user.email} />
      </section>
    </div>
  );
}
