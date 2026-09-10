import { MarketingShell } from "@/components/marketing-shell";

export const metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <MarketingShell>
      <article className="legal-copy mx-auto max-w-3xl px-5 py-16">
        <h1>Privacy Policy</h1>
        <p>Last updated September 9, 2026. This describes what Mystic Ledger stores today.</p>
        <h2>What we collect</h2>
        <ul>
          <li>Account data: display name, email, hashed password, session tokens.</li>
          <li>Collection data: printings, quantities, finishes, conditions, purchase prices, storage notes.</li>
          <li>Billing data: Stripe customer and subscription identifiers. Card numbers stay with Stripe.</li>
          <li>Password-reset tokens, stored only as hashes, until they expire.</li>
        </ul>
        <h2>What we do not collect</h2>
        <p>
          We do not sell your inventory data. We do not run advertising pixels on the product pages.
          We do not store raw payment card numbers.
        </p>
        <h2>How data is used</h2>
        <p>
          We use your account to sign you in, calculate portfolio totals, process subscriptions, and
          send transactional email such as password resets. Shared catalog rows (card names, set
          codes, Scryfall prices) are not personal and are reused across accounts.
        </p>
        <h2>Cookies</h2>
        <p>
          A single HTTP-only session cookie named <code>mystic_session</code> keeps you signed in. It
          is not used for advertising.
        </p>
        <h2>Third parties</h2>
        <p>
          Stripe processes payments. Resend sends password-reset email when configured. Scryfall
          provides card data and hosts card images that the app displays. Hosting and database
          providers for a given deployment can also process the data needed to run the app.
        </p>
        <h2>Retention and deletion</h2>
        <p>
          We keep your account until you delete it in Settings or ask us to remove it. You can export
          your collection as CSV at any time. After deletion, billing history may remain in Stripe.
        </p>
        <h2>Contact</h2>
        <p>Privacy requests can be sent to the operator of this deployment using your account email.</p>
      </article>
    </MarketingShell>
  );
}
