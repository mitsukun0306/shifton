"use client";

import type { NormalizedExtraction, ShiftCandidate, Workplace } from "@shifton/core";
import { formatDateJa } from "@shifton/core";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Alert, Button, Card, Field } from "@/components/ui";
import { importShiftsAction } from "../actions";
import { resizeImage } from "./resize-image";

type Row = ShiftCandidate & { include: boolean };

const NAME_KEY = "shifton:nameOnSheet";

const inputClass =
  "w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100";

export function ImportForm({ workplaces }: { workplaces: Workplace[] }) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>();
  const [nameOnSheet, setNameOnSheet] = useState("");
  const [workplaceId, setWorkplaceId] = useState(workplaces[0]?.id ?? "");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState<string>();
  const [reading, setReading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedCount, setSavedCount] = useState<number>();

  // 前回入力した名前を覚えておく（この端末のブラウザ内だけ）
  useEffect(() => {
    try {
      setNameOnSheet(localStorage.getItem(NAME_KEY) ?? "");
    } catch {}
  }, []);

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  async function read() {
    if (!file) return;
    setError(undefined);
    setRows(null);
    setSavedCount(undefined);
    setReading(true);
    try {
      try {
        localStorage.setItem(NAME_KEY, nameOnSheet);
      } catch {}
      const body = new FormData();
      body.append("image", await resizeImage(file), "shift.jpg");
      body.append("nameOnSheet", nameOnSheet);
      const res = await fetch("/api/shifts/read-image", { method: "POST", body });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "読み取りに失敗しました");
        return;
      }
      const result = data as NormalizedExtraction;
      setWarnings(result.warnings);
      setRows(result.candidates.map((c) => ({ ...c, include: true })));
    } catch {
      setError("通信に失敗しました。通信環境を確認してください");
    } finally {
      setReading(false);
    }
  }

  function update(index: number, patch: Partial<Row>) {
    setRows((prev) => prev?.map((r, i) => (i === index ? { ...r, ...patch } : r)) ?? null);
  }

  async function save() {
    if (!rows) return;
    setSaving(true);
    setError(undefined);
    const selected = rows
      .filter((r) => r.include)
      .map(({ date, startTime, endTime, breakMinutes, note }) => ({
        date,
        startTime,
        endTime,
        breakMinutes,
        note,
      }));
    const result = await importShiftsAction(workplaceId, selected);
    setSaving(false);
    if (result.error) {
      setError(result.error);
    } else {
      setSavedCount(result.count);
      setRows(null);
      setFile(null);
      setPreviewUrl(undefined);
    }
  }

  const selectedCount = rows?.filter((r) => r.include).length ?? 0;

  return (
    <div className="flex flex-col gap-6">
      {savedCount !== undefined && (
        <Alert kind="info">
          {savedCount}件のシフトを登録しました。{" "}
          <Link href="/dashboard" className="underline">
            シフト一覧を見る
          </Link>
        </Alert>
      )}

      <Card>
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">シフト表の画像</span>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="text-sm"
            />
          </label>
          {previewUrl && (
            // biome-ignore lint/performance/noImgElement: ローカルのプレビュー表示のため
            <img
              src={previewUrl}
              alt="選んだシフト表"
              className="max-h-80 w-fit rounded border border-slate-200 object-contain dark:border-slate-800"
            />
          )}
          <Field
            label="シフト表でのあなたの名前（複数人の表のとき）"
            value={nameOnSheet}
            onChange={(e) => setNameOnSheet(e.target.value)}
            placeholder="例: 佐藤"
          />
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">どの勤務先のシフトですか</span>
            <select
              value={workplaceId}
              onChange={(e) => setWorkplaceId(e.target.value)}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            >
              {workplaces.map((wp) => (
                <option key={wp.id} value={wp.id}>
                  {wp.name}
                </option>
              ))}
            </select>
          </label>
          <Button type="button" onClick={read} disabled={!file || reading}>
            {reading ? "読み取り中…（数十秒かかることがあります）" : "読み取る"}
          </Button>
          {error && <Alert kind="error">{error}</Alert>}
        </div>
      </Card>

      {rows && (
        <Card>
          <h2 className="mb-2 text-lg font-bold">読み取り結果の確認</h2>
          <p className="mb-4 text-sm text-slate-500">
            画像と見比べて、違うところは直してください。「要確認」の行は読み取りに自信がない行です。
          </p>
          {warnings.length > 0 && (
            <ul className="mb-4 list-disc rounded-md border border-amber-200 bg-amber-50 py-2 pr-3 pl-7 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
              {warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          )}
          {rows.length === 0 ? (
            <p className="text-sm text-slate-500">登録できるシフトは見つかりませんでした。</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="text-slate-500">
                  <tr>
                    <th className="py-2">登録</th>
                    <th>日付</th>
                    <th>開始</th>
                    <th>終了</th>
                    <th>休憩(分)</th>
                    <th>メモ</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr
                      // biome-ignore lint/suspicious/noArrayIndexKey: 行は編集中に並び替えない
                      key={i}
                      className={`border-t border-slate-200 dark:border-slate-800 ${r.uncertain ? "bg-amber-50 dark:bg-amber-950" : ""}`}
                    >
                      <td className="py-2">
                        <input
                          type="checkbox"
                          checked={r.include}
                          onChange={(e) => update(i, { include: e.target.checked })}
                          aria-label={`${formatDateJa(r.date)} を登録する`}
                        />
                        {r.uncertain && (
                          <span className="ml-1 rounded bg-amber-200 px-1 text-xs text-amber-900">
                            要確認
                          </span>
                        )}
                      </td>
                      <td>
                        <input
                          type="date"
                          value={r.date}
                          onChange={(e) => update(i, { date: e.target.value })}
                          className={inputClass}
                        />
                      </td>
                      <td>
                        <input
                          type="time"
                          value={r.startTime}
                          onChange={(e) => update(i, { startTime: e.target.value })}
                          className={inputClass}
                        />
                      </td>
                      <td>
                        <input
                          type="time"
                          value={r.endTime}
                          onChange={(e) => update(i, { endTime: e.target.value })}
                          className={inputClass}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min={0}
                          step={5}
                          value={r.breakMinutes}
                          onChange={(e) => update(i, { breakMinutes: Number(e.target.value) || 0 })}
                          className={`${inputClass} w-20`}
                        />
                      </td>
                      <td>
                        <input
                          value={r.note ?? ""}
                          onChange={(e) => update(i, { note: e.target.value || undefined })}
                          className={inputClass}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {rows.length > 0 && (
            <Button
              type="button"
              className="mt-4 w-full"
              onClick={save}
              disabled={saving || selectedCount === 0}
            >
              {saving ? "登録中…" : `${selectedCount}件のシフトを登録する`}
            </Button>
          )}
        </Card>
      )}
    </div>
  );
}
