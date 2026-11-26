import { fetchShifts, fetchWorkplaces } from "@shifton/api";
import { addDays, gridRange, isYearMonth, monthOf, todayIn } from "@shifton/core";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { Card } from "@/components/ui";
import { getCurrentUser } from "@/lib/supabase/server";
import { WorkplaceForm } from "./forms";
import { ShiftCalendar } from "./shift-calendar";

/** よく入る時間帯を提案するために、何日前までのシフトを見るか */
const PRESET_LOOKBACK_DAYS = 90;

export default function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-2 py-4 sm:px-4 sm:py-6">
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
  const { supabase } = current;

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

  if (workplaces.length === 0) {
    return (
      <Card>
        <h1 className="mb-1 text-lg font-bold">まずは勤務先を登録しましょう</h1>
        <p className="mb-6 text-sm text-slate-500">
          掛け持ちしている場合は、あとから「勤務先」タブで追加できます。時給を入れると給与の目安を計算します。
        </p>
        <WorkplaceForm />
      </Card>
    );
  }

  return (
    <Card>
      <ShiftCalendar
        month={month}
        today={today}
        workplaces={workplaces}
        shifts={shifts}
        recentShifts={recentShifts}
      />
    </Card>
  );
}
