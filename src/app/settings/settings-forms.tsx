"use client";

import { useActionState } from "react";
import {
  changePasswordAction,
  updatePreferencesAction,
  updateProfileAction,
  type FormState,
} from "@/app/actions";

function FormAlert({ state }: { state: FormState }) {
  if (state.error) {
    return (
      <p role="alert" className="rounded-xl border border-rose-500/20 bg-rose-500/8 px-4 py-3 text-sm text-rose-300">
        {state.error}
      </p>
    );
  }
  if (state.notice) {
    return (
      <p role="status" className="rounded-xl border border-emerald-400/20 bg-emerald-400/8 px-4 py-3 text-sm text-emerald-300">
        {state.notice}
      </p>
    );
  }
  return null;
}

export function ProfileForm({ displayName, email }: { displayName: string; email: string }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(updateProfileAction, {});

  return (
    <form action={formAction} className="space-y-5">
      <label className="block">
        <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">Name</span>
        <input
          name="displayName"
          defaultValue={displayName}
          required
          minLength={2}
          maxLength={60}
          autoComplete="name"
          className="field mt-1.5"
        />
      </label>
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Email</p>
        <p className="mt-1.5 text-sm text-zinc-300">{email}</p>
        <p className="mt-1 text-xs text-zinc-600">Used to sign in. Email cannot be changed yet.</p>
      </div>
      <FormAlert state={state} />
      <button disabled={pending} className="button-primary text-sm disabled:opacity-50">
        {pending ? "Saving…" : "Save name"}
      </button>
    </form>
  );
}

export function PreferencesForm({ currency }: { currency: "USD" | "CAD" | "EUR" }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(updatePreferencesAction, {});

  return (
    <form action={formAction} className="space-y-5">
      <label className="block max-w-xs">
        <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">Display currency</span>
        <select
          name="preferredCurrency"
          defaultValue={currency}
          className="field mt-1.5 pl-3 pr-8"
        >
          <option value="USD">USD — US Dollar</option>
          <option value="CAD">CAD — Canadian Dollar</option>
          <option value="EUR">EUR — Euro</option>
        </select>
      </label>
      <p className="text-xs leading-5 text-zinc-600">
        Dashboard, collection, and storage use Scryfall market prices in this currency. There is no conversion — if a printing has no price in that currency, it shows as unavailable.
      </p>
      <FormAlert state={state} />
      <button disabled={pending} className="button-primary text-sm disabled:opacity-50">
        {pending ? "Saving…" : "Save currency"}
      </button>
    </form>
  );
}

export function PasswordForm() {
  const [state, formAction, pending] = useActionState<FormState, FormData>(changePasswordAction, {});

  return (
    <form action={formAction} className="space-y-5">
      <label className="block">
        <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">Current password</span>
        <input
          name="currentPassword"
          type="password"
          required
          autoComplete="current-password"
          className="field mt-1.5"
        />
      </label>
      <label className="block">
        <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">New password</span>
        <input
          name="password"
          type="password"
          required
          minLength={10}
          maxLength={128}
          autoComplete="new-password"
          className="field mt-1.5"
          placeholder="At least 10 characters"
        />
      </label>
      <FormAlert state={state} />
      <button disabled={pending} className="button-primary text-sm disabled:opacity-50">
        {pending ? "Updating…" : "Update password"}
      </button>
    </form>
  );
}
