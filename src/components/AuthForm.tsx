"use client";

import Link from "next/link";
import { useActionState } from "react";
import { AuthFormState, GoogleFormState, googleSignInAction, signInAction, signUpAction } from "@/app/actions/auth";

type Props = {
  mode: "sign-in" | "sign-up";
  next?: string;
  /** Show "Continue with Google" (only when the server has Google credentials). */
  googleEnabled?: boolean;
  /** A message from a failed Google sign-in (?error=…), already made friendly. */
  notice?: string | null;
};

function GoogleLogo() {
  return (
    <svg aria-hidden="true" className="google-logo" focusable="false" height="18" viewBox="0 0 48 48" width="18">
      <path d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" fill="#FFC107" />
      <path d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" fill="#FF3D00" />
      <path d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" fill="#4CAF50" />
      <path d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" fill="#1976D2" />
    </svg>
  );
}

function GoogleButton({ next }: { next?: string }) {
  const [state, formAction, pending] = useActionState<GoogleFormState, FormData>(googleSignInAction, {});
  return (
    <form action={formAction} className="form-stack">
      {next ? <input name="next" type="hidden" value={next} /> : null}
      {state.error ? (
        <p className="form-error" role="alert">
          {state.error}
        </p>
      ) : null}
      <button className="cta ghost google-btn" disabled={pending} type="submit">
        <GoogleLogo />
        {pending ? "Opening Google…" : "Continue with Google"}
      </button>
    </form>
  );
}

export function AuthForm({ mode, next, googleEnabled = false, notice }: Props) {
  const isSignUp = mode === "sign-up";
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(
    isSignUp ? signUpAction : signInAction,
    {},
  );
  const errors = state.errors ?? {};
  const otherHref = isSignUp ? "/sign-in" : "/sign-up";
  const otherHrefWithNext = next ? `${otherHref}?next=${encodeURIComponent(next)}` : otherHref;

  return (
    <section className="panel auth-panel">
      {googleEnabled ? (
        <>
          <GoogleButton next={next} />
          <p className="auth-divider">
            <span>or {isSignUp ? "sign up" : "sign in"} with email</span>
          </p>
        </>
      ) : null}

      <form action={formAction} className="form-stack" noValidate>
        {next ? <input name="next" type="hidden" value={next} /> : null}

        {errors.form || notice ? (
          <p className="form-error" role="alert">
            {errors.form ?? notice}
          </p>
        ) : null}

        {isSignUp ? (
          <label className="search-wrap" htmlFor="auth-name">
            <span>Your name (parent or carer)</span>
            <input
              aria-describedby={errors.name ? "auth-name-error" : undefined}
              aria-invalid={Boolean(errors.name)}
              autoComplete="name"
              defaultValue={state.values?.name}
              id="auth-name"
              name="name"
              required
              type="text"
            />
            {errors.name ? <small className="field-error" id="auth-name-error">{errors.name}</small> : null}
          </label>
        ) : null}

        <label className="search-wrap" htmlFor="auth-email">
          <span>Email</span>
          <input
            aria-describedby={errors.email ? "auth-email-error" : undefined}
            aria-invalid={Boolean(errors.email)}
            autoComplete="email"
            defaultValue={state.values?.email}
            id="auth-email"
            inputMode="email"
            name="email"
            required
            type="email"
          />
          {errors.email ? <small className="field-error" id="auth-email-error">{errors.email}</small> : null}
        </label>

        <label className="search-wrap" htmlFor="auth-password">
          <span>Password{isSignUp ? " (at least 8 characters)" : ""}</span>
          <input
            aria-describedby={errors.password ? "auth-password-error" : undefined}
            aria-invalid={Boolean(errors.password)}
            autoComplete={isSignUp ? "new-password" : "current-password"}
            id="auth-password"
            minLength={isSignUp ? 8 : undefined}
            name="password"
            required
            type="password"
          />
          {errors.password ? (
            <small className="field-error" id="auth-password-error">{errors.password}</small>
          ) : null}
        </label>

        <button className="cta" disabled={pending} type="submit">
          {pending ? "Please wait…" : isSignUp ? "Create family account" : "Sign in"}
        </button>
      </form>

      {isSignUp ? (
        <p className="section-meta">
          We only ask for what the app needs, and you can delete your account at any time. Read our{" "}
          <Link className="link-inline" href="/privacy">
            privacy notice
          </Link>
          .
        </p>
      ) : null}

      <p className="auth-switch">
        {isSignUp ? "Already have an account? " : "New to WordSpark? "}
        <Link className="link-inline" href={otherHrefWithNext}>
          {isSignUp ? "Sign in" : "Create a family account"}
        </Link>
      </p>
    </section>
  );
}
