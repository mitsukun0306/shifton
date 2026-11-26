import { fetchShifts, fetchWorkplaces } from "@shifton/api";
import {
  addDays,
  findConflicts,
  formatDateJa,
  formatDuration,
  summarizeByWorkplace,
  todayIn,
  workingMinutes,
} from "@shifton/core";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { signOut } from "@/app/actions/auth";
import { Card } from "@/components/ui";
import { getCurrentUser } from "@/lib/supabase/server";
import { deleteShiftAction } from "./actions";
import { ShiftForm, WorkplaceForm } from "./forms";

/** 一覧に表示する期間（今日から何日先まで） */
const UPCOMING_DAYS = 30;

export default function DashboardPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <Suspense fallback={<p className="text-slate-500">読み込み中…</p>}>
        <Dashboard />
      </Suspense>
    </main>
  );
}

async function Dashboard() {
  const current = await getCurrentUser();
  if (!current) redirect("/login");
  const { supabase, user } = current;

  const today = todayIn();
  const until = addDays(today, UPCOMING_DAYS);
  const [workplaces, shifts] = await Promise.all([
    fetchWorkplaces(supabase),
    fetchShifts(supabase, { from: today, to: until }),
  ]);
  const workplaceById = new Map(workplaces.map((wp) => [wp.id, wp]));
  const conflictIds = new Set(findConflicts(shifts).flatMap(([a, b]) => [a.id, b.id]));
  const summaries = summarizeByWorkplace(shifts, workplaces);
  const dates = [...new Set(shifts.map((s) => s.date))];

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
            <h1 className="mb-4 text-lg font-bold">これからのシフト</h1>
            {conflictIds.size > 0 && (
              <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
                時間が重なっているシフトがあります。勤務先に確認しましょう。
              </p>
            )}
            {shifts.length === 0 ? (
              <p className="text-sm text-slate-500">
                今後{UPCOMING_DAYS}日間のシフトはまだありません。下のフォームから追加できます。
              </p>
            ) : (
              <div className="flex flex-col gap-4">
                {dates.map((date) => (
                  <section key={date}>
                    <h2 className="mb-1 text-sm font-semibold text-slate-500">
                      {date === today ? "今日 " : ""}
                      {formatDateJa(date)}
                    </h2>
                    <ul className="flex flex-col gap-2">
                      {shifts
                        .filter((s) => s.date === date)
                        .map((s) => {
                          const wp = workplaceById.get(s.workplaceId);
                          return (
                            <li
                              key={s.id}
                              className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-800"
                              style={{ borderLeft: `4px solid ${wp?.color ?? "#94a3b8"}` }}
                            >
                              <div className="flex-1">
                                <p className="font-medium tabular-nums">
                                  {s.startTime}〜{s.endTime}
                                  <span className="ml-2 text-sm font-normal text-slate-500">
                                    {wp?.name}・実働 {formatDuration(workingMinutes(s))}
                                  </span>
                                </p>
                                {s.note && <p className="text-sm text-slate-500">{s.note}</p>}
                                {conflictIds.has(s.id) && (
                                  <p className="text-sm text-red-600">
                                    ⚠ 他のシフトと重なっています
                                  </p>
                                )}
                              </div>
                              <form action={deleteShiftAction}>
                                <input type="hidden" name="id" value={s.id} />
                                <button
                                  type="submit"
                                  className="text-sm text-slate-400 hover:text-red-600"
                                  aria-label="このシフトを削除"
                                >
                                  削除
                                </button>
                              </form>
                            </li>
                          );
                        })}
                    </ul>
                  </section>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <h2 className="mb-4 text-lg font-bold">今後{UPCOMING_DAYS}日間の合計</h2>
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

          <Card>
            <h2 className="mb-4 text-lg font-bold">シフトを追加</h2>
            <ShiftForm workplaces={workplaces} today={today} />
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
