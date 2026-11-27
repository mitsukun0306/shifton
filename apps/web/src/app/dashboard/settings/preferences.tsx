"use client";

import {
  type AppSettings,
  type BreakRule,
  breakForRules,
  defaultSettings,
  describeBreakRules,
  isBreakLegal,
  isLegalBreakRules,
  legalBreakRules,
} from "@shifton/core";
import { type ReactNode, useOptimistic, useState, useTransition } from "react";
import { Sheet } from "@/components/sheet";
import { Alert, Button } from "@/components/ui";
import { saveSettingsAction } from "../actions";

const HOUR_CHOICES = Array.from({ length: 24 }, (_, i) => (i + 1) * 30).filter((m) => m <= 12 * 60);
const BREAK_CHOICES = [0, 10, 15, 20, 30, 45, 60, 75, 90, 120];
const OPTION_CHOICES = [0, 10, 15, 20, 30, 45, 60, 75, 90, 120];

function formatSpan(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}時間${m ? `${m}分` : ""}`;
}

/** 設定の1行。タップすると編集用のポップアップを開く */
function SettingRow({
  label,
  value,
  onClick,
}: {
  label: string;
  value: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800"
    >
      <span className="flex-1">
        <span className="block font-medium">{label}</span>
        <span className="block text-sm text-slate-500">{value}</span>
      </span>
      <span aria-hidden className="text-slate-400">
        ›
      </span>
    </button>
  );
}

const selectClass =
  "rounded-md border border-slate-300 bg-white px-2 py-1 text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100";

/** 休憩・時間帯の候補などの設定（このブラウザに保存） */
export function Preferences({
  settings: saved,
  loadError,
}: {
  settings: AppSettings;
  /** 設定を読み込めなかったときの理由 */
  loadError?: string;
}) {
  // 保存が終わる前から画面に反映し、失敗したら元に戻す
  const [settings, setOptimistic] = useOptimistic(saved);
  const [saveError, setSaveError] = useState<string>();
  const [, startTransition] = useTransition();

  function save(next: AppSettings) {
    setSaveError(undefined);
    startTransition(async () => {
      setOptimistic(next);
      const result = await saveSettingsAction(next);
      if (result.error) setSaveError(result.error);
    });
  }
  const [editing, setEditing] = useState<"rules" | "options" | "count">();
  const [draftRules, setDraftRules] = useState<BreakRule[]>([]);

  function openRules() {
    setDraftRules([...settings.breakRules]);
    setEditing("rules");
  }

  // 6〜13時間の勤務を15分刻みで試して、法律の最低限を下回る場合があるか調べる
  const draftBelowLegal = Array.from({ length: 29 }, (_, i) => 6 * 60 + i * 15).some((span) => {
    const end = formatHm(span);
    return !isBreakLegal("00:00", end, breakForRules("00:00", end, draftRules));
  });

  return (
    <>
      {(loadError || saveError) && (
        <div className="px-4 pb-2">
          <Alert kind="error">
            設定を{saveError ? "保存" : "読み込み"}できませんでした。Supabase に設定用のテーブル（
            supabase/migrations/20261127000000_user_settings.sql）が作られているか確認してください。
            （{saveError ?? loadError}）
          </Alert>
        </div>
      )}
      <div className="divide-y divide-slate-200 dark:divide-slate-800">
        <SettingRow
          label="休憩の自動入力"
          value={`${describeBreakRules(settings.breakRules)}${isLegalBreakRules(settings.breakRules) ? "（法定の最低時間）" : ""}`}
          onClick={openRules}
        />
        <SettingRow
          label="休憩ボタンの候補"
          value={settings.breakOptions.map((m) => (m === 0 ? "なし" : `${m}分`)).join("・")}
          onClick={() => setEditing("options")}
        />
        <SettingRow
          label="時間帯の候補の数"
          value={`${settings.presetCount}個（よく使う順）`}
          onClick={() => setEditing("count")}
        />
      </div>

      <Sheet
        open={editing === "rules"}
        onClose={() => setEditing(undefined)}
        title="休憩の自動入力"
      >
        <div className="flex flex-col gap-4 text-sm">
          <p className="text-slate-500">
            シフトの時間を選んだとき、勤務時間に応じて休憩を自動で入れます。入れたあとも変更できます。
          </p>
          {draftRules.length === 0 && <p>休憩を自動で入れません。</p>}
          {draftRules.map((rule, i) => (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: 編集中は並び替えない
              key={i}
              className="flex flex-wrap items-center gap-x-2 gap-y-1"
            >
              <span>勤務</span>
              <select
                className={selectClass}
                value={rule.overMinutes}
                onChange={(e) =>
                  setDraftRules(
                    draftRules.map((r, j) =>
                      j === i ? { ...r, overMinutes: Number(e.target.value) } : r,
                    ),
                  )
                }
              >
                {HOUR_CHOICES.map((m) => (
                  <option key={m} value={m}>
                    {formatSpan(m)}
                  </option>
                ))}
              </select>
              <span>超 → 休憩</span>
              <select
                className={selectClass}
                value={rule.breakMinutes}
                onChange={(e) =>
                  setDraftRules(
                    draftRules.map((r, j) =>
                      j === i ? { ...r, breakMinutes: Number(e.target.value) } : r,
                    ),
                  )
                }
              >
                {BREAK_CHOICES.map((m) => (
                  <option key={m} value={m}>
                    {m}分
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setDraftRules(draftRules.filter((_, j) => j !== i))}
                aria-label="このルールを削除"
                className="px-1 text-lg leading-none text-slate-400 hover:text-red-600"
              >
                ×
              </button>
            </div>
          ))}
          <div className="flex flex-wrap gap-3">
            {draftRules.length < 5 && (
              <button
                type="button"
                onClick={() =>
                  setDraftRules([...draftRules, { overMinutes: 4 * 60, breakMinutes: 30 }])
                }
                className="text-sky-600 underline"
              >
                ＋ ルールを追加
              </button>
            )}
            <button
              type="button"
              onClick={() => setDraftRules([...legalBreakRules])}
              className="text-sky-600 underline"
            >
              法定の最低時間に戻す
            </button>
          </div>
          {draftBelowLegal && (
            <Alert kind="error">
              ⚠ 法律（労働基準法第34条）で決められた最低限の休憩より短くなる勤務時間があります
            </Alert>
          )}
          <Button
            type="button"
            onClick={() => {
              save({
                ...settings,
                breakRules: [...draftRules].sort((a, b) => a.overMinutes - b.overMinutes),
              });
              setEditing(undefined);
            }}
          >
            保存する
          </Button>
        </div>
      </Sheet>

      <Sheet
        open={editing === "options"}
        onClose={() => setEditing(undefined)}
        title="休憩ボタンの候補"
      >
        <div className="flex flex-col gap-4 text-sm">
          <p className="text-slate-500">休憩を選ぶときに並べるボタンを選んでください。</p>
          <div className="flex flex-wrap gap-2">
            {OPTION_CHOICES.map((m) => {
              const active = settings.breakOptions.includes(m);
              return (
                <button
                  key={m}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    const next = active
                      ? settings.breakOptions.filter((x) => x !== m)
                      : [...settings.breakOptions, m].sort((a, b) => a - b);
                    if (next.length > 0) save({ ...settings, breakOptions: next });
                  }}
                  className={`rounded-full border px-3 py-1 tabular-nums ${
                    active
                      ? "border-sky-600 bg-sky-600 font-bold text-white"
                      : "border-slate-300 dark:border-slate-700"
                  }`}
                >
                  {m === 0 ? "なし" : `${m}分`}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => save({ ...settings, breakOptions: defaultSettings.breakOptions })}
            className="self-start text-sky-600 underline"
          >
            最初の状態に戻す
          </button>
        </div>
      </Sheet>

      <Sheet
        open={editing === "count"}
        onClose={() => setEditing(undefined)}
        title="時間帯の候補の数"
      >
        <div className="flex flex-col gap-4 text-sm">
          <p className="text-slate-500">
            カレンダーで日付を選んだときに出す、よく使う時間帯のボタンの数です。
          </p>
          <div className="flex flex-wrap gap-2">
            {[2, 3, 4, 6, 8].map((n) => (
              <button
                key={n}
                type="button"
                aria-pressed={settings.presetCount === n}
                onClick={() => {
                  save({ ...settings, presetCount: n });
                  setEditing(undefined);
                }}
                className={`rounded-full border px-4 py-1 tabular-nums ${
                  settings.presetCount === n
                    ? "border-sky-600 bg-sky-600 font-bold text-white"
                    : "border-slate-300 dark:border-slate-700"
                }`}
              >
                {n}個
              </button>
            ))}
          </div>
        </div>
      </Sheet>
    </>
  );
}

function formatHm(minutes: number) {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}
