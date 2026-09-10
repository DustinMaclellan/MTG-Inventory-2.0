import { describe, expect, it } from "vitest";
import { hasEntitlement, hasPaidAccess, trialDaysRemaining } from "./entitlements";

function user(
  overrides: Partial<{
    trialEndsAt: Date;
    subscriptionStatus: "TRIALING" | "ACTIVE" | "PAST_DUE" | "CANCELED" | "UNPAID";
    stripeSubscriptionId: string | null;
    currentPeriodEnd: Date | null;
  }> = {},
) {
  return {
    trialEndsAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    subscriptionStatus: "TRIALING" as const,
    stripeSubscriptionId: null,
    currentPeriodEnd: null,
    ...overrides,
  };
}

describe("hasEntitlement", () => {
  it("allows an in-progress app trial", () => {
    expect(hasEntitlement(user())).toBe(true);
  });

  it("blocks an expired app trial without a Stripe subscription", () => {
    expect(
      hasEntitlement(
        user({
          trialEndsAt: new Date(Date.now() - 60_000),
          subscriptionStatus: "TRIALING",
        }),
      ),
    ).toBe(false);
  });

  it("allows an active paid subscription after the app trial", () => {
    expect(
      hasEntitlement(
        user({
          trialEndsAt: new Date(Date.now() - 60_000),
          subscriptionStatus: "ACTIVE",
        }),
      ),
    ).toBe(true);
  });

  it("allows a canceled subscription until the paid period ends", () => {
    expect(
      hasEntitlement(
        user({
          trialEndsAt: new Date(Date.now() - 60_000),
          subscriptionStatus: "CANCELED",
          currentPeriodEnd: new Date(Date.now() + 86_400_000),
        }),
      ),
    ).toBe(true);
  });
});

describe("hasPaidAccess", () => {
  it("treats a Stripe-hosted trial as paid access", () => {
    expect(
      hasPaidAccess(
        user({
          trialEndsAt: new Date(Date.now() - 60_000),
          subscriptionStatus: "TRIALING",
          stripeSubscriptionId: "sub_123",
        }),
      ),
    ).toBe(true);
  });
});

describe("trialDaysRemaining", () => {
  it("hides the trial countdown once the user is paying", () => {
    expect(trialDaysRemaining(user({ subscriptionStatus: "ACTIVE" }))).toBeNull();
  });

  it("returns remaining whole days for an unpaid trial", () => {
    const days = trialDaysRemaining(
      user({ trialEndsAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 3_600_000) }),
    );
    expect(days).toBe(4);
  });
});
