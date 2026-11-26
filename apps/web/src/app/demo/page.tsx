import {
  findConflicts,
  formatDateJa,
  formatDuration,
  sampleShifts,
  sampleWorkplaces,
  summarizeByWorkplace,
  workingMinutes,
} from "@shifton/core";
import Link from "next/link";

const workplaceById = new Map(sampleWorkplaces.map((wp) => [wp.id, wp]));

export default function DemoPage() {
  const dates = [...new Set(sampleShifts.map((s) => s.date))].sort();
  const summaries = summarizeByWorkplace(sampleShifts, sampleWorkplaces);
  const conflictIds = new Set(findConflicts(sampleShifts).flatMap(([a, b]) => [a.id, b.id]));

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <header className="mb-8">
        <Link href="/" className="text-sm font-medium text-sky-600">
          しふとん！
        </Link>
        <h1 className="text-2xl font-bold">サンプル：掛け持ちアルバイトのシフト</h1>
        <p className="mt-1 text-sm text-slate-500">※ 画面イメージ用のサンプルデータです。</p>
      </header>

      <section className="flex flex-col gap-6">
        {dates.map((date) => (
          <div key={date}>
            <h2 className="mb-2 font-semibold">{formatDateJa(date)}</h2>
            <ul className="flex flex-col gap-2">
              {sampleShifts
                .filter((s) => s.date === date)
                .map((s) => {
                  const wp = workplaceById.get(s.workplaceId);
                  return (
                    <li
                      key={s.id}
                      className="rounded-lg border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900"
                      style={{ borderLeft: `4px solid ${wp?.color}` }}
                    >
                      <span className="tabular-nums">
                        {s.startTime}〜{s.endTime}
                      </span>
                      <span className="ml-3 text-sm text-slate-500">
                        {wp?.name}・実働 {formatDuration(workingMinutes(s))}
                      </span>
                      {conflictIds.has(s.id) && (
                        <span className="ml-3 text-sm text-red-600">⚠ 時間が重なっています</span>
                      )}
                    </li>
                  );
                })}
            </ul>
          </div>
        ))}
      </section>

      <section className="mt-10">
        <h2 className="mb-2 font-semibold">勤務先ごとの合計</h2>
        <ul className="flex flex-col gap-1 text-sm">
          {summaries.map((s) => (
            <li key={s.workplaceId}>
              {workplaceById.get(s.workplaceId)?.name}：{s.shiftCount}回・
              {formatDuration(s.workingMinutes)}
              {s.estimatedPay !== null && `・約¥${s.estimatedPay.toLocaleString()}`}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
