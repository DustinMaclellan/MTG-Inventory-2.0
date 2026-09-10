import type { SubscriptionStatus } from "@prisma/client";

export type EntitlementUser = {
  trialEndsAt: Date;
  subscriptionStatus: SubscriptionStatus;
  stripeSubscriptionId: string | null;
  currentPeriodEnd: Date | null;
};

export function hasPaidAccess(user: EntitlementUser) {
  const now = Date.now();
  if (user.subscriptionStatus === "ACTIVE" || user.subscriptionStatus === "PAST_DUE") {
    return true;
  }
  if (user.subscriptionStatus === "TRIALING" && user.stripeSubscriptionId) {
    return true;
  }
  return Boolean(
    user.subscriptionStatus === "CANCELED" &&
      user.currentPeriodEnd &&
      user.currentPeriodEnd.getTime() > now,
  );
}

export function hasEntitlement(user: EntitlementUser) {
  if (user.trialEndsAt.getTime() > Date.now()) return true;
  return hasPaidAccess(user);
}

export function trialDaysRemaining(user: EntitlementUser) {
  if (hasPaidAccess(user)) return null;
  const ms = user.trialEndsAt.getTime() - Date.now();
  if (ms <= 0) return null;
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}

