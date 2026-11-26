"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/dashboard", label: "📅 カレンダー" },
  { href: "/dashboard/import", label: "📷 読み取り" },
  { href: "/dashboard/workplaces", label: "🏪 勤務先" },
] as const;

/** ダッシュボードの画面切り替えタブ */
export function DashboardNav() {
  const pathname = usePathname();
  return (
    <nav className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
      <div className="mx-auto flex w-full max-w-3xl items-center gap-1 px-2">
        <span className="mr-2 hidden px-2 text-sm font-bold text-sky-600 sm:inline">
          しふとん！
        </span>
        {TABS.map((tab) => {
          const active = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={`flex-1 border-b-2 px-2 py-3 text-center text-sm font-medium sm:flex-none sm:px-4 ${
                active
                  ? "border-sky-600 text-sky-700 dark:text-sky-300"
                  : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
