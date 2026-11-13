import type { Metadata } from "next";
import Link from "next/link";
import { legal } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Privacy notice · WordSpark 11+",
  description: "What WordSpark stores about families, why, and how to delete it.",
};

const mail = `mailto:${legal.contactEmail}`;

/**
 * Written from what the code actually does (see CLAUDE.md). If a feature changes what is stored,
 * where, or for how long, update this page and `legal.lastUpdated` in the same change.
 */
export default function PrivacyPage() {
  return (
    <section className="page legal">
      <header className="section-head page-banner">
        <h1>Privacy notice</h1>
        <p>How {legal.appName} looks after your family&apos;s information. Last updated {legal.lastUpdated}.</p>
      </header>

      <article className="panel">
        <h2>The short version</h2>
        <ul>
          <li>A parent or carer creates the account. Children don&apos;t have their own accounts or email addresses.</li>
          <li>For each child we only ask for a first name or nickname, then save the words they learn and their quiz scores.</li>
          <li>No adverts, no tracking or analytics, and we never sell or share your data for marketing.</li>
          <li>You can remove a learner, or delete your whole account, yourself at any time.</li>
        </ul>

        <h2>Who we are</h2>
        <p>
          {legal.appName} ({legal.siteUrl}) is run by {legal.operator}, who is responsible for your data (the
          &ldquo;controller&rdquo; under UK data protection law). Questions or requests:{" "}
          <a className="link-inline" href={mail}>
            {legal.contactEmail}
          </a>
          .
        </p>

        <h2>What we store</h2>
        <p>
          <strong>About the parent or carer</strong>
        </p>
        <ul>
          <li>Your name and email address.</li>
          <li>
            If you sign up with a password: the password, stored only in scrambled (hashed) form, so nobody can read it.
          </li>
          <li>
            If you use &ldquo;Continue with Google&rdquo;: your name, email address, profile picture link and Google
            account ID, which Google shares when you agree. We don&apos;t keep any Google access keys, and we can&apos;t
            see your Gmail, contacts or anything else in your Google account.
          </li>
        </ul>
        <p>
          <strong>About each learner (child)</strong>
        </p>
        <ul>
          <li>The first name or nickname you type in. Nothing else about the child, such as age, school or photo.</li>
          <li>
            Their learning: the words they mark as learned, their quiz questions and answers, scores, dates, and the quiz
            length they last chose.
          </li>
          <li>
            If you choose to import progress saved in this browser by the earlier version of {legal.appName}, the learned
            words and quiz results from it.
          </li>
        </ul>
        <p>
          <strong>Technical information</strong>
        </p>
        <ul>
          <li>
            When you sign in we save the sign-in session along with your IP address and browser type, so a session can be
            recognised and kept secure. A session lasts up to 7 days and is renewed while you keep using the app.
          </li>
          <li>
            To stop people guessing passwords, we briefly keep counts of sign-in attempts per IP address and per email
            address (the email in scrambled form). These are cleared out automatically about a day later.
          </li>
          <li>
            Our hosting provider keeps short-lived technical logs of requests and errors. Our own logs record account and
            learner ID numbers, never names or email addresses.
          </li>
        </ul>

        <h2>Why we use it</h2>
        <ul>
          <li>
            To provide the service you sign up for: your account, your learners&apos; progress, quizzes and scores. (Legal
            basis: performing our agreement with you.)
          </li>
          <li>
            To keep accounts safe and the service running, for example blocking repeated password guesses and fixing
            errors. (Legal basis: our legitimate interest in a secure, working service.)
          </li>
        </ul>
        <p>
          We don&apos;t use your data for advertising, profiling or automated decisions about you or your children, and we
          don&apos;t send marketing emails.
        </p>

        <h2>Cookies and browser storage</h2>
        <p>We only use what the app needs to work, so there&apos;s no cookie banner:</p>
        <ul>
          <li>A sign-in cookie that keeps you signed in.</li>
          <li>A cookie that remembers which learner is using the app on this device.</li>
          <li>Short-lived cookies used during &ldquo;Continue with Google&rdquo; to keep that sign-in secure.</li>
          <li>Your light or dark theme choice, saved in this browser only.</li>
        </ul>

        <h2>Who else handles your data</h2>
        <p>We use these service providers, who only process data on our instructions:</p>
        <ul>
          <li>
            <strong>Vercel</strong>, which hosts the app. Our app runs on its servers in London, UK.
          </li>
          <li>
            <strong>Neon</strong>, which runs our database. It&apos;s stored in London, UK.
          </li>
          <li>
            <strong>Google</strong>, only if you choose &ldquo;Continue with Google&rdquo;, to confirm who you are.
          </li>
        </ul>
        <p>
          Vercel and Neon are US companies, so some technical data (such as request logs) may be handled outside the UK
          under their data protection terms.
        </p>

        <h2>How long we keep it</h2>
        <ul>
          <li>Your account and your learners&apos; progress are kept until you delete them.</li>
          <li>
            Removing a learner, or deleting your account, removes the data from our database straight away. Copies can stay
            in our database provider&apos;s short-term backups for a limited time before they&apos;re overwritten.
          </li>
        </ul>

        <h2>Your choices and rights</h2>
        <ul>
          <li>
            <strong>Remove a learner or delete your account:</strong> go to{" "}
            <Link className="link-inline" href="/profiles">
              Who&apos;s learning?
            </Link>{" "}
            and open &ldquo;Manage family account&rdquo;.
          </li>
          <li>
            <strong>Reset a learner&apos;s progress:</strong> on their Progress page.
          </li>
          <li>
            <strong>Get a copy of your data, or correct it:</strong> email{" "}
            <a className="link-inline" href={mail}>
              {legal.contactEmail}
            </a>
            . We&apos;ll reply within one month.
          </li>
          <li>
            You can also object to how we use your data or ask us to limit it. If you&apos;re unhappy with how we&apos;ve
            handled your data, please tell us first. You can also complain to the Information Commissioner&apos;s Office
            (ICO) at{" "}
            <a className="link-inline" href="https://ico.org.uk/make-a-complaint/" rel="noreferrer" target="_blank">
              ico.org.uk
            </a>
            .
          </li>
        </ul>

        <h2>Children</h2>
        <p>
          {legal.appName} is for 11+ practice, so most learners are children. Only a parent or carer can create an account
          and add learners, and we ask for as little about each child as we can: a first name or nickname. There&apos;s no
          chat, nothing children can share with others, and nothing public.
        </p>

        <h2>Keeping it safe</h2>
        <p>
          Everything is sent over an encrypted (HTTPS) connection, passwords are stored hashed, and every request checks
          that a learner belongs to the signed-in parent.
        </p>

        <h2>Changes</h2>
        <p>
          If we change what we collect or how we use it, we&apos;ll update this page and the date at the top.
        </p>
      </article>
    </section>
  );
}
