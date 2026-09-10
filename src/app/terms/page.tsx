import { MarketingShell } from "@/components/marketing-shell";

export const metadata = { title: "Terms of Service" };

export default function TermsPage() {
  return (
    <MarketingShell>
      <article className="legal-copy mx-auto max-w-3xl px-5 py-16">
        <h1>Terms of Service</h1>
        <p>Last updated September 9, 2026. These terms govern use of Mystic Ledger. They are a practical template, not legal advice.</p>
        <h2>The service</h2>
        <p>
          Mystic Ledger is a collection manager for Magic: The Gathering cards. You get a 14-day
          trial, then continued access requires a paid subscription. We may change prices or features
          with notice on the pricing page.
        </p>
        <h2>Your account</h2>
        <p>
          You must provide an accurate email and keep your password confidential. You are responsible
          for activity on your account. We may suspend accounts that abuse the service, scrape
          provider APIs through the app, or violate the law.
        </p>
        <h2>Your data</h2>
        <p>
          Inventory you enter belongs to you. We store it to provide the product. You can export a CSV
          and delete your account from Settings. Deleting an account removes your inventory, sessions,
          and profile from our database.
        </p>
        <h2>Payments</h2>
        <p>
          Subscriptions are processed by Stripe. Taxes, invoices, cancellations, and card updates are
          handled in the Stripe Customer Portal. Access continues through the end of a paid period if
          you cancel.
        </p>
        <h2>Third-party data</h2>
        <p>
          Card metadata, prices, and images come from Scryfall. Mystic Ledger is unofficial and is not
          affiliated with Wizards of the Coast. Trademarks belong to their owners.
        </p>
        <h2>Disclaimer</h2>
        <p>
          The service is provided as-is. Market values are estimates from third-party feeds and are
          not investment advice. We are not liable for lost profits, collection mistakes, or outages
          beyond the amount you paid us in the previous three months.
        </p>
        <h2>Contact</h2>
        <p>Questions about these terms can be sent to the email you used to register, or the operator of this deployment.</p>
      </article>
    </MarketingShell>
  );
}
