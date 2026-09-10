"use client";

import { useActionState } from "react";
import {
  changePasswordAction,
  updatePreferencesAction,
  updateProfileAction,
  type FormState,
} from "@/app/actions";
import { useI18n } from "@/i18n/provider";

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
  const { m } = useI18n();

  return (
    <form action={formAction} className="space-y-5">
      <label className="block">
        <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">{m.settings.name}</span>
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
        <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">{m.settings.email}</p>
        <p className="mt-1.5 text-sm text-zinc-300">{email}</p>
        <p className="mt-1 text-xs text-zinc-600">{m.settings.emailHint}</p>
      </div>
      <FormAlert state={state} />
      <button disabled={pending} className="button-primary text-sm disabled:opacity-50">
        {pending ? m.common.saving : m.settings.saveName}
      </button>
    </form>
  );
}

export function PreferencesForm({ currency }: { currency: "USD" | "CAD" | "EUR" }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(updatePreferencesAction, {});
  const { m } = useI18n();

  return (
    <form action={formAction} className="space-y-5">
      <label className="block max-w-xs">
        <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
          {m.settings.displayCurrency}
        </span>
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
      <p className="text-xs leading-5 text-zinc-600">{m.settings.currencyHint}</p>
      <FormAlert state={state} />
      <button disabled={pending} className="button-primary text-sm disabled:opacity-50">
        {pending ? m.common.saving : m.settings.saveCurrency}
      </button>
    </form>
  );
}

export function PasswordForm() {
  const [state, formAction, pending] = useActionState<FormState, FormData>(changePasswordAction, {});
  const { m } = useI18n();

  return (
    <form action={formAction} className="space-y-5">
      <label className="block">
        <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
          {m.settings.currentPassword}
        </span>
        <input
          name="currentPassword"
          type="password"
          required
          autoComplete="current-password"
          className="field mt-1.5"
        />
      </label>
      <label className="block">
        <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
          {m.settings.newPassword}
        </span>
        <input
          name="password"
          type="password"
          required
          minLength={10}
          maxLength={128}
          autoComplete="new-password"
          className="field mt-1.5"
          placeholder={m.settings.passwordPlaceholder}
        />
      </label>
      <FormAlert state={state} />
      <button disabled={pending} className="button-primary text-sm disabled:opacity-50">
        {pending ? m.common.updating : m.settings.updatePassword}
      </button>
    </form>
  );
}
