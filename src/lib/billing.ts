import "server-only";

import type { SubscriptionStatus } from "@prisma/client";
import type Stripe from "stripe";
import { db } from "@/lib/db";
import { subscriptionPeriodEnd } from "@/lib/stripe";

export function mapStripeStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  switch (status) {
    case "active":
      return "ACTIVE";
    case "trialing":
      return "TRIALING";
    case "past_due":
      return "PAST_DUE";
    case "unpaid":
    case "incomplete":
      return "UNPAID";
    default:
      return "CANCELED";
  }
}

export async function applyStripeSubscription(userId: string, subscription: Stripe.Subscription) {
  await db.user.update({
    where: { id: userId },
    data: {
      stripeCustomerId:
        typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer.id,
      stripeSubscriptionId: subscription.id,
      subscriptionStatus: mapStripeStatus(subscription.status),
      currentPeriodEnd: subscriptionPeriodEnd(subscription),
    },
  });
}

export async function findUserIdForSubscription(subscription: Stripe.Subscription) {
  const fromMetadata = subscription.metadata.userId;
  if (fromMetadata) return fromMetadata;

  const customerId =
    typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
  const byCustomer = await db.user.findUnique({
    where: { stripeCustomerId: customerId },
    select: { id: true },
  });
  if (byCustomer) return byCustomer.id;

  const bySubscription = await db.user.findUnique({
    where: { stripeSubscriptionId: subscription.id },
    select: { id: true },
  });
  return bySubscription?.id ?? null;
}
