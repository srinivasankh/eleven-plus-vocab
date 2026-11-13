import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { googleCredentials, googleErrorMessage } from "@/lib/googleAuth";
import { safeNextPath } from "@/lib/validation";
import { getParent } from "@/server/session";

export const metadata: Metadata = { title: "Sign in · WordSpark 11+" };

type Props = { searchParams: Promise<{ next?: string; error?: string; notice?: string }> };

export default async function SignInPage({ searchParams }: Props) {
  const params = await searchParams;
  const next = safeNextPath(params.next);
  if (await getParent()) redirect(next);

  return (
    <section className="page auth">
      <header className="section-head page-banner">
        <h1>Welcome back</h1>
        <p>Sign in to pick up your word missions where you left off.</p>
        {params.notice === "account_deleted" ? (
          <p className="kicker-pill" role="status">
            Your family account and all its learners&apos; progress have been deleted.
          </p>
        ) : null}
      </header>
      <AuthForm
        googleEnabled={googleCredentials(process.env) !== null}
        mode="sign-in"
        next={next}
        notice={googleErrorMessage(params.error)}
      />
    </section>
  );
}
