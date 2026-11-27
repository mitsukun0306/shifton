"use client";

import {
  type AppSettings,
  addDays,
  addMonths,
  breakForRules,
  findConflicts,
  formatDateJa,
  formatDuration,
  formatMonthJa,
  formatShortTime,
  groupByDate,
  monthGrid,
  monthOf,
  overlappingShifts,
  type Shift,
  type ShiftPreset,
  suggestPresets,
  summarizeByWorkplace,
  type Workplace,
  workingMinutes,
  type YearMonth,
} from "@shifton/core";
import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { BreakPicker } from "@/components/break-picker";
import { Sheet } from "@/components/sheet";
import { Alert, Button, Field } from "@/components/ui";
import { addShiftsAction, removeShiftAction } from "./actions";

const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

/** 日曜は赤、土曜は青で表示する */
function weekdayColor(weekday: number) {
  if (weekday === 0) return "text-red-500";
  if (weekday === 6) return "text-sky-600";
  return "";
}

export function ShiftCalendar({
  month,
  today,
  workplaces,
  shifts,
  recentShifts,
  settings,
}: {
  month: YearMonth;
  today: string;
  workplaces: Workplace[];
  /** カレンダーに表示する期間のシフト */
  shifts: Shift[];
  /** よく入る時間帯を提案するための、最近のシフト */
  recentShifts: Shift[];
  /** アカウントに保存された設定（休憩ルールなど） */
  settings: AppSettings;
}) {
  const weeks = useMemo(() => monthGrid(month), [month]);
  const byDate = useMemo(() => groupByDate(shifts), [shifts]);
  const workplaceById = useMemo(() => new Map(workplaces.map((wp) => [wp.id, wp])), [workplaces]);

  const [multi, setMulti] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [toast, setToast] = useState<{ kind: "error" | "info"; text: string }>();
  const [workplaceId, setWorkplaceId] = useState(workplaces[0]?.id ?? "");
  const [custom, setCustom] = useState<ShiftPreset>(
    () =>
      suggestPresets(recentShifts, workplaces[0]?.id ?? "", 1, settings.breakRules)[0] ?? {
        startTime: "10:00",
        endTime: "15:00",
        breakMinutes: 0,
      },
  );
  const [note, setNote] = useState("");
  const [message, setMessage] = useState<{ kind: "error" | "info"; text: string }>();
  const [pending, startTransition] = useTransition();

  // 月を切り替えたら、その月の日を選び直す
  const [shownMonth, setShownMonth] = useState(month);
  if (shownMonth !== month) {
    setShownMonth(month);
    setSelected([]);
    setMessage(undefined);
  }

  // 追加結果のお知らせは数秒で消す
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(undefined), 5000);
    return () => clearTimeout(timer);
  }, [toast]);

  const monthTotal = useMemo(() => {
    const own = shifts.filter((s) => monthOf(s.date) === month);
    const sums = summarizeByWorkplace(own, workplaces);
    const minutes = sums.reduce((t, x) => t + x.workingMinutes, 0);
    const pay = sums.reduce((t, x) => t + (x.estimatedPay ?? 0), 0);
    return { count: own.length, minutes, pay };
  }, [shifts, workplaces, month]);

  const presets = useMemo(
    () => suggestPresets(recentShifts, workplaceId, settings.presetCount, settings.breakRules),
    [recentShifts, workplaceId, settings],
  );
  const workplace = workplaceById.get(workplaceId);

  /** 勤務先を変えたら、「時間を指定」の初期値もその勤務先で一番よく使う時間帯にする */
  function selectWorkplace(id: string) {
    setWorkplaceId(id);
    const top = suggestPresets(recentShifts, id, 1, settings.breakRules)[0];
    if (top) setCustom(top);
  }

  /** 開始・終了を変えたら、休憩を法定の最低時間に合わせ直す（あとから変更可） */
  function changeTime(patch: Partial<Pick<ShiftPreset, "startTime" | "endTime">>) {
    setCustom((cur) => {
      const next = { ...cur, ...patch };
      if (!next.startTime || !next.endTime) return next;
      return {
        ...next,
        breakMinutes: breakForRules(next.startTime, next.endTime, settings.breakRules),
      };
    });
  }

  const conflictIds = useMemo(
    () => new Set(findConflicts(shifts).flatMap(([a, b]) => [a.id, b.id])),
    [shifts],
  );
  function dayHasConflict(date: string) {
    return (byDate.get(date) ?? []).some((s) => conflictIds.has(s.id));
  }

  /** 選択中の日のうち、この時間帯を入れると他のシフトと重なる日 */
  function conflictDays(preset: Pick<ShiftPreset, "startTime" | "endTime">) {
    return selected.filter(
      (date) =>
        overlappingShifts({ date, ...preset }, [
          ...(byDate.get(date) ?? []),
          // 前日の夜勤が日をまたいで入り込むケースも見る
          ...(byDate.get(addDays(date, -1)) ?? []),
        ]).length > 0,
    );
  }

  function onDayClick(date: string) {
    setMessage(undefined);
    if (!multi) {
      setSelected([date]);
      setSheetOpen(true);
      return;
    }
    setSelected((cur) =>
      cur.includes(date) ? cur.filter((d) => d !== date) : [...cur, date].sort(),
    );
  }

  function toggleMulti() {
    setMulti((m) => !m);
    setSelected([]);
    setMessage(undefined);
  }

  function add(preset: ShiftPreset) {
    if (!workplaceId) return;
    if (selected.length === 0) {
      setMessage({ kind: "error", text: "カレンダーで日付を選んでください" });
      return;
    }
    const overlaps = conflictDays(preset);
    startTransition(async () => {
      const result = await addShiftsAction(
        selected.map((date) => ({
          workplaceId,
          date,
          startTime: preset.startTime,
          endTime: preset.endTime,
          breakMinutes: preset.breakMinutes,
          note: note.trim() || undefined,
        })),
      );
      if (result.error) {
        setMessage({ kind: "error", text: result.error });
        return;
      }
      setNote("");
      const warn =
        overlaps.length > 0
          ? `（⚠ ${overlaps.map((d) => formatDateJa(d)).join("、")} は他のシフトと重なっています）`
          : "";
      setMessage(undefined);
      setToast({
        kind: overlaps.length > 0 ? "error" : "info",
        text: `${workplace?.name ?? ""}のシフトを${result.count}件追加しました${warn}`,
      });
      setSheetOpen(false);
      setSelected([]);
      setMulti(false);
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      await removeShiftAction(id);
    });
  }

  function closeSheet() {
    setSheetOpen(false);
    setMessage(undefined);
    if (!multi) setSelected([]);
  }

  const singleDay = !multi && selected.length === 1 ? selected[0] : undefined;
  const dayShifts = singleDay ? (byDate.get(singleDay) ?? []) : [];

  return (
    <div className="flex flex-col gap-4">
      {/* 月の切り替え */}
      <div className="flex items-center justify-between">
        <Link
          href={`/dashboard?month=${addMonths(month, -1)}`}
          className="rounded-md px-3 py-1 text-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          aria-label="前の月"
        >
          ‹
        </Link>
        <div className="flex items-center gap-3">
          <div className="text-center">
            <h1 className="text-lg font-bold">{formatMonthJa(month)}</h1>
            <p className="text-xs text-slate-500 tabular-nums">
              {monthTotal.count}回・{formatDuration(monthTotal.minutes)}
              {monthTotal.pay > 0 && `・約¥${monthTotal.pay.toLocaleString()}`}
            </p>
          </div>
          {!today.startsWith(month) && (
            <Link href="/dashboard" className="text-sm text-sky-600 underline">
              今月へ
            </Link>
          )}
        </div>
        <Link
          href={`/dashboard?month=${addMonths(month, 1)}`}
          className="rounded-md px-3 py-1 text-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          aria-label="次の月"
        >
          ›
        </Link>
      </div>

      <div className="flex items-center justify-between gap-2 text-sm">
        <p className="text-slate-500">
          {multi
            ? "シフトを入れる日をタップして選んでください"
            : "日付をタップしてシフトを確認・追加"}
        </p>
        <button
          type="button"
          onClick={toggleMulti}
          aria-pressed={multi}
          className={`shrink-0 rounded-full border px-3 py-1 font-medium ${
            multi
              ? "border-sky-600 bg-sky-600 text-white"
              : "border-slate-300 text-slate-600 dark:border-slate-700 dark:text-slate-300"
          }`}
        >
          {multi ? "✓ まとめて選択中" : "まとめて選択"}
        </button>
      </div>

      {/* カレンダー本体 */}
      <div className="grid grid-cols-7 overflow-hidden rounded-lg border border-slate-200 text-sm dark:border-slate-800">
        {WEEKDAY_LABELS.map((label, i) => (
          <div
            key={label}
            className={`border-b border-slate-200 py-1 text-center text-xs font-medium dark:border-slate-800 ${weekdayColor(i) || "text-slate-500"}`}
          >
            {label}
          </div>
        ))}
        {weeks.flat().map((day) => {
          const list = byDate.get(day.date) ?? [];
          const isSelected = selected.includes(day.date);
          const isToday = day.date === today;
          return (
            <button
              key={day.date}
              type="button"
              onClick={() => onDayClick(day.date)}
              aria-pressed={isSelected}
              aria-label={`${formatDateJa(day.date)}、シフト${list.length}件`}
              className={`relative flex min-h-16 flex-col sm:min-h-20 items-stretch gap-0.5 border-b border-r border-slate-100 p-1 text-left transition-colors dark:border-slate-800 ${
                day.inMonth ? "" : "bg-slate-50 text-slate-400 dark:bg-slate-950"
              } ${isSelected ? "bg-sky-50 outline-2 -outline-offset-2 outline-sky-500 dark:bg-sky-950" : "hover:bg-slate-50 dark:hover:bg-slate-800"}`}
            >
              <span className="flex items-center justify-between">
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs tabular-nums ${
                    isToday ? "bg-sky-600 font-bold text-white" : weekdayColor(day.weekday)
                  }`}
                >
                  {Number(day.date.slice(8))}
                </span>
                {dayHasConflict(day.date) && (
                  <span className="text-xs text-red-600" title="時間が重なっています">
                    ⚠
                  </span>
                )}
              </span>
              {list.slice(0, 3).map((s) => (
                <span
                  key={s.id}
                  className="truncate rounded px-0.5 text-[11px] sm:px-1 leading-4 font-medium text-white tabular-nums"
                  style={{ backgroundColor: workplaceById.get(s.workplaceId)?.color ?? "#94a3b8" }}
                >
                  <span className="sm:hidden">{formatShortTime(s.startTime)}</span>
                  <span className="hidden sm:inline">
                    {formatShortTime(s.startTime)}-{formatShortTime(s.endTime)}
                  </span>
                </span>
              ))}
              {list.length > 3 && (
                <span className="text-[11px] text-slate-500">+{list.length - 3}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* まとめて選択中：選んだ日数と、時間を設定するボタン */}
      {multi && selected.length > 0 && !sheetOpen && (
        <div className="sticky bottom-4 z-10 flex items-center justify-between gap-3 rounded-xl bg-slate-900 px-4 py-3 text-white shadow-lg dark:bg-slate-700">
          <span className="text-sm">{selected.length}日を選択中</span>
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-bold hover:bg-sky-400"
          >
            時間を設定する
          </button>
        </div>
      )}

      {toast && (
        <div
          role="status"
          className={`fixed inset-x-4 bottom-4 z-20 mx-auto max-w-md rounded-xl px-4 py-3 text-sm text-white shadow-lg ${
            toast.kind === "error" ? "bg-red-700" : "bg-slate-900 dark:bg-slate-700"
          }`}
        >
          {toast.text}
        </div>
      )}

      {/* 選んだ日のシフトと、素早い追加（ポップアップ） */}
      <Sheet
        open={sheetOpen}
        onClose={closeSheet}
        title={
          singleDay
            ? `${singleDay === today ? "今日 " : ""}${formatDateJa(singleDay)}`
            : `${selected.length}日分にまとめて追加`
        }
      >
        <div className="flex flex-col gap-4">
          {multi && selected.length > 0 && (
            <p className="text-sm text-slate-500">
              {selected.map((d) => formatDateJa(d)).join("、")}
            </p>
          )}

          {singleDay && dayShifts.length > 0 && (
            <ul className="flex flex-col gap-2">
              {dayShifts.map((s) => {
                const wp = workplaceById.get(s.workplaceId);
                const conflict = conflictIds.has(s.id);
                return (
                  <li
                    key={s.id}
                    className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-900"
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
                      {conflict && (
                        <p className="text-sm text-red-600">⚠ 他のシフトと重なっています</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => remove(s.id)}
                      disabled={pending}
                      className="text-sm text-slate-400 hover:text-red-600"
                      aria-label="このシフトを削除"
                    >
                      削除
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">勤務先</p>
            <div className="flex flex-wrap gap-2">
              {workplaces.map((wp) => {
                const active = wp.id === workplaceId;
                return (
                  <label key={wp.id} className="cursor-pointer">
                    <input
                      type="radio"
                      name="calendar-workplace"
                      value={wp.id}
                      checked={active}
                      onChange={() => selectWorkplace(wp.id)}
                      className="peer sr-only"
                    />
                    <span
                      className="block rounded-full border-2 px-3 py-1 text-sm font-medium peer-focus-visible:ring-2 peer-focus-visible:ring-sky-300"
                      style={{
                        borderColor: wp.color,
                        backgroundColor: active ? wp.color : undefined,
                        color: active ? "#fff" : undefined,
                      }}
                    >
                      {wp.name}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">
              時間帯をタップで追加
              <span className="ml-2 text-xs font-normal text-slate-500">
                {presets[0]?.count ? "よく使う順" : "よくある時間帯（使うほど自分用に変わります）"}
              </span>
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {presets.map((p, i) => {
                const overlaps = conflictDays(p);
                return (
                  <button
                    key={`${p.startTime}-${p.endTime}-${p.breakMinutes}`}
                    type="button"
                    disabled={pending || selected.length === 0}
                    onClick={() => add(p)}
                    className="relative flex flex-col items-center rounded-lg border-2 bg-white px-2 py-2 tabular-nums hover:opacity-80 disabled:opacity-50 dark:bg-slate-900"
                    style={{ borderColor: workplace?.color }}
                  >
                    {i === 0 && p.count && (
                      <span
                        className="absolute -top-2 left-2 rounded-full px-1.5 text-[10px] font-bold text-white"
                        style={{ backgroundColor: workplace?.color ?? "#0284c7" }}
                      >
                        いちばん多い
                      </span>
                    )}
                    <span className="font-bold">
                      {p.startTime}〜{p.endTime}
                    </span>
                    <span className="text-xs text-slate-500">
                      {p.breakMinutes > 0 ? `休憩${p.breakMinutes}分` : "休憩なし"}
                      {p.count ? `・${p.count}回` : ""}
                    </span>
                    {overlaps.length > 0 && (
                      <span className="text-xs text-red-600">
                        ⚠ {selected.length > 1 ? `${overlaps.length}日で重なる` : "重なりあり"}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <details className="text-sm">
            <summary className="cursor-pointer font-medium text-slate-600 dark:text-slate-300">
              時間を指定して追加
            </summary>
            <div className="mt-3 flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="開始"
                  type="time"
                  step={300}
                  value={custom.startTime}
                  onChange={(e) => changeTime({ startTime: e.target.value })}
                />
                <Field
                  label="終了"
                  type="time"
                  step={300}
                  value={custom.endTime}
                  onChange={(e) => changeTime({ endTime: e.target.value })}
                />
              </div>
              <BreakPicker
                choices={settings.breakOptions}
                value={custom.breakMinutes}
                onChange={(breakMinutes) => setCustom({ ...custom, breakMinutes })}
                startTime={custom.startTime}
                endTime={custom.endTime}
              />
              <Field
                label="メモ（任意）"
                value={note}
                placeholder="例: レジ締め担当"
                onChange={(e) => setNote(e.target.value)}
              />
              {conflictDays(custom).length > 0 && (
                <Alert kind="error">⚠ この時間は他のシフトと重なります</Alert>
              )}
              <Button
                type="button"
                disabled={pending || selected.length === 0}
                onClick={() => add(custom)}
              >
                {pending ? "登録中…" : "この時間で追加"}
              </Button>
            </div>
          </details>

          {message && <Alert kind={message.kind}>{message.text}</Alert>}
        </div>
      </Sheet>
    </div>
  );
}
