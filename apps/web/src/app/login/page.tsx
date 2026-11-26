import { Suspense } from "react";
import { signIn } from "@/app/actions/auth";
import { AuthForm } from "@/components/auth-form";

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <main className="mx-auto w-full max-w-sm flex-1 px-4 py-16">
      <Suspense fallback={<AuthForm mode="login" action={signIn} />}>
        <LoginFormWithError searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function LoginFormWithError({ searchParams }: Pick<PageProps<"/login">, "searchParams">) {
  const { error } = await searchParams;
  const initialError =
    error === "confirm"
      ? "メールの確認に失敗しました。リンクの有効期限が切れている可能性があります"
      : undefined;
  return <AuthForm mode="login" action={signIn} initialError={initialError} />;
}
