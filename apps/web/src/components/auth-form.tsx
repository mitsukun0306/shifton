"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { FormState } from "@/app/actions/auth";
import { Alert, Button, Card, Field } from "./ui";

type Props = {
  mode: "login" | "signup";
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  initialError?: string;
};

export function AuthForm({ mode, action, initialError }: Props) {
  const [state, formAction, pending] = useActionState(action, { error: initialError });
  const isLogin = mode === "login";

  return (
    <Card>
      <h1 className="mb-6 text-xl font-bold">{isLogin ? "ログイン" : "新規登録"}</h1>
      <form action={formAction} className="flex flex-col gap-4">
        <Field
          key={state.email}
          label="メールアドレス"
          name="email"
          type="email"
          autoComplete="email"
          defaultValue={state.email}
          required
        />
        <Field
          label="パスワード（8文字以上）"
          name="password"
          type="password"
          autoComplete={isLogin ? "current-password" : "new-password"}
          minLength={8}
          required
        />
        {state.error && <Alert kind="error">{state.error}</Alert>}
        {state.message && <Alert kind="info">{state.message}</Alert>}
        <Button type="submit" disabled={pending}>
          {pending ? "送信中…" : isLogin ? "ログイン" : "登録する"}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-500">
        {isLogin ? (
          <>
            アカウントをお持ちでない方は{" "}
            <Link className="text-sky-600 underline" href="/signup">
              新規登録
            </Link>
          </>
        ) : (
          <>
            すでに登録済みの方は{" "}
            <Link className="text-sky-600 underline" href="/login">
              ログイン
            </Link>
          </>
        )}
      </p>
    </Card>
  );
}
