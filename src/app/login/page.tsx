import { redirect } from "next/navigation";
import { Sparkles } from "lucide-react";
import { loginAction } from "@/app/actions";
import { AuthForm } from "@/components/auth-form";
import { getCurrentUser } from "@/lib/auth";

export const metadata = { title: "Sign in" };

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/");
  return (
    <main className="grid min-h-screen place-items-center px-5 py-12">
      <section className="w-full max-w-md">
        <div className="mb-8 flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-emerald-400 text-black"><Sparkles size={20} /></span>
          <strong>Mystic Ledger</strong>
        </div>
        <div className="panel p-6 sm:p-8">
          <p className="text-sm text-emerald-400">Welcome back</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Sign in to your collection</h1>
          <p className="mt-3 text-sm leading-6 text-zinc-500">Your inventory and portfolio data stay private to your account.</p>
          <AuthForm action={loginAction} mode="login" />
        </div>
      </section>
    </main>
  );
}
