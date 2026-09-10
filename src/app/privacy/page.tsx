import { MarketingShell } from "@/components/marketing-shell";
import { getRequestMessages } from "@/i18n/request";

export const metadata = { title: "Privacy Policy" };

export default async function PrivacyPage() {
  const { m } = await getRequestMessages();
  return (
    <MarketingShell>
      <article className="legal-copy mx-auto max-w-3xl px-5 py-16">
        <h1>{m.legal.privacyTitle}</h1>
        <p>{m.legal.privacyUpdated}</p>
        <h2>{m.legal.privacyCollect}</h2>
        <ul>
          <li>{m.legal.privacyCollect1}</li>
          <li>{m.legal.privacyCollect2}</li>
          <li>{m.legal.privacyCollect3}</li>
          <li>{m.legal.privacyCollect4}</li>
        </ul>
        <h2>{m.legal.privacyNot}</h2>
        <p>{m.legal.privacyNotBody}</p>
        <h2>{m.legal.privacyUse}</h2>
        <p>{m.legal.privacyUseBody}</p>
        <h2>{m.legal.privacyCookies}</h2>
        <p>{m.legal.privacyCookiesBody}</p>
        <h2>{m.legal.privacyThird}</h2>
        <p>{m.legal.privacyThirdBody}</p>
        <h2>{m.legal.privacyRetention}</h2>
        <p>{m.legal.privacyRetentionBody}</p>
        <h2>{m.legal.privacyContact}</h2>
        <p>{m.legal.privacyContactBody}</p>
      </article>
    </MarketingShell>
  );
}
