/**
 * Trainer Independent-Contractor Agreement — versioned contract text.
 * ============================================================================
 * ⚠ DRAFT — NOT LEGAL ADVICE. This plain-English v1 is derived from the Kimi
 * business term sheet and is watermarked as pending attorney review. It is NOT
 * yet binding. When a licensed attorney delivers the final text, add a new
 * version entry here (bump CURRENT_CONTRACT_VERSION) — the e-sign record stores
 * which version was signed, so swapping in the final text needs NO code rebuild
 * and preserves the evidence trail for everyone who signed the draft.
 *
 * @module config/trainerContract
 */
import crypto from 'crypto';

export const CURRENT_CONTRACT_VERSION = 'draft-v1-2026-07-23';

/**
 * The consent checkboxes the trainer must affirm. Keys are stored in
 * TrainerApplication.consentFlags; all `required: true` keys must be true to submit.
 */
export const CONTRACT_CONSENTS = [
  { key: 'independentContractor', required: true, label: 'I understand I am an independent contractor (1099), not an employee, and I control my own methods, schedule, rates, and clients.' },
  { key: 'selfInsure', required: true, label: 'I will carry my own professional & general liability insurance and name SwanStudios as an additional insured before I train any client.' },
  { key: 'indemnify', required: true, label: 'I agree to indemnify and hold SwanStudios harmless for claims arising from my own training services and conduct.' },
  { key: 'platformFee', required: true, label: 'I agree SwanStudios collects a 15% platform fee on the gross of my in-platform transactions, and that I keep the rest (minus payment-processing fees).' },
  { key: 'scopeOfPractice', required: true, label: 'I will train within my certified scope, keep my certifications and CPR/AED current, and will not provide medical or nutrition-prescribing advice.' },
  { key: 'accuracyAttest', required: true, label: 'The information and documents I have provided (including my insurance certificate) are true, accurate, and current.' },
  { key: 'draftAcknowledged', required: true, label: 'I understand this agreement is a DRAFT pending final legal review and that SwanStudios will present the finalized agreement for my signature before it becomes binding.' },
];

/**
 * Human-readable contract body, rendered in the e-sign step. Markdown-lite.
 * Kept in sync with the Kimi 18-clause term sheet. Watermarked DRAFT.
 */
export const CONTRACT_TITLE = 'SwanStudios Trainer Independent-Contractor Agreement';

export const CONTRACT_BODY = `**DRAFT — PENDING ATTORNEY REVIEW. NOT YET LEGALLY BINDING.**

This plain-English summary describes the terms under which independent trainers work with SwanStudios. It will be replaced by an attorney-finalized agreement before it becomes binding on either party.

**1. Independent Contractor.** You are an independent contractor (1099), not an employee, partner, or agent of SwanStudios. You control your own methods, schedule, rates, and clients. You receive no employee benefits and are responsible for your own taxes.

**2. The Platform.** SwanStudios provides software and payment tools only. SwanStudios does not provide training services, supervise you, or guarantee you clients or income.

**3. Revenue Share.** SwanStudios collects a 15% platform fee on the gross of your in-platform client transactions. You keep the remainder, minus standard payment-processing fees. There are no hidden fees. Fees are collected automatically through the platform's payment system.

**4. Insurance (You Carry Your Own).** You must maintain your own general and professional liability insurance (a common minimum is $1,000,000 per occurrence / $2,000,000 aggregate), name SwanStudios as an additional insured, and give SwanStudios a current certificate of insurance before you train any client. If your coverage lapses, your account is suspended until it is restored.

**5. Indemnification.** You agree to indemnify and hold SwanStudios harmless from claims arising out of your training services, conduct, or negligence.

**6. Professional Standards.** You will train only within your certified scope, keep your certifications and CPR/AED current, screen clients appropriately before programming, and will not give medical diagnoses or prescribe nutrition.

**7. Payments, Refunds & Chargebacks.** You are the merchant of record for your sessions. You are responsible for refunds, chargebacks, and related fees on your transactions.

**8. Your Clients.** Clients you bring remain your relationship. While you and a client are both on SwanStudios, that client's sessions are transacted on the platform. You agree not to move platform-sourced clients off-platform to avoid the platform fee.

**9. Data & Privacy.** SwanStudios owns the platform and aggregated data. You may access your clients' records on the platform during your engagement and must keep client information confidential. You will not export client lists when you leave.

**10. Term & Termination.** Either party may end this arrangement with reasonable notice. SwanStudios may suspend or terminate immediately for cause (such as an insurance lapse, a safety issue, or fraud). On exit, pending payouts are released after a short holdback for possible chargebacks, and clients are handled fairly.

**11. Limitation of Liability.** The platform is provided "as is." SwanStudios' total liability to you is limited, and neither party is liable for indirect or consequential damages.

**12. General.** This agreement will be governed by the laws of SwanStudios' home state, resolved by the dispute process in the final agreement, and is subject to the finalized attorney-drafted terms. If any part is unenforceable, the rest still applies.

By signing, you confirm you have read and agree to these draft terms and understand a finalized agreement will follow.

**DRAFT — PENDING ATTORNEY REVIEW.**`;

/** SHA-256 of the exact body text — stored with the signature as tamper-evidence. */
export function contractTextHash() {
  return crypto.createHash('sha256').update(CONTRACT_BODY, 'utf8').digest('hex');
}

function contractDisplayPayload() {
  return {
    version: CURRENT_CONTRACT_VERSION,
    title: CONTRACT_TITLE,
    body: CONTRACT_BODY,
    consents: CONTRACT_CONSENTS,
    platformFeePercent: 15.0,
    textHash: contractTextHash(),
    isDraft: true,
  };
}

/** SHA-256 of every displayed/signable field, including consent labels and fee. */
export function contractPackageHash() {
  return crypto.createHash('sha256')
    .update(JSON.stringify(contractDisplayPayload()), 'utf8')
    .digest('hex');
}

/** The public payload the frontend fetches to render the contract + consents. */
export function getCurrentContract() {
  return {
    ...contractDisplayPayload(),
    packageHash: contractPackageHash(),
  };
}
