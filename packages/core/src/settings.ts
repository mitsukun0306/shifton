import { z } from "zod";
import { spanMinutes } from "./time";

/** 「勤務がこの分数を超えたら、休憩をこの分数入れる」という自動入力のルール */
export const breakRuleSchema = z.object({
  overMinutes: z
    .number()
    .int()
    .min(0)
    .max(24 * 60),
  breakMinutes: z
    .number()
    .int()
    .min(0)
    .max(24 * 60),
});
export type BreakRule = z.infer<typeof breakRuleSchema>;

/** 労働基準法第34条の最低休憩（6時間超45分、8時間超60分） */
export const legalBreakRules: readonly BreakRule[] = [
  { overMinutes: 6 * 60, breakMinutes: 45 },
  { overMinutes: 8 * 60, breakMinutes: 60 },
];

/** アプリの設定（端末ごとに保存する） */
export const appSettingsSchema = z.object({
  /** 休憩の自動入力ルール。勤務時間が長い順でなくてもよい */
  breakRules: z
    .array(breakRuleSchema)
    .max(5)
    .default([...legalBreakRules]),
  /** 休憩を選ぶボタンに並べる分数 */
  breakOptions: z
    .array(
      z
        .number()
        .int()
        .min(0)
        .max(24 * 60),
    )
    .min(1)
    .max(10)
    .default([0, 15, 30, 45, 60, 90]),
  /** カレンダーで一度に出す時間帯の候補の数 */
  presetCount: z.number().int().min(1).max(8).default(4),
});
export type AppSettings = z.infer<typeof appSettingsSchema>;

export const defaultSettings: AppSettings = appSettingsSchema.parse({});

/** 保存されていた値を読み込む。壊れていたり古い形式だったりしたら既定値に戻す */
export function parseSettings(raw: unknown): AppSettings {
  const parsed = appSettingsSchema.safeParse(raw ?? {});
  return parsed.success ? parsed.data : defaultSettings;
}

const TIME_PATTERN = /^\d{1,2}:\d{2}$/;

/**
 * ルールに従って休憩時間（分）を決める。
 * 休憩を引いた労働時間で判定するので、法定ルールなら 6時間30分の勤務は45分、
 * 8時間45分の勤務も45分（労働8時間）、8時間46分なら60分になる。
 */
export function breakForRules(
  startTime: string,
  endTime: string,
  rules: readonly BreakRule[],
): number {
  // 入力途中など時刻として読めないときは判定しない
  if (!TIME_PATTERN.test(startTime) || !TIME_PATTERN.test(endTime)) return 0;
  const span = spanMinutes(startTime, endTime);
  let result = 0;
  for (const rule of [...rules].sort((a, b) => a.overMinutes - b.overMinutes)) {
    if (span - result > rule.overMinutes) result = Math.max(result, rule.breakMinutes);
  }
  return result;
}

/** 法定ルールと同じ設定か */
export function isLegalBreakRules(rules: readonly BreakRule[]): boolean {
  const sorted = [...rules].sort((a, b) => a.overMinutes - b.overMinutes);
  return (
    sorted.length === legalBreakRules.length &&
    sorted.every(
      (r, i) =>
        r.overMinutes === legalBreakRules[i]?.overMinutes &&
        r.breakMinutes === legalBreakRules[i]?.breakMinutes,
    )
  );
}

/** "6時間超→45分、8時間超→60分" のような説明文 */
export function describeBreakRules(rules: readonly BreakRule[]): string {
  if (rules.length === 0) return "自動で入れない";
  return [...rules]
    .sort((a, b) => a.overMinutes - b.overMinutes)
    .map((r) => {
      const h = Math.floor(r.overMinutes / 60);
      const m = r.overMinutes % 60;
      return `${h}時間${m ? `${m}分` : ""}超→${r.breakMinutes}分`;
    })
    .join("、");
}

/**
 * この休憩で労働基準法第34条を満たしているか。
 * 休憩を引いた労働時間が6時間を超えるなら45分以上、8時間を超えるなら60分以上が必要。
 */
export function isBreakLegal(startTime: string, endTime: string, breakMinutes: number): boolean {
  if (!TIME_PATTERN.test(startTime) || !TIME_PATTERN.test(endTime)) return true;
  const work = spanMinutes(startTime, endTime) - breakMinutes;
  if (work > 8 * 60) return breakMinutes >= 60;
  if (work > 6 * 60) return breakMinutes >= 45;
  return true;
}
