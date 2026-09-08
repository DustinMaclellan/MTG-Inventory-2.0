"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { FormState } from "@/app/actions";

export function AuthForm({
  action,
  mode,
}: {
  action: (state: FormState, data: FormData) => Promise<FormState>;
  mode: "login" | "register";
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const registering = mode === "register";

  return (
    <form action={formAction} className="mt-8 space-y-4">
      {registering && (
        <label className="block text-sm text-zinc-400">
          Name
          <input name="displayName" autoComplete="name" required className="field mt-2" placeholder="Dustin" />
        </label>
      )}
      <label className="block text-sm text-zinc-400">
        Email
        <input name="email" type="email" autoComplete="email" required className="field mt-2" placeholder="you@example.com" />
      </label>
      <label className="block text-sm text-zinc-400">
        Password
        <input name="password" type="password" minLength={10} autoComplete={registering ? "new-password" : "current-password"} required className="field mt-2" />
      </label>
      {state.error && <p role="alert" className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{state.error}</p>}
      <button disabled={pending} className="button-primary w-full disabled:opacity-50">
        {pending ? "Please wait…" : registering ? "Create account" : "Sign in"}
      </button>
      <p className="text-center text-sm text-zinc-500">
        {registering ? "Already have an account? " : "New to Mystic Ledger? "}
        <Link className="text-emerald-400 hover:text-emerald-300" href={registering ? "/login" : "/register"}>
          {registering ? "Sign in" : "Create account"}
        </Link>
      </p>
    </form>
  );
}
