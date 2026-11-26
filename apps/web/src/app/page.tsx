import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-8 px-4 py-16 text-center">
      <div>
        <h1 className="text-4xl font-bold">しふとん！</h1>
        <p className="mt-3 text-slate-500">
          アルバイトのシフト作成・共有・希望提出を、ブラウザとスマホでまとめて管理。
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <Link
          href="/signup"
          className="rounded-md bg-sky-600 px-5 py-2.5 font-medium text-white hover:bg-sky-700"
        >
          無料で始める
        </Link>
        <Link
          href="/login"
          className="rounded-md border border-slate-300 px-5 py-2.5 font-medium hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
        >
          ログイン
        </Link>
      </div>
      <Link href="/demo" className="text-sm text-sky-600 underline">
        サンプルのシフト表を見る
      </Link>
    </main>
  );
}
