import type { Metadata } from "next";
import { selectChildAction } from "@/app/actions/profiles";
import { AddChildForm } from "@/components/AddChildForm";
import { ManageFamily } from "@/components/ManageFamily";
import { learnerNextPath, MAX_CHILDREN } from "@/lib/validation";
import { listChildren } from "@/server/children";
import { getActiveChild, requireParent } from "@/server/session";

export const metadata: Metadata = { title: "Who's learning? · WordSpark 11+" };

const avatars = ["🦊", "🐼", "🦉", "🐯", "🐬", "🦄"];

type Props = { searchParams: Promise<{ next?: string }> };

export default async function ProfilesPage({ searchParams }: Props) {
  const parent = await requireParent("/profiles");
  const next = learnerNextPath((await searchParams).next);
  const [children, active] = await Promise.all([listChildren(parent.id), getActiveChild()]);

  return (
    <section className="page profiles">
      <header className="section-head page-banner">
        <div className="banner-row">
          <div>
            <h1>{children.length ? "Who's learning today?" : `Welcome, ${parent.name}!`}</h1>
            <p>
              {children.length
                ? "Pick a learner to start their missions. Each learner has their own progress."
                : "Add a profile for each child who will use WordSpark."}
            </p>
          </div>
          <span className="kicker-pill">
            {children.length}/{MAX_CHILDREN} learners
          </span>
        </div>
      </header>

      {children.length ? (
        <div className="mission-grid">
          {children.map((child, index) => (
            <form action={selectChildAction} key={child.id}>
              <input name="childId" type="hidden" value={child.id} />
              <input name="next" type="hidden" value={next} />
              <button className="panel group-card profile-card" type="submit">
                <span aria-hidden="true" className="group-emoji">{avatars[index % avatars.length]}</span>
                <h2>{child.displayName}</h2>
                <div className="meta-row">
                  <span className="meta-pill">{active?.id === child.id ? "Learning now" : "Tap to start"}</span>
                </div>
              </button>
            </form>
          ))}
        </div>
      ) : null}

      {children.length < MAX_CHILDREN ? <AddChildForm first={children.length === 0} next={next} /> : null}

      <ManageFamily learners={children} />
    </section>
  );
}
