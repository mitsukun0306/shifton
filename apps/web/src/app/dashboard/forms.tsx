"use client";

import type { Workplace } from "@shifton/core";
import { workplaceColors } from "@shifton/core";
import { useActionState } from "react";
import { Alert, Button, Field } from "@/components/ui";
import { type ActionState, createShiftAction, createWorkplaceAction } from "./actions";

const initial: ActionState = {};

export function WorkplaceForm() {
  const [state, formAction, pending] = useActionState(createWorkplaceAction, initial);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Field label="勤務先の名前" name="name" placeholder="例: カフェしふとん" required />
      <Field
        label="時給（円・任意）"
        name="hourlyWage"
        type="number"
        min={0}
        inputMode="numeric"
        placeholder="例: 1200"
      />
      <fieldset className="flex flex-col gap-1 text-sm">
        <legend className="mb-1 font-medium">色</legend>
        <div className="flex gap-2">
          {workplaceColors.map((color, i) => (
            <label key={color} className="cursor-pointer">
              <input
                type="radio"
                name="color"
                value={color}
                defaultChecked={i === 0}
                className="peer sr-only"
              />
              <span
                className="block h-8 w-8 rounded-full ring-offset-2 peer-checked:ring-2 peer-checked:ring-slate-900 dark:peer-checked:ring-white"
                style={{ backgroundColor: color }}
              />
              <span className="sr-only">{color}</span>
            </label>
          ))}
        </div>
      </fieldset>
      {state.error && <Alert kind="error">{state.error}</Alert>}
      <Button type="submit" disabled={pending}>
        {pending ? "登録中…" : "勤務先を登録する"}
      </Button>
    </form>
  );
}

export function ShiftForm({ workplaces, today }: { workplaces: Workplace[]; today: string }) {
  const [state, formAction, pending] = useActionState(createShiftAction, initial);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">勤務先</span>
        <select
          name="workplaceId"
          required
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        >
          {workplaces.map((wp) => (
            <option key={wp.id} value={wp.id}>
              {wp.name}
            </option>
          ))}
        </select>
      </label>
      <Field label="日付" name="date" type="date" defaultValue={today} required />
      <div className="grid grid-cols-2 gap-3">
        <Field label="開始" name="startTime" type="time" defaultValue="10:00" required />
        <Field label="終了" name="endTime" type="time" defaultValue="15:00" required />
      </div>
      <Field
        label="休憩（分）"
        name="breakMinutes"
        type="number"
        min={0}
        step={5}
        defaultValue={0}
      />
      <Field label="メモ（任意）" name="note" placeholder="例: レジ締め担当" />
      {state.error && <Alert kind="error">{state.error}</Alert>}
      {state.ok && <Alert kind="info">シフトを登録しました</Alert>}
      <Button type="submit" disabled={pending}>
        {pending ? "登録中…" : "シフトを追加"}
      </Button>
    </form>
  );
}
