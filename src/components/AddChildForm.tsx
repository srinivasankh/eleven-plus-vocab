"use client";

import { useActionState } from "react";
import { ChildFormState, createChildAction } from "@/app/actions/profiles";

export function AddChildForm({ first, next }: { first: boolean; next: string }) {
  const [state, formAction, pending] = useActionState<ChildFormState, FormData>(createChildAction, {});

  return (
    <section className="panel">
      <h2>{first ? "Add your first learner" : "Add another learner"}</h2>
      <form action={formAction} className="form-stack form-inline">
        <input name="next" type="hidden" value={next} />
        <label className="search-wrap" htmlFor="child-name">
          <span>First name or nickname</span>
          <input
            aria-describedby={state.error ? "child-name-error" : undefined}
            aria-invalid={Boolean(state.error)}
            autoComplete="off"
            defaultValue={state.value}
            id="child-name"
            maxLength={30}
            name="displayName"
            placeholder="Try: Asha"
            required
            type="text"
          />
          {state.error ? <small className="field-error" id="child-name-error">{state.error}</small> : null}
        </label>
        <button className="cta" disabled={pending} type="submit">
          {pending ? "Adding…" : "Add and start"}
        </button>
      </form>
    </section>
  );
}
