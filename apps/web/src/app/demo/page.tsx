import {
  findConflicts,
  formatDuration,
  sampleMembers,
  sampleShifts,
  sampleStore,
  summarizeByMember,
  workingMinutes,
} from "@shifton/core";

const memberName = new Map(sampleMembers.map((m) => [m.id, m.displayName]));

export default function DemoPage() {
  const dates = [...new Set(sampleShifts.map((s) => s.date))].sort();
  const summaries = summarizeByMember(sampleShifts, sampleMembers);
  const conflicts = findConflicts(sampleShifts);

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-6">
      <header className="mb-8">
        <p className="text-sm font-medium text-sky-600">しふとん！</p>
        <h1 className="text-2xl font-bold">{sampleStore.name} のシフト</h1>
        <p className="mt-1 text-sm text-slate-500">
          ※ 現在はサンプルデータを表示しています。
          {conflicts.length > 0 && ` 重複シフトが ${conflicts.length} 件あります。`}
        </p>
      </header>

      <section className="space-y-6">
        {dates.map((date) => (
          <div key={date}>
            <h2 className="mb-2 font-semibold">{date}</h2>
            <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
              {sampleShifts
                .filter((s) => s.date === date)
                .map((s) => (
                  <li key={s.id} className="flex items-center justify-between px-4 py-3">
                    <span>{memberName.get(s.memberId)}</span>
                    <span className="tabular-nums">
                      {s.startTime}〜{s.endTime}
                      <span className="ml-3 text-sm text-slate-500">
                        実働 {formatDuration(workingMinutes(s))}
                      </span>
                      {s.status === "draft" && (
                        <span className="ml-3 rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
                          下書き
                        </span>
                      )}
                    </span>
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </section>

      <section className="mt-10">
        <h2 className="mb-2 font-semibold">メンバー別集計</h2>
        <table className="w-full text-left text-sm">
          <thead className="text-slate-500">
            <tr>
              <th className="py-2">名前</th>
              <th>回数</th>
              <th>実働</th>
              <th>概算給与</th>
            </tr>
          </thead>
          <tbody>
            {summaries.map((s) => (
              <tr key={s.memberId} className="border-t border-slate-200 dark:border-slate-800">
                <td className="py-2">{memberName.get(s.memberId)}</td>
                <td>{s.shiftCount}</td>
                <td>{formatDuration(s.workingMinutes)}</td>
                <td>{s.estimatedPay === null ? "—" : `¥${s.estimatedPay.toLocaleString()}`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
