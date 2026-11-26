import { fetchShifts, fetchWorkplaces } from "@shifton/api";
import {
  addDays,
  formatDuration,
  formatMonthJa,
  gridRange,
  isYearMonth,
  monthOf,
  summarizeByWorkplace,
  todayIn,
} from "@shifton/core";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { signOut } from "@/app/actions/auth";
import { Card } from "@/components/ui";
import { getCurrentUser } from "@/lib/supabase/server";
import { WorkplaceForm } from "./forms";
import { ShiftCalendar } from "./shift-calendar";

/** よく入る時間帯を提案するために、何日前までのシフトを見るか */
const PRESET_LOOKBACK_DAYS = 90;

export default function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <Suspense fallback={<p className="text-slate-500">読み込み中…</p>}>
        <Dashboard searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Dashboard({ searchParams }: Pick<PageProps<"/dashboard">, "searchParams">) {
  // 「今日」の日付やログイン状態はアクセスのたびに変わるため、事前レンダリングせずリクエスト時に描画する
  await connection();
  const current = await getCurrentUser();
  if (!current) redirect("/login");
  const { supabase, user } = current;

  const today = todayIn();
  const requested = (await searchParams).month;
  const month = isYearMonth(requested) ? requested : monthOf(today);
  const range = gridRange(month);
  const lookbackFrom = addDays(today, -PRESET_LOOKBACK_DAYS);
  const [workplaces, fetched] = await Promise.all([
    fetchWorkplaces(supabase),
    fetchShifts(supabase, {
      from: [lookbackFrom, range.from].sort()[0] ?? range.from,
      to: [today, range.to].sort()[1] ?? range.to,
    }),
  ]);
  const shifts = fetched.filter((s) => s.date >= range.from && s.date <= range.to);
  const recentShifts = fetched.filter((s) => s.date >= lookbackFrom && s.date <= today);
  const workplaceById = new Map(workplaces.map((wp) => [wp.id, wp]));
  const summaries = summarizeByWorkplace(
    shifts.filter((s) => monthOf(s.date) === month),
    workplaces,
  );

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-sky-600">しふとん！</p>
          <p className="text-sm text-slate-500">{user.email} でログイン中</p>
        </div>
        <form action={signOut}>
          <button type="submit" className="text-sm text-slate-500 underline">
            ログアウト
          </button>
        </form>
      </header>

      {workplaces.length === 0 ? (
        <Card>
          <h1 className="mb-1 text-lg font-bold">まずは勤務先を登録しましょう</h1>
          <p className="mb-6 text-sm text-slate-500">
            掛け持ちしている場合は、あとから追加できます。時給を入れると給与の目安を計算します。
          </p>
          <WorkplaceForm />
        </Card>
      ) : (
        <>
          <Link
            href="/dashboard/import"
            className="flex items-center justify-between rounded-xl bg-sky-600 px-6 py-4 font-medium text-white hover:bg-sky-700"
          >
            <span>📷 写真・スクショからシフトを読み取る</span>
            <span aria-hidden>→</span>
          </Link>

          <Card>
            <ShiftCalendar
              month={month}
              today={today}
              workplaces={workplaces}
              shifts={shifts}
              recentShifts={recentShifts}
            />
          </Card>

          <Card>
            <h2 className="mb-4 text-lg font-bold">{formatMonthJa(month)}の合計</h2>
            <ul className="flex flex-col gap-2 text-sm">
              {summaries.map((sum) => {
                const wp = workplaceById.get(sum.workplaceId);
                return (
                  <li key={sum.workplaceId} className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: wp?.color }}
                      />
                      {wp?.name}
                    </span>
                    <span className="tabular-nums text-slate-600 dark:text-slate-300">
                      {sum.shiftCount}回・{formatDuration(sum.workingMinutes)}
                      {sum.estimatedPay !== null && `・約¥${sum.estimatedPay.toLocaleString()}`}
                    </span>
                  </li>
                );
              })}
            </ul>
          </Card>

          <details className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
            <summary className="cursor-pointer font-bold">勤務先を追加</summary>
            <div className="mt-4">
              <WorkplaceForm />
            </div>
          </details>
        </>
      )}
    </div>
  );
}
