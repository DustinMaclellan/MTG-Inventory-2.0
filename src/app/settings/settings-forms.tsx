"use client";

import { useActionState, useEffect, useState } from "react";
import {
  changePasswordAction,
  updatePreferencesAction,
  updateProfileAction,
  type FormState,
} from "@/app/actions";
import { interpolate } from "@/i18n";
import { useI18n } from "@/i18n/provider";
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "@/lib/password";

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
      <p role="status" className="rounded-xl border border-accent/20 bg-accent/8 px-4 py-3 text-sm text-accent">
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
  const [selected, setSelected] = useState(currency);
  const { m } = useI18n();

  useEffect(() => {
    if (state.preferredCurrency) setSelected(state.preferredCurrency);
  }, [state.preferredCurrency]);

  return (
    <form action={formAction} className="space-y-5">
      <label className="block max-w-xs">
        <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
          {m.settings.displayCurrency}
        </span>
        <select
          name="preferredCurrency"
          value={selected}
          onChange={(event) =>
            setSelected(event.target.value as "USD" | "CAD" | "EUR")
          }
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
          minLength={PASSWORD_MIN_LENGTH}
          maxLength={PASSWORD_MAX_LENGTH}
          autoComplete="new-password"
          className="field mt-1.5"
          placeholder={interpolate(m.settings.passwordPlaceholder, { count: PASSWORD_MIN_LENGTH })}
        />
      </label>
      <FormAlert state={state} />
      <button disabled={pending} className="button-primary text-sm disabled:opacity-50">
        {pending ? m.common.updating : m.settings.updatePassword}
      </button>
    </form>
  );
}
