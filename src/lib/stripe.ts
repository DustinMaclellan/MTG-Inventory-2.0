import "server-only";

import Stripe from "stripe";

const globalForStripe = globalThis as unknown as { stripe?: Stripe | null };

export function getStripe() {
  if (globalForStripe.stripe !== undefined) return globalForStripe.stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  globalForStripe.stripe = key ? new Stripe(key) : null;
  return globalForStripe.stripe;
}

export function isBillingConfigured() {
  return Boolean(
    process.env.STRIPE_SECRET_KEY &&
      process.env.STRIPE_PRICE_MONTHLY &&
      process.env.STRIPE_PRICE_YEARLY,
  );
}

export function stripePriceId(interval: "monthly" | "yearly") {
  return interval === "yearly" ? process.env.STRIPE_PRICE_YEARLY : process.env.STRIPE_PRICE_MONTHLY;
}

export function subscriptionPeriodEnd(subscription: Stripe.Subscription) {
  const fromSubscription =
    "current_period_end" in subscription ? Number(subscription.current_period_end) : NaN;
  if (Number.isFinite(fromSubscription) && fromSubscription > 0) {
    return new Date(fromSubscription * 1000);
  }
  const fromItem = subscription.items.data[0];
  if (fromItem && "current_period_end" in fromItem && fromItem.current_period_end) {
    return new Date(Number(fromItem.current_period_end) * 1000);
  }
  return null;
}
