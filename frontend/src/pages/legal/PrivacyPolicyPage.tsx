/**
 * PrivacyPolicyPage.tsx — /privacy
 * ==================================
 * Launch charter BP04 §6.3 (launch gate). Honest, plain-language privacy
 * policy grounded in the platform's ACTUAL practices: PostgreSQL on Render,
 * media on Cloudflare R2, payments via Stripe (no card storage), zero-PII
 * proxy for AI features, no sale of personal data.
 * ⚠️ DRAFT PENDING SEAN'S REVIEW before launch (charter §11 tracks this).
 */
import React from 'react';
import LegalPageShell, { LegalSection } from './LegalPageShell';

const CONTACT_EMAIL = 'loveswanstudios@protonmail.com';

const sections: LegalSection[] = [
  {
    heading: '1. Who we are',
    body: (
      <p>
        SwanStudios (“we,” “us”) is a personal-training and fitness community platform operated
        from Anaheim Hills, California. This policy explains what information we collect, why we
        collect it, and the choices you have. Questions:{' '}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>
    ),
  },
  {
    heading: '2. Information we collect',
    body: (
      <ul>
        <li>
          <strong>Account information</strong> — name, email, username, role (client, trainer,
          admin), and profile details you choose to add.
        </li>
        <li>
          <strong>Fitness and wellness data you log</strong> — workouts, sets and reps, progress
          measurements, body statistics, comfort/discomfort entries, hydration, and nutrition
          logs. This data can be sensitive; we treat all of it as private by default.
        </li>
        <li>
          <strong>Media</strong> — photos and videos you or your trainer upload (stored with
          Cloudflare R2).
        </li>
        <li>
          <strong>Payment information</strong> — processed by Stripe. Card numbers never touch
          our servers; we keep only order and session-credit records.
        </li>
        <li>
          <strong>Technical basics</strong> — login timestamps, device/browser type, and the
          local storage your browser keeps for sign-in tokens, preferences, and unsaved workout
          drafts.
        </li>
      </ul>
    ),
  },
  {
    heading: '3. How we use it',
    body: (
      <ul>
        <li>Deliver coaching: programs, workout logging, progress charts, and scheduling.</li>
        <li>Power community features you opt into: feed posts, challenges, achievements.</li>
        <li>Process purchases and session credits.</li>
        <li>Send service messages (and marketing only with your consent — unsubscribe anytime).</li>
        <li>Keep the platform safe: authentication, abuse prevention, audit logs.</li>
      </ul>
    ),
  },
  {
    heading: '4. AI features and your privacy',
    body: (
      <p>
        Some features (like coach drafting tools) use AI language models. Requests to those
        models are <strong>de-identified: we send numeric identifiers only, without your name
        or contact details</strong>. Your identity is mapped back to results on our side, not
        the AI provider’s.
      </p>
    ),
  },
  {
    heading: '5. What we never do',
    body: (
      <p>
        We <strong>never sell</strong> your personal information, and we do not share your
        fitness data with advertisers. Your workout history belongs to you. We share data only
        with the service providers needed to run the platform (hosting on Render, media storage
        on Cloudflare, payments via Stripe, email delivery), with your trainer/coach as part of
        the service, or when the law requires it.
      </p>
    ),
  },
  {
    heading: '6. Retention and deletion',
    body: (
      <p>
        We keep your data while your account is active. You can request an export or deletion of
        your personal data at any time by emailing{' '}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. We honor verified requests
        within 30 days, subject to records we must keep (like payment history).
      </p>
    ),
  },
  {
    heading: '7. Cookies and local storage',
    body: (
      <p>
        We use browser local storage for sign-in tokens, interface preferences, and unsaved
        workout drafts. We do not run third-party advertising trackers.
      </p>
    ),
  },
  {
    heading: '8. Children',
    body: (
      <p>
        SwanStudios is not directed at children under 13, and accounts for minors are created
        only through a parent/guardian working with a trainer.
      </p>
    ),
  },
  {
    heading: '9. California privacy rights',
    body: (
      <p>
        California residents may request access to, deletion of, or a copy of their personal
        information, and will never be discriminated against for exercising those rights.
        Because we do not sell personal information, no “Do Not Sell” action is needed.
      </p>
    ),
  },
  {
    heading: '10. Changes',
    body: (
      <p>
        If this policy changes materially, we will update this page and note the new date above.
      </p>
    ),
  },
];

const PrivacyPolicyPage: React.FC = () => (
  <LegalPageShell
    title="Privacy Policy"
    metaDescription="How SwanStudios collects, uses, and protects your account, fitness, and payment information — and the choices you have."
    lastUpdated="July 7, 2026"
    sections={sections}
  />
);

export default PrivacyPolicyPage;
