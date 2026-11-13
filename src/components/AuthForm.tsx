"use client";

import Link from "next/link";
import { useActionState } from "react";
import { AuthFormState, signInAction, signUpAction } from "@/app/actions/auth";

type Props = {
  mode: "sign-in" | "sign-up";
  next?: string;
};

export function AuthForm({ mode, next }: Props) {
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
      <form action={formAction} className="form-stack" noValidate>
        {next ? <input name="next" type="hidden" value={next} /> : null}

        {errors.form ? (
          <p className="form-error" role="alert">
            {errors.form}
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

      <p className="auth-switch">
        {isSignUp ? "Already have an account? " : "New to WordSpark? "}
        <Link className="link-inline" href={otherHrefWithNext}>
          {isSignUp ? "Sign in" : "Create a family account"}
        </Link>
      </p>
    </section>
  );
}
