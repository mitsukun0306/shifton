"use client";

import { workplaceColors } from "@shifton/core";
import { useActionState, useEffect, useState } from "react";
import { Sheet } from "@/components/sheet";
import { Alert, Button, Field } from "@/components/ui";
import { type ActionState, createWorkplaceAction } from "./actions";

const initial: ActionState = {};

export function WorkplaceForm({ onDone }: { onDone?: () => void } = {}) {
  const [state, formAction, pending] = useActionState(createWorkplaceAction, initial);

  // 登録できたら（ポップアップなら）閉じる
  useEffect(() => {
    if (state.ok) onDone?.();
  }, [state, onDone]);

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

/** 「＋ 勤務先を追加」ボタンと、登録フォームのポップアップ */
export function AddWorkplaceButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        ＋ 勤務先を追加
      </Button>
      <Sheet open={open} onClose={() => setOpen(false)} title="勤務先を追加">
        <WorkplaceForm onDone={() => setOpen(false)} />
      </Sheet>
    </>
  );
}
