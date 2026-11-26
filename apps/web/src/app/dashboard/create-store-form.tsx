"use client";

import { useActionState } from "react";
import { Alert, Button, Card, Field } from "@/components/ui";
import { createStoreAction } from "./actions";

export function CreateStoreForm() {
  const [state, formAction, pending] = useActionState(createStoreAction, {});

  return (
    <Card>
      <h2 className="mb-1 text-lg font-bold">店舗を作成</h2>
      <p className="mb-6 text-sm text-slate-500">
        シフトを管理する店舗を登録しましょう。あなたはこの店舗のオーナーになります。
      </p>
      <form action={formAction} className="flex flex-col gap-4">
        <Field label="店舗名" name="storeName" placeholder="例: カフェしふとん 渋谷店" required />
        <Field
          label="あなたの名前（スタッフに表示されます）"
          name="ownerName"
          placeholder="例: 佐藤"
          required
        />
        {state.error && <Alert kind="error">{state.error}</Alert>}
        <Button type="submit" disabled={pending}>
          {pending ? "作成中…" : "店舗を作成する"}
        </Button>
      </form>
    </Card>
  );
}
