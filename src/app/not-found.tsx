import Link from "next/link";
import { MarketingShell } from "@/components/marketing-shell";
import { getRequestMessages } from "@/i18n/request";

export default async function NotFound() {
  const { m } = await getRequestMessages();
  return (
    <MarketingShell>
      <div className="mx-auto max-w-lg px-5 py-24 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-accent">404</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">{m.errors.pageNotFound}</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-500">{m.errors.pageNotFoundBody}</p>
        <Link href="/" className="button-primary mt-8 inline-flex text-sm">
          {m.errors.goHome}
        </Link>
      </div>
    </MarketingShell>
  );
}
