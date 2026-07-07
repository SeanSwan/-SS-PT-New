/**
 * TermsOfServicePage.tsx — /terms
 * =================================
 * Launch charter BP04 §6.3 (launch gate). Plain-language terms grounded in
 * how the platform actually works (training services, session credits,
 * Stripe payments, community features).
 * ⚠️ DRAFT PENDING SEAN'S REVIEW before launch (charter §11 tracks this).
 */
import React from 'react';
import LegalPageShell, { LegalSection } from './LegalPageShell';

const CONTACT_EMAIL = 'loveswanstudios@protonmail.com';

const sections: LegalSection[] = [
  {
    heading: '1. The service',
    body: (
      <p>
        SwanStudios provides personal-training services, workout programming and logging tools,
        progress tracking, and an optional fitness community. By creating an account or booking
        a session you agree to these terms.
      </p>
    ),
  },
  {
    heading: '2. Not medical advice',
    body: (
      <p>
        SwanStudios is a fitness platform, <strong>not a medical device, and nothing on it is
        medical advice</strong>, diagnosis, or treatment. Training guidance — including any
        rule-based or AI-assisted suggestions — is for general fitness purposes only.{' '}
        <strong>Consult a physician</strong> before beginning any exercise program, and stop and
        seek medical attention for persistent or severe pain. You are responsible for exercising
        within your own limits.
      </p>
    ),
  },
  {
    heading: '3. Accounts',
    body: (
      <p>
        Keep your credentials private; you are responsible for activity under your account. We
        may suspend accounts that violate these terms or put other members at risk.
      </p>
    ),
  },
  {
    heading: '4. Purchases, session credits, and subscriptions',
    body: (
      <ul>
        <li>
          Payments are processed by <strong>Stripe</strong>; we never store your card number.
        </li>
        <li>
          Training packages convert to session credits. A credit is used when a session is
          completed (or per your training agreement for late cancellations/no-shows).
        </li>
        <li>
          Subscription tiers renew until cancelled; cancelling stops future charges and keeps
          access through the paid period.
        </li>
        <li>
          Refund questions: email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> — we
          handle them person-to-person, not with a bot.
        </li>
      </ul>
    ),
  },
  {
    heading: '5. Community rules',
    body: (
      <p>
        Community spaces exist to support training. No harassment, hate, spam, impersonation, or
        posting other people’s private information. You own the content you post and grant us
        the license needed to display it inside the platform. We may remove content or restrict
        accounts that break these rules.
      </p>
    ),
  },
  {
    heading: '6. Acceptable use',
    body: (
      <p>
        Don’t attempt to breach security, scrape member data, resell access, or misuse AI
        features. Automated access requires our written permission.
      </p>
    ),
  },
  {
    heading: '7. Intellectual property',
    body: (
      <p>
        The platform, its design, exercise library, and content we create are ours or licensed
        to us. Your logged data remains yours (see the Privacy Policy for export and deletion).
      </p>
    ),
  },
  {
    heading: '8. Assumption of risk & limitation of liability',
    body: (
      <p>
        Exercise carries inherent risk of injury. To the maximum extent permitted by law,
        SwanStudios is not liable for indirect or consequential damages, and our total liability
        is limited to the amounts you paid in the twelve months before a claim. In-person
        training is additionally governed by the signed waiver.
      </p>
    ),
  },
  {
    heading: '9. Governing law & changes',
    body: (
      <p>
        These terms are governed by California law. If we change them materially we will update
        this page and the date above; continued use means acceptance. Questions:{' '}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>
    ),
  },
];

const TermsOfServicePage: React.FC = () => (
  <LegalPageShell
    title="Terms of Service"
    metaDescription="The terms that govern SwanStudios training services, session credits, payments, and community features."
    lastUpdated="July 7, 2026"
    sections={sections}
  />
);

export default TermsOfServicePage;
