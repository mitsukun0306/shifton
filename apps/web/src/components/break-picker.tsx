import { breakMinuteOptions } from "@shifton/core";

/**
 * 休憩時間をボタンで選ぶ。勤務時間に応じた法定の最低休憩には「最低」の印を付け、
 * それより短い休憩を選んだときは注意を出す。
 */
export function BreakPicker({
  value,
  onChange,
  legalMinutes,
  compact = false,
}: {
  value: number;
  onChange: (minutes: number) => void;
  /** 労働基準法の最低休憩時間（分） */
  legalMinutes: number;
  /** 表の中など狭い場所ではセレクトボックスで表示する */
  compact?: boolean;
}) {
  const options = breakMinuteOptions.includes(value as (typeof breakMinuteOptions)[number])
    ? breakMinuteOptions
    : [...breakMinuteOptions, value].sort((a, b) => a - b);
  const label = (m: number) => (m === 0 ? "なし" : `${m}分`);

  if (compact) {
    return (
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label="休憩"
        className={`rounded-md border bg-white px-2 py-1 text-slate-900 dark:bg-slate-900 dark:text-slate-100 ${
          value < legalMinutes ? "border-red-400" : "border-slate-300 dark:border-slate-700"
        }`}
      >
        {options.map((m) => (
          <option key={m} value={m}>
            {label(m)}
            {m === legalMinutes && m > 0 ? "（法定の最低）" : ""}
          </option>
        ))}
      </select>
    );
  }

  return (
    <fieldset className="flex flex-col gap-1 text-sm">
      <legend className="mb-1 font-medium">休憩</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((m) => {
          const active = m === value;
          return (
            <button
              key={m}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(m)}
              className={`rounded-full border px-3 py-1 tabular-nums ${
                active
                  ? "border-sky-600 bg-sky-600 font-bold text-white"
                  : "border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900"
              }`}
            >
              {label(m)}
              {m === legalMinutes && m > 0 && (
                <span className={`ml-1 text-xs ${active ? "text-sky-100" : "text-sky-600"}`}>
                  最低
                </span>
              )}
            </button>
          );
        })}
      </div>
      <p className={`text-xs ${value < legalMinutes ? "text-red-600" : "text-slate-500"}`}>
        {legalMinutes === 0
          ? "6時間以下の勤務は休憩の決まりはありません"
          : value < legalMinutes
            ? `⚠ 法律で決められた最低限の休憩（${legalMinutes}分）より短くなっています`
            : `この勤務時間では、法律で最低${legalMinutes}分の休憩が必要です（労働基準法第34条）`}
      </p>
    </fieldset>
  );
}
