import { fetchMyStores } from "@shifton/api";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { signOut } from "@/app/actions/auth";
import { Card } from "@/components/ui";
import { getCurrentUser } from "@/lib/supabase/server";
import { CreateStoreForm } from "./create-store-form";

const roleLabel = { owner: "オーナー", manager: "店長", staff: "スタッフ" } as const;

export default function DashboardPage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
      <Suspense fallback={<p className="text-slate-500">読み込み中…</p>}>
        <Dashboard />
      </Suspense>
    </main>
  );
}

async function Dashboard() {
  const current = await getCurrentUser();
  if (!current) redirect("/login");

  const stores = await fetchMyStores(current.supabase, current.user.id);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-sky-600">しふとん！</p>
          <p className="text-sm text-slate-500">{current.user.email} でログイン中</p>
        </div>
        <form action={signOut}>
          <button type="submit" className="text-sm text-slate-500 underline">
            ログアウト
          </button>
        </form>
      </header>

      {stores.length === 0 ? (
        <CreateStoreForm />
      ) : (
        <Card>
          <h1 className="mb-4 text-lg font-bold">所属している店舗</h1>
          <ul className="divide-y divide-slate-200 dark:divide-slate-800">
            {stores.map((store) => (
              <li key={store.id} className="flex items-center justify-between py-3">
                <span className="font-medium">{store.name}</span>
                <span className="text-sm text-slate-500">
                  {store.displayName}（{roleLabel[store.role]}）
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-slate-500">シフト表の作成画面はこれから実装します。</p>
        </Card>
      )}
    </div>
  );
}
