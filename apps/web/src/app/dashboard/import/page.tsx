import { fetchWorkplaces } from "@shifton/api";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Card } from "@/components/ui";
import { fetchSettingsOrDefault } from "@/lib/settings";
import { getCurrentUser } from "@/lib/supabase/server";
import { ImportForm } from "./import-form";

export default function ImportPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
      <h1 className="mb-2 text-xl font-bold">写真・スクショからシフトを読み取る</h1>
      <p className="mb-6 text-sm text-slate-500">
        紙のシフト表の写真や、シフトアプリ・LINE
        のスクリーンショットから、あなたのシフトを読み取ります。
        読み取った内容は登録前に確認・修正できます。
      </p>
      <Suspense fallback={<p className="text-slate-500">読み込み中…</p>}>
        <ImportSection />
      </Suspense>
    </main>
  );
}

async function ImportSection() {
  const current = await getCurrentUser();
  if (!current) redirect("/login");
  const [workplaces, settings] = await Promise.all([
    fetchWorkplaces(current.supabase),
    fetchSettingsOrDefault(current.supabase),
  ]);

  if (workplaces.length === 0) {
    return (
      <Card>
        <p>
          先に
          <Link href="/dashboard/settings" className="text-sky-600 underline">
            勤務先を登録
          </Link>
          してください。
        </p>
      </Card>
    );
  }
  return <ImportForm workplaces={workplaces} settings={settings.settings} />;
}
