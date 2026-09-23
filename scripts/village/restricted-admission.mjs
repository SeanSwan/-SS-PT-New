/**
 * Restricted-material admission for the controlled Village lane.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY THIS MODULE EXISTS
 *
 * `06-bans.md` ban 7: "No restricted-material dispatch while its policy is
 * `UNDECIDED`." `03-contracts.md` (C5) defines three states and says of the two
 * candidate readings: "Neither reading is selected here."
 *
 * That is a deliberate hole in the contract, and a hole is not a policy. The
 * failure mode Astra filed as R2-A1-04 (HIGH) is that an *adapter author* selects
 * the policy implicitly — by writing code that happens to default one way. The
 * blueprint's own forbidden-side-effects list names it: "policy selection through
 * implementation defaults."
 *
 * So this module does one thing: it makes `UNDECIDED` a BLOCKING STATE that cannot
 * produce a dispatchable decision, and it makes that impossibility structural
 * rather than documented. It does NOT choose between Reading A and Reading B; that
 * choice is Sean's, and there is no default here to inherit.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE DESIGN RULE: a blocking state must not be able to LOOK like an allow.
 *
 * The obvious implementation — return `{ allowed: false, reason: 'UNDECIDED' }` —
 * is the defect, not the fix. A caller doing `if (result.allowed) send()` is safe,
 * but a caller doing `if (result.allowed !== false)` or `if (result.reason)` is
 * not, and both are one typo apart. Worse, a `denied` result and an `undecided`
 * result would share a shape, so a caller could collapse them and lose the
 * distinction the contract draws between "we decided no" and "we have not decided".
 *
 * So the admission function returns a DISCRIMINATED UNION with no `allowed: boolean`
 * field at all. The only way to obtain permission is a `status: 'admitted'` result,
 * which `UNDECIDED` can never produce. A caller that wants to send must switch on
 * the discriminant and reach the `admitted` arm explicitly.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHAT `ALLOW_SCOPED_PERSONAL` DOES AND DOES NOT PERMIT
 *
 * It is a scoped allow, not a general one: only material classes, providers,
 * purposes and destinations that the POLICY RECORD names are permitted. An empty
 * or missing scope list denies — there is no "unspecified means everything" path,
 * because that is exactly how an implicit policy gets selected. Every dimension
 * must match positively.
 *
 * @module village/restricted-admission
 */

/** The three policy states from `03-contracts.md` C5. No fourth state is valid. */
export const PRIVATE_POLICY_STATES = Object.freeze([
  'UNDECIDED',
  'DENY',
  'ALLOW_SCOPED_PERSONAL',
]);

/**
 * Reasons an admission can fail. Kept as a closed set so a caller can switch on
 * them without string-matching free text, and so an unknown reason is visibly a bug.
 */
export const ADMISSION_REJECTIONS = Object.freeze({
  POLICY_DECISION_REQUIRED: 'POLICY_DECISION_REQUIRED',
  RESTRICTED_MATERIAL_DENIED: 'RESTRICTED_MATERIAL_DENIED',
  SCOPE_NOT_SATISFIED: 'SCOPE_NOT_SATISFIED',
  UNKNOWN_POLICY_STATE: 'UNKNOWN_POLICY_STATE',
});

/** Scope dimensions that `ALLOW_SCOPED_PERSONAL` must name explicitly. */
const SCOPE_DIMENSIONS = Object.freeze(['classes', 'providers', 'purposes', 'destinations']);

function rejected(reason, detail, extra = {}) {
  return { status: 'rejected', reason, detail, ...extra };
}

/**
 * Normalise a scope list. Returns a frozen array of non-empty strings, or null when
 * the value is not a usable list — so a caller cannot pass a string and have it
 * silently treated as one entry, nor pass nothing and have it treated as "all".
 */
function scopeList(value) {
  if (!Array.isArray(value)) return null;
  const items = value.filter((v) => typeof v === 'string' && v.trim().length > 0).map((v) => v.trim());
  return items.length ? Object.freeze(items) : null;
}

/**
 * Decide whether one restricted-material dispatch may proceed.
 *
 * @param {object} request            What is being dispatched.
 * @param {string} request.materialClass
 * @param {string} request.provider
 * @param {string} request.purpose
 * @param {string} request.destination
 * @param {object} policy             The policy record. Where the decision lives.
 * @param {string} policy.state       One of PRIVATE_POLICY_STATES.
 * @param {object} [policy.scope]     Required in full when state is ALLOW_SCOPED_PERSONAL.
 * @returns {{status:'admitted', policyState:string}
 *          |{status:'rejected', reason:string, detail:string}}
 *
 * The return type has NO boolean field. That is intentional: see the design rule
 * in the module header. A caller proves intent by switching on `status`.
 */
export function admitRestrictedMaterial(request = {}, policy = {}) {
  const { materialClass, provider, purpose, destination } = request;
  const state = policy?.state;

  // An unset or unrecognised state is NOT treated as DENY. DENY is a decision —
  // someone decided no. Absent is the absence of a decision, and collapsing the two
  // would destroy the distinction the contract draws. It also must not fall through
  // to a default, which is the implicit-selection defect.
  if (state === undefined || state === null) {
    return rejected(
      ADMISSION_REJECTIONS.POLICY_DECISION_REQUIRED,
      'No restricted-material policy has been selected; the decision is required and has no default.',
      { policyState: null },
    );
  }
  if (!PRIVATE_POLICY_STATES.includes(state)) {
    return rejected(
      ADMISSION_REJECTIONS.UNKNOWN_POLICY_STATE,
      `Unrecognised policy state ${JSON.stringify(state)}; expected one of ${PRIVATE_POLICY_STATES.join(', ')}.`,
      { policyState: state },
    );
  }

  // THE BLOCKING STATE. It cannot yield an admitted result under any inputs.
  if (state === 'UNDECIDED') {
    return rejected(
      ADMISSION_REJECTIONS.POLICY_DECISION_REQUIRED,
      'Restricted-material policy is UNDECIDED. This lane stays blocked until a policy is selected; no default applies.',
      { policyState: 'UNDECIDED' },
    );
  }

  if (state === 'DENY') {
    return rejected(
      ADMISSION_REJECTIONS.RESTRICTED_MATERIAL_DENIED,
      'Restricted material is denied by policy, including reference codes classified as restricted.',
      { policyState: 'DENY' },
    );
  }

  // state === 'ALLOW_SCOPED_PERSONAL' — the only path to admission, and it is
  // scoped. Every dimension must be named in the policy record AND matched by the
  // request. A missing dimension denies; it never widens.
  const scope = policy.scope ?? {};
  const requested = { classes: materialClass, providers: provider, purposes: purpose, destinations: destination };

  for (const dimension of SCOPE_DIMENSIONS) {
    const allowed = scopeList(scope[dimension]);
    if (!allowed) {
      return rejected(
        ADMISSION_REJECTIONS.SCOPE_NOT_SATISFIED,
        `ALLOW_SCOPED_PERSONAL requires an explicit ${dimension} list; absent or empty scope denies (it does not mean "any").`,
        { policyState: state, dimension },
      );
    }
    const value = requested[dimension];
    if (typeof value !== 'string' || !value.trim()) {
      return rejected(
        ADMISSION_REJECTIONS.SCOPE_NOT_SATISFIED,
        `Request does not name a ${dimension} value, so it cannot be shown to be within the approved scope.`,
        { policyState: state, dimension },
      );
    }
    if (!allowed.includes(value.trim())) {
      return rejected(
        ADMISSION_REJECTIONS.SCOPE_NOT_SATISFIED,
        `${dimension} ${JSON.stringify(value)} is outside the approved scope [${allowed.join(', ')}].`,
        { policyState: state, dimension },
      );
    }
  }

  return { status: 'admitted', policyState: state };
}

/**
 * The pending decision, made explicit and enumerable rather than implied by code.
 * Exported so a report can state what is waiting on Sean instead of a reader
 * inferring it from an absence.
 */
export const PENDING_PRIVATE_POLICY_DECISION = Object.freeze({
  question: 'May PRIVATE restricted material (including `--sref` reference codes) be dispatched by the new controlled lane?',
  readings: Object.freeze({
    A: 'PRIVATE is insufficient to authorize restricted-material transmission. Simple prohibition; may prevent the --sref workflow.',
    B: 'Permit a bounded personal workflow for selected classes/codes, with explicit classification and destination bounds.',
  }),
  states: Object.freeze({
    UNDECIDED: 'Blocks the restricted-material lane (current state).',
    DENY: 'Rejects restricted material entirely.',
    ALLOW_SCOPED_PERSONAL: 'Permits only what the policy record enumerates.',
  }),
  selected: null,
  note: 'No reading is selected. This module enforces the pending state; it does not resolve it.',
});
