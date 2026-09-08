import { redirect } from "next/navigation";
import { registerAction } from "@/app/actions";
import { AuthForm } from "@/components/auth-form";
import { getCurrentUser } from "@/lib/auth";

export const metadata = { title: "Create account" };

export default async function RegisterPage() {
  if (await getCurrentUser()) redirect("/");
  return (
    <main className="grid min-h-screen place-items-center px-5 py-12">
      <section className="panel w-full max-w-md p-6 sm:p-8">
        <p className="text-sm text-emerald-400">Start your ledger</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Build a precise MTG inventory</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-500">Every printing, finish, condition, and acquisition stays distinct.</p>
        <AuthForm action={registerAction} mode="register" />
      </section>
    </main>
  );
}
