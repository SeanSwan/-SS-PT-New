/**
 * Public waiver page copy — SWA-140
 * ==================================
 * Every user-facing string on the waiver flow lives here, so the voice can be
 * reviewed in one place instead of hunted through JSX.
 *
 * Voice: a premium boutique studio talking to a person who is about to sign
 * something that matters. Warm, plain, never cute about legal terms, never
 * bureaucratic. The old copy read like a form spec ("1. Select Activities",
 * "Waiver Submitted", "please contact staff") — reviewed by all three panel
 * seats as the single most generic thing about the page.
 *
 * Rules honoured: no bare "AI" as the product name (Swan Coach, with the
 * AI-assisted disclosure kept honest); no "yoga"/"meditation" language.
 */

export const WAIVER_COPY = {
  page: {
    title: 'Before We Train',
    subtitle: 'A few minutes now keeps every session safe, clear, and covered.',
    reconsentTitle: "We've Updated Your Agreement",
    reconsentSubtitle:
      "You've signed with us before. Here's what changed — it takes about a minute to sign the new version.",
  },

  steps: {
    activities: {
      heading: "Where we'll train",
      help: 'Pick everything that applies. Each setting has its own short addendum.',
    },
    documents: {
      heading: 'Read your agreement',
      help: 'Open each document and confirm you have read it. Nothing is hidden — take your time.',
    },
    about: {
      heading: 'About you',
      help: 'We need one way to reach you, and your date of birth to know who signs.',
    },
    guardian: {
      heading: 'A parent or guardian signs',
      help: 'Participants under 18 need a parent or legal guardian to sign for them.',
    },
    consent: {
      heading: 'Your choices',
      help: 'The first one is required. The other two are entirely up to you and can be changed later.',
    },
    signature: {
      heading: 'Sign',
      help: 'Draw your signature or type it — both are legally binding.',
    },
  },

  activities: {
    HOME_GYM_PT: {
      label: 'Home gym sessions',
      detail: 'We train at your place, with your equipment.',
    },
    PARK_TRAINING: {
      label: 'Outdoor & park training',
      detail: 'Sessions outdoors, weather permitting.',
    },
    SWIMMING_LESSONS: {
      label: 'Swim lessons',
      detail: 'In-water instruction. Under 18s need a guardian on deck.',
    },
  },

  fields: {
    fullName: { label: 'Full legal name', placeholder: 'As it appears on your ID' },
    participantName: { label: "Participant's full name", placeholder: 'The person who will be training' },
    dateOfBirth: { label: 'Date of birth', help: "The participant's date of birth, not the guardian's." },
    email: { label: 'Email', placeholder: 'name@example.com' },
    phone: { label: 'Phone', placeholder: 'Mobile number' },
    contactHelp: 'Enter at least one — email or phone.',
    guardianName: { label: 'Parent or guardian full name', placeholder: 'The person signing' },
    emergencyContactName: { label: 'Emergency contact name', placeholder: 'Someone we can reach during a session' },
    emergencyContactPhone: { label: 'Emergency contact phone', placeholder: 'Mobile number' },
    minorAssent: {
      label: 'Participant acknowledgement (optional)',
      placeholder: "Participant types their name to say they've read this too",
    },
  },

  guardian: {
    autoNotice:
      'This participant is under 18, so a parent or legal guardian signs the agreement. The signature below is the guardian’s.',
    attestation:
      'I am the parent or legal guardian of this participant and I have legal authority to sign for them.',
    signatureLabel: 'Parent or guardian signature',
  },

  consents: {
    liability: {
      label:
        'I have read and agree to the Liability Waiver & Release, including its assumption of risk and its release of ordinary negligence claims.',
      required: true,
      note: 'Required to train with us.',
    },
    swanCoach: {
      label: 'Turn on Swan Coach — personalised plans built from my training data.',
      required: false,
      note: 'Optional. Change it anytime in settings; declining never affects your training.',
    },
    media: {
      label: 'SwanStudios may use photos or video of me in its marketing.',
      required: false,
      note: 'Optional and withdrawable anytime. Never a condition of training.',
    },
  },

  documents: {
    readAction: 'Read',
    readingBadge: 'Not yet read',
    readBadge: 'Read',
    attest: 'I have read this document.',
    close: 'Done',
    versionLine: (version?: string, effectiveAt?: string | null) => {
      const v = version ? `Version ${version}` : 'Current version';
      if (!effectiveAt) return v;
      const d = new Date(effectiveAt);
      if (Number.isNaN(d.getTime())) return v;
      return `${v} · effective ${d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}`;
    },
    whatChanged: "What's changed since you last signed",
  },

  /** The boxed restatement directly above the signature (Opus 5: conspicuousness). */
  restatement: {
    heading: "What you're agreeing to",
    points: [
      'Training carries real risk of injury, and you are choosing to take part.',
      'You are giving up the right to sue SwanStudios for ordinary negligence — but not for gross negligence or intentional harm.',
      'You have told us about any health condition that affects your safety, and you will keep us informed.',
    ],
  },

  submit: {
    idle: 'Agree & Sign',
    busy: 'Sealing your agreement…',
    documentCount: (n: number) => `${n} document${n === 1 ? '' : 's'}`,
  },

  success: {
    title: (firstName?: string) => (firstName ? `You're all set, ${firstName}.` : "You're all set."),
    body: 'Your agreement is signed and on file. Keep a copy for your records.',
    signedLine: 'Signed',
    confirmationLine: 'Confirmation',
    documentsHeading: 'What you signed',
    download: 'Download my copy',
    print: 'Print',
    continueDashboard: 'Continue to your dashboard',
    continueHome: 'Back to SwanStudios',
    createAccount: 'Create an account',
    createAccountNote: 'Optional — it keeps your history, plans, and progress in one place.',
    replayNote: 'This agreement was already submitted — here it is again.',
  },

  loading: {
    documents: 'Loading your agreement…',
  },

  errors: {
    versionsTitle: "We couldn't load your agreement",
    versionsBody:
      'Nothing has been submitted. Check your connection and try again — or ask your trainer to help you finish signing.',
    retry: 'Try again',
    emptyVersionsTitle: 'Your agreement is not available right now',
    emptyVersionsBody:
      "This is on our side, not yours. Please let your trainer know so we can get it fixed — you won't be able to sign until we do.",
    signatureRequired: 'Please sign above before submitting.',
    contactRequired: 'Please add either an email or a phone number.',
    guardianRequired: 'A parent or guardian must sign for participants under 18.',
    emergencyRequired: 'Please add an emergency contact for participants under 18.',
    documentsUnread: 'Please open and confirm each document before signing.',
    liabilityRequired: 'You need to accept the liability waiver to train with us.',
    activitiesRequired: 'Please choose at least one training setting.',
  },

  help: {
    heading: 'Questions before you sign?',
    body: 'Ask your trainer — a person will walk you through any part of this.',
  },
} as const;

export default WAIVER_COPY;
