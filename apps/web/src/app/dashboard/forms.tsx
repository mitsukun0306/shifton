"use client";

import { workplaceColors } from "@shifton/core";
import { useActionState } from "react";
import { Alert, Button, Field } from "@/components/ui";
import { type ActionState, createWorkplaceAction } from "./actions";

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
