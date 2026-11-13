"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { deleteAccountAction, ManageFormState, removeChildAction } from "@/app/actions/profiles";
import { DELETE_ACCOUNT_WORD } from "@/lib/validation";

type Learner = { id: string; displayName: string };

function RemoveLearner({ learner }: { learner: Learner }) {
  const [confirming, setConfirming] = useState(false);
  const [state, formAction, pending] = useActionState<ManageFormState, FormData>(removeChildAction, {});

  return (
    <li className="manage-row">
      <span className="manage-name">{learner.displayName}</span>
      {confirming ? (
        <form action={formAction} className="manage-confirm">
          <input name="childId" type="hidden" value={learner.id} />
          <span>Remove {learner.displayName} and all their progress? This can&apos;t be undone.</span>
          <span className="meta-row">
            <button className="chip-btn danger" disabled={pending} type="submit">
              {pending ? "Removing…" : "Yes, remove"}
            </button>
            <button className="chip-btn" disabled={pending} onClick={() => setConfirming(false)} type="button">
              Cancel
            </button>
          </span>
          {state.error ? <small className="field-error">{state.error}</small> : null}
        </form>
      ) : (
        <button className="chip-btn" onClick={() => setConfirming(true)} type="button">
          Remove
        </button>
      )}
    </li>
  );
}

function DeleteAccount() {
  const [state, formAction, pending] = useActionState<ManageFormState, FormData>(deleteAccountAction, {});

  return (
    <form action={formAction} className="form-stack">
      <p className="section-meta">
        This deletes your family account straight away: your sign-in, every learner and all their progress. It
        can&apos;t be undone.
      </p>
      <label className="search-wrap" htmlFor="delete-confirm">
        <span>Type {DELETE_ACCOUNT_WORD} to confirm</span>
        <input
          aria-describedby={state.error ? "delete-confirm-error" : undefined}
          aria-invalid={Boolean(state.error)}
          autoCapitalize="characters"
          autoComplete="off"
          id="delete-confirm"
          name="confirm"
          type="text"
        />
        {state.error ? (
          <small className="field-error" id="delete-confirm-error">
            {state.error}
          </small>
        ) : null}
      </label>
      <button className="cta danger" disabled={pending} type="submit">
        {pending ? "Deleting…" : "Delete my account"}
      </button>
    </form>
  );
}

/** Grown-ups' corner on the learner picker: remove a learner, or delete the whole account. */
export function ManageFamily({ learners }: { learners: Learner[] }) {
  return (
    <details className="panel manage-family">
      <summary>Manage family account</summary>
      <div className="form-stack">
        {learners.length ? (
          <section>
            <h3>Learners</h3>
            <ul className="manage-list">
              {learners.map((learner) => (
                <RemoveLearner key={learner.id} learner={learner} />
              ))}
            </ul>
          </section>
        ) : null}
        <section>
          <h3>Delete account</h3>
          <DeleteAccount />
        </section>
        <p className="section-meta">
          See how we look after your family&apos;s data in our{" "}
          <Link className="link-inline" href="/privacy">
            privacy notice
          </Link>
          .
        </p>
      </div>
    </details>
  );
}
