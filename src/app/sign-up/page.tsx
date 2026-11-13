import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { getParent } from "@/server/session";

export const metadata: Metadata = { title: "Create an account · WordSpark 11+" };

export default async function SignUpPage() {
  if (await getParent()) redirect("/profiles");

  return (
    <section className="page auth">
      <header className="section-head page-banner">
        <h1>Create a family account</h1>
        <p>A parent or carer signs up, then adds a profile for each child. Children don&apos;t need an email.</p>
      </header>
      <AuthForm mode="sign-up" />
    </section>
  );
}
