import Link from "next/link";
import {
  Archive,
  BarChart3,
  Boxes,
  CreditCard,
  LayoutDashboard,
  Library,
  LogOut,
  FileUp,
  PlusCircle,
  Settings,
  Sparkles,
} from "lucide-react";
import { logoutAction } from "@/app/actions";

const navigation = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/collection", label: "Collection", icon: Library },
  { href: "/storage", label: "Storage", icon: Archive },
  { href: "/add", label: "Add Cards", icon: PlusCircle },
  { href: "/imports", label: "Import / Export", icon: FileUp },
  { href: "/decks", label: "Decks", icon: Boxes, disabled: true },
  { href: "/analytics", label: "Analytics", icon: BarChart3, disabled: true },
  { href: "/transactions", label: "Transactions", icon: CreditCard, disabled: true },
];

export function AppShell({
  children,
  userName,
}: {
  children: React.ReactNode;
  userName: string;
}) {
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 border-r border-white/8 bg-[#0b0d10] p-5 lg:flex lg:flex-col">
        <Link href="/" className="mb-10 flex items-center gap-3 px-2">
          <span className="grid size-10 place-items-center rounded-xl bg-emerald-400 text-black shadow-[0_0_30px_rgba(52,211,153,.15)]">
            <Sparkles size={20} />
          </span>
          <span>
            <strong className="block tracking-tight">Mystic Ledger</strong>
            <small className="text-xs text-zinc-500">Collection intelligence</small>
          </span>
        </Link>
        <nav className="space-y-1">
          {navigation.map(({ href, label, icon: Icon, disabled }) =>
            disabled ? (
              <span key={href} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-zinc-700">
                <Icon size={18} /> {label} <small className="ml-auto">Soon</small>
              </span>
            ) : (
              <Link key={href} href={href} className="nav-link">
                <Icon size={18} /> {label}
              </Link>
            ),
          )}
        </nav>
        <div className="mt-auto border-t border-white/8 pt-4">
          <Link href="/settings" className="nav-link">
            <Settings size={18} /> Settings
          </Link>
          <form action={logoutAction}>
            <button className="nav-link w-full">
              <LogOut size={18} /> Sign out
            </button>
          </form>
          <p className="mt-4 truncate px-3 text-xs text-zinc-600">{userName}</p>
        </div>
      </aside>
      <main className="pb-24 lg:ml-64 lg:pb-0">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 z-30 flex justify-around border-t border-white/10 bg-[#0b0d10]/95 px-2 py-2 backdrop-blur lg:hidden">
        {navigation.slice(0, 3).map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className="flex flex-col items-center gap-1 px-5 py-1 text-[11px] text-zinc-400">
            <Icon size={19} /> {label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
