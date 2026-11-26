import { z } from "zod";

export const credentialsSchema = z.object({
  email: z.email("メールアドレスの形式が正しくありません"),
  password: z.string().min(8, "パスワードは8文字以上で入力してください"),
});
export type Credentials = z.infer<typeof credentialsSchema>;

/** Supabase Auth のエラーメッセージを日本語に置き換える */
export function translateAuthError(message: string): string {
  const table: Array<[RegExp, string]> = [
    [/invalid login credentials/i, "メールアドレスまたはパスワードが違います"],
    [
      /email not confirmed/i,
      "メールアドレスの確認が完了していません。届いたメールのリンクを開いてください",
    ],
    [/user already registered/i, "このメールアドレスはすでに登録されています"],
    [/password should be at least/i, "パスワードが短すぎます"],
    [
      /rate limit|too many requests/i,
      "短時間に操作が集中しました。しばらく待ってからお試しください",
    ],
    [/fetch failed|network/i, "サーバーに接続できませんでした。通信環境と設定を確認してください"],
  ];
  return table.find(([pattern]) => pattern.test(message))?.[1] ?? message;
}
