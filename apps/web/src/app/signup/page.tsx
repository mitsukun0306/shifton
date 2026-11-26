import { signUp } from "@/app/actions/auth";
import { AuthForm } from "@/components/auth-form";

export default function SignupPage() {
  return (
    <main className="mx-auto w-full max-w-sm flex-1 px-4 py-16">
      <AuthForm mode="signup" action={signUp} />
    </main>
  );
}
