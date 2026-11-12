import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { safeNextPath } from "@/lib/validation";
import { getParent } from "@/server/session";

export const metadata: Metadata = { title: "Sign in · WordSpark 11+" };

type Props = { searchParams: Promise<{ next?: string }> };

export default async function SignInPage({ searchParams }: Props) {
  const next = safeNextPath((await searchParams).next);
  if (await getParent()) redirect(next);

  return (
    <section className="page auth">
      <header className="section-head page-banner">
        <h1>Welcome back</h1>
        <p>Sign in to pick up your word missions where you left off.</p>
      </header>
      <AuthForm mode="sign-in" next={next} />
    </section>
  );
}
