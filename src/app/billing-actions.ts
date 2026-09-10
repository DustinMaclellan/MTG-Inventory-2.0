"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import type { FormState } from "@/app/actions";
import { appUrl } from "@/lib/app-url";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getStripe, isBillingConfigured, stripePriceId } from "@/lib/stripe";

export async function startCheckoutAction(
  _: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const interval = z.enum(["monthly", "yearly"]).safeParse(formData.get("interval"));
  if (!interval.success) return { error: "Choose a monthly or yearly plan." };
  if (!isBillingConfigured()) {
    return { error: "Checkout is not configured yet. Add Stripe keys to enable billing." };
  }

  const stripe = getStripe();
  const price = stripePriceId(interval.data);
  if (!stripe || !price) return { error: "Checkout is not configured yet." };

  let customerId = user.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.displayName,
      metadata: { userId: user.id },
    });
    customerId = customer.id;
    await db.user.update({
      where: { id: user.id },
      data: { stripeCustomerId: customerId },
    });
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price, quantity: 1 }],
    success_url: `${appUrl()}/dashboard?checkout=success`,
    cancel_url: `${appUrl()}/subscribe`,
    client_reference_id: user.id,
    metadata: { userId: user.id },
    subscription_data: { metadata: { userId: user.id } },
  });
  if (!session.url) return { error: "Stripe did not return a checkout URL." };
  redirect(session.url);
}

export async function openBillingPortalAction(
  _state: FormState,
  _formData?: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const stripe = getStripe();
  if (!stripe || !user.stripeCustomerId) {
    return { error: "No billing account is attached yet. Subscribe first." };
  }
  const session = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${appUrl()}/settings`,
  });
  redirect(session.url);
}
