import { MarketingShell } from "@/components/marketing-shell";
import { getRequestMessages } from "@/i18n/request";

export const metadata = { title: "Terms of Service" };

export default async function TermsPage() {
  const { m } = await getRequestMessages();
  return (
    <MarketingShell>
      <article className="legal-copy mx-auto max-w-3xl px-5 py-16">
        <h1>{m.legal.termsTitle}</h1>
        <p>{m.legal.termsUpdated}</p>
        <h2>{m.legal.termsService}</h2>
        <p>{m.legal.termsServiceBody}</p>
        <h2>{m.legal.termsAccount}</h2>
        <p>{m.legal.termsAccountBody}</p>
        <h2>{m.legal.termsData}</h2>
        <p>{m.legal.termsDataBody}</p>
        <h2>{m.legal.termsPayments}</h2>
        <p>{m.legal.termsPaymentsBody}</p>
        <h2>{m.legal.termsThird}</h2>
        <p>{m.legal.termsThirdBody}</p>
        <h2>{m.legal.termsDisclaimer}</h2>
        <p>{m.legal.termsDisclaimerBody}</p>
        <h2>{m.legal.termsContact}</h2>
        <p>{m.legal.termsContactBody}</p>
      </article>
    </MarketingShell>
  );
}
