import { z } from "zod";
import { isoDateSchema, timeOfDaySchema } from "./schemas";

/**
 * AI（画像認識）がシフト表から読み取った生の結果。
 * 形式の細かいチェックはここでは行わず、normalizeExtraction で検証・正規化する。
 */
export const extractedShiftsSchema = z.object({
  /** 指定された人のシフトが画像内に見つかったか */
  personFound: z.boolean(),
  shifts: z.array(
    z.object({
      /** YYYY-MM-DD */
      date: z.string(),
      /** HH:mm（24時間表記） */
      startTime: z.string(),
      endTime: z.string(),
      /** 休憩（分）。表に書かれていなければ null */
      breakMinutes: z.number().nullable(),
      /** 役割・記号など補足があれば */
      note: z.string().nullable(),
      /** 読み取りに自信がない場合は low */
      confidence: z.enum(["high", "low"]),
    }),
  ),
  /** 読み取れなかった部分など、利用者に伝えたい注意点 */
  warnings: z.array(z.string()),
});
export type ExtractedShifts = z.infer<typeof extractedShiftsSchema>;

/** 確認画面に出すシフトの候補 */
export interface ShiftCandidate {
  date: string;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  note?: string;
  /** 自信がない読み取り。確認画面で目立たせる */
  uncertain: boolean;
}

export interface NormalizedExtraction {
  candidates: ShiftCandidate[];
  warnings: string[];
}

/**
 * "9:00" "09:00" "9時" "21:30" などを "HH:mm" にそろえる。
 * 24:00 以降（例: 25:00）は日またぎとして 0:00〜 に読み替える。
 */
export function normalizeTime(raw: string): string | null {
  const m = raw
    .trim()
    .replace(/：/g, ":")
    .match(/^(\d{1,2})(?::(\d{2})|時(?:(\d{1,2})分?)?)?$/);
  if (!m) return null;
  const hour = Number(m[1]);
  const minute = Number(m[2] ?? m[3] ?? 0);
  if (hour > 47 || minute > 59) return null;
  const time = `${String(hour % 24).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  return timeOfDaySchema.safeParse(time).success ? time : null;
}

/** AI の読み取り結果を検証し、登録できる候補と注意点に分ける */
export function normalizeExtraction(result: ExtractedShifts): NormalizedExtraction {
  const warnings = [...result.warnings];
  const candidates: ShiftCandidate[] = [];
  const seen = new Set<string>();

  for (const s of result.shifts) {
    const date = isoDateSchema.safeParse(s.date.trim()).success ? s.date.trim() : null;
    const startTime = normalizeTime(s.startTime);
    const endTime = normalizeTime(s.endTime);
    if (!date || !startTime || !endTime || startTime === endTime) {
      warnings.push(`読み取れなかったシフトがあります（${s.date} ${s.startTime}〜${s.endTime}）`);
      continue;
    }
    const key = `${date} ${startTime} ${endTime}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const breakMinutes =
      s.breakMinutes !== null && Number.isInteger(s.breakMinutes) && s.breakMinutes >= 0
        ? s.breakMinutes
        : 0;
    candidates.push({
      date,
      startTime,
      endTime,
      breakMinutes,
      note: s.note?.trim() || undefined,
      uncertain: s.confidence === "low",
    });
  }

  if (!result.personFound && candidates.length === 0) {
    warnings.unshift(
      "画像の中にあなたのシフトが見つかりませんでした。名前の表記を確認してください",
    );
  }

  candidates.sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
  return { candidates, warnings };
}
