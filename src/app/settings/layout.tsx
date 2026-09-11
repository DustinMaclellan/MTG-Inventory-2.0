import { AppShell } from "@/components/app-shell";
import { SettingsNav } from "@/components/settings-nav";
import { getMessages, isLocale } from "@/i18n";
import { requireUser } from "@/lib/auth";

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const locale = isLocale(user.preferredLocale) ? user.preferredLocale : "en";
  const m = getMessages(locale);

  return (
    <AppShell user={user}>
      <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
        <header className="mb-8">
          <p className="text-sm text-zinc-500">{m.settings.eyebrow}</p>
          <h1 className="mt-0.5 text-3xl font-semibold tracking-tight">{m.settings.title}</h1>
        </header>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-10">
          <SettingsNav />
          <div className="min-w-0 flex-1">{children}</div>
        </div>
      </div>
    </AppShell>
  );
}
