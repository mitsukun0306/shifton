import { fetchShifts, fetchWorkplaces } from "@shifton/api";
import {
  formatDuration,
  formatMonthJa,
  gridRange,
  monthOf,
  summarizeByWorkplace,
  todayIn,
} from "@shifton/core";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { signOut } from "@/app/actions/auth";
import { Card } from "@/components/ui";
import { getCurrentUser } from "@/lib/supabase/server";
import { AddWorkplaceButton } from "../forms";

export default function WorkplacesPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-2 py-4 sm:px-4 sm:py-6">
      <Suspense fallback={<p className="text-slate-500">読み込み中…</p>}>
        <Workplaces />
      </Suspense>
    </main>
  );
}

async function Workplaces() {
  await connection();
  const current = await getCurrentUser();
  if (!current) redirect("/login");
  const { supabase, user } = current;

  const month = monthOf(todayIn());
  const range = gridRange(month);
  const [workplaces, shifts] = await Promise.all([
    fetchWorkplaces(supabase),
    fetchShifts(supabase, range),
  ]);
  const summaries = new Map(
    summarizeByWorkplace(
      shifts.filter((s) => monthOf(s.date) === month),
      workplaces,
    ).map((sum) => [sum.workplaceId, sum]),
  );

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <div className="mb-4 flex items-center justify-between gap-2">
          <h1 className="text-lg font-bold">勤務先</h1>
          <span className="text-sm text-slate-500">{formatMonthJa(month)}の実績</span>
        </div>
        {workplaces.length === 0 ? (
          <p className="mb-4 text-sm text-slate-500">まだ勤務先がありません。</p>
        ) : (
          <ul className="mb-4 flex flex-col gap-2">
            {workplaces.map((wp) => {
              const sum = summaries.get(wp.id);
              return (
                <li
                  key={wp.id}
                  className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-800"
                  style={{ borderLeft: `4px solid ${wp.color}` }}
                >
                  <div className="flex-1">
                    <p className="font-medium">{wp.name}</p>
                    <p className="text-xs text-slate-500">
                      {wp.hourlyWage !== null
                        ? `時給 ¥${wp.hourlyWage.toLocaleString()}`
                        : "時給未設定"}
                    </p>
                  </div>
                  <p className="text-right text-sm tabular-nums text-slate-600 dark:text-slate-300">
                    {sum?.shiftCount ?? 0}回・{formatDuration(sum?.workingMinutes ?? 0)}
                    {sum?.estimatedPay != null && (
                      <span className="block text-xs">約¥{sum.estimatedPay.toLocaleString()}</span>
                    )}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
        <AddWorkplaceButton />
      </Card>

      <div className="flex items-center justify-between px-2 text-sm text-slate-500">
        <span>{user.email} でログイン中</span>
        <form action={signOut}>
          <button type="submit" className="underline">
            ログアウト
          </button>
        </form>
      </div>
    </div>
  );
}
