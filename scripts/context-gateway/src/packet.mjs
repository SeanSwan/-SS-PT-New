/**
 * packet.mjs — immutable context-packet + evidence-ID data model for the Swan Context Gateway.
 * =============================================================================================
 * A packet is the ONLY thing a provider ever sees: selected line windows, each stamped with an
 * immutable evidence ID (E001, E002, …), its repo-relative path, 1-indexed line window, source
 * blob SHA, and authority tier (A0–A5 per SWAN-CONTEXT-GATEWAY-PHASE0-2026-07-21.md §3).
 *
 * Enforced here (threat rows T7/T11 of the Phase 0 threat model):
 *   T7  fabricated citations — validateCitation()/auditAnswer() accept only `[Eddd:Lm-Ln]`
 *       citations whose ID exists in the packet AND whose range lies inside that evidence's
 *       window. Anything else is reported, never silently passed.
 *   T11 provenance — every packet carries originatingModel + headSha; finalize() deep-freezes,
 *       so post-finalize mutation throws in strict mode instead of drifting silently.
 *
 * The model is deliberately dumb: no retrieval, no ranking, no I/O. The compiler feeds it via
 * safeRead windows; adapters serialize it; the verifier audits answers against it. $0 always.
 *
 * @module context-gateway/packet
 */

export const AUTHORITY_TIERS = ['A0', 'A1', 'A2', 'A3', 'A4', 'A5'];
// Brackets OPTIONAL — must match validateCitation, else an UNbracketed fabricated citation
// (E999:L1-L2) is never extracted, silently downgrading to "uncited" (hostile pass 4, finding 3).
const CITATION_RE = /\[?(E\d{3,}):L(\d+)-L(\d+)\]?/g;

export class PacketError extends Error {
  constructor(code, message) {
    super(`[${code}] ${message}`);
    this.code = code; // BAD_EVIDENCE | FINALIZED | NOT_FINALIZED | BAD_TIER
  }
}

/**
 * @param {object} meta
 * @param {string} meta.question          the question this packet answers
 * @param {string} meta.headSha           repo HEAD at compile time
 * @param {string} meta.originatingModel  Rule 68 provenance stamp (e.g. 'claude-fable-5')
 * @param {string} [meta.issue]           optional Linear issue id (e.g. 'SWA-123')
 */
export function createPacket({ question, headSha, originatingModel, issue = null }) {
  if (!question || !headSha || !originatingModel) {
    throw new PacketError('BAD_EVIDENCE', 'question, headSha, and originatingModel are required');
  }
  const evidence = []; // { id, path, startLine, endLine, sha, tier, content }
  let finalized = false;

  return {
    /** Add one evidence window; returns its immutable ID (E001…). Order of addition is the ID order. */
    addEvidence({ path, startLine, endLine, content, sha, tier }) {
      if (finalized) throw new PacketError('FINALIZED', 'packet is immutable');
      if (!path || !Number.isInteger(startLine) || !Number.isInteger(endLine) || endLine < startLine) {
        throw new PacketError('BAD_EVIDENCE', `bad window for ${path}: L${startLine}-L${endLine}`);
      }
      if (typeof content !== 'string' || !sha) throw new PacketError('BAD_EVIDENCE', `content+sha required for ${path}`);
      if (!AUTHORITY_TIERS.includes(tier)) throw new PacketError('BAD_TIER', `unknown authority tier: ${tier}`);
      const id = `E${String(evidence.length + 1).padStart(3, '0')}`;
      evidence.push(Object.freeze({ id, path, startLine, endLine, sha, tier, content }));
      return id;
    },

    /** Freeze the packet and return its plain immutable manifest (same repo state ⇒ same manifest). */
    finalize() {
      finalized = true;
      const manifest = {
        question, headSha, originatingModel, issue,
        evidence: Object.freeze(evidence.map(({ content, ...rest }) => Object.freeze(rest))),
        evidenceCount: evidence.length,
      };
      return Object.freeze(manifest);
    },

    /** Full frozen evidence list (with content) for adapter serialization. */
    getEvidence() {
      if (!finalized) throw new PacketError('NOT_FINALIZED', 'finalize() before reading evidence out');
      return Object.freeze([...evidence]);
    },

    /** Validate ONE citation string like "E014:L91-L138" (brackets optional). */
    validateCitation(cite) {
      const m = String(cite).match(/^\[?(E\d{3,}):L(\d+)-L(\d+)\]?$/);
      if (!m) return { ok: false, reason: 'SYNTAX' };
      const ev = evidence.find((e) => e.id === m[1]);
      if (!ev) return { ok: false, reason: 'UNKNOWN_ID' };
      const [s, e] = [Number(m[2]), Number(m[3])];
      if (s < ev.startLine || e > ev.endLine || e < s) return { ok: false, reason: 'OUT_OF_WINDOW' };
      return { ok: true, id: ev.id, path: ev.path };
    },

    /** Audit a whole answer: extract every [Eddd:Lm-Ln] and classify. Uncited answers are flagged. */
    auditAnswer(answerText) {
      const found = [...String(answerText).matchAll(CITATION_RE)].map((m) => m[0]);
      const results = found.map((c) => ({ citation: c, ...this.validateCitation(c) }));
      return Object.freeze({
        citations: results,
        valid: results.filter((r) => r.ok).length,
        invalid: results.filter((r) => !r.ok),
        uncited: found.length === 0,
      });
    },
  };
}
