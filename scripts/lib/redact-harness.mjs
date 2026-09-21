/**
 * redact-harness.mjs — the shared reporter and assertions for the redact suites.
 *
 * WHY THIS EXISTS (Rule 4, the 300-line cap). `redact-egress.rows.r9.test.mjs` grew past the cap
 * on round 9d: the per-row evidence, the falsifiability harness, the overlap tests and the
 * serialisation tests are four coherent bodies of work that happened to share a reporter. The
 * fix is the established one — extract at the seam, do not raise the limit, do not line-golf the
 * comments that record WHY each case exists.
 *
 * WHAT IS SHARED AND WHAT IS NOT. Only the reporter and a few assertion helpers live here. The
 * CASES stay in the files that own them, because a case is evidence for a specific claim and
 * moving it away from its explanation is how a test becomes decoration. This module has no
 * knowledge of secrets and must not acquire any.
 */

/** Mutable counters, so a suite can report a total across files. */
export class Harness {
  constructor(label) {
    this.label = label;
    this.pass = 0;
    this.fail = 0;
    this.failures = [];
  }

  ok(name, cond, detail) {
    if (cond) {
      this.pass += 1;
      console.log(`PASS  ${name}`);
    } else {
      this.fail += 1;
      this.failures.push(name);
      console.log(`FAIL  ${name}${detail === undefined || detail === '' ? '' : `\n      -> ${detail}`}`);
    }
    return cond;
  }

  /** Fold another harness's counters in, so one RESULT line reports the whole suite. */
  absorb(other) {
    this.pass += other.pass;
    this.fail += other.fail;
    this.failures.push(...other.failures);
    return this;
  }

  report() {
    console.log(`\nRESULT: ${this.pass} passed, ${this.fail} failed`);
    if (this.failures.length) console.log(`FAILED: ${this.failures.join(' | ')}`);
    return this.fail ? 1 : 0;
  }
}

/** True if `text` parses as JSON. Returns the reason separately, since "false" is not evidence. */
export function parsesAsJson(text) {
  try {
    JSON.parse(text);
    return { ok: true, why: '' };
  } catch (e) {
    return { ok: false, why: e.message.slice(0, 60) };
  }
}

/**
 * The five short JSON control escapes that leave a WORD CHARACTER before the token when a body
 * is serialised: `\n \r \t \b \f`. `\"`, `\\` and `\/` are excluded on purpose — they leave a
 * `"`, `` `\` ` or `/`, none of which satisfies `\w`, so no boundary needs a branch for them.
 */
export const SHORT_JSON_ESCAPES = ['n', 'r', 't', 'b', 'f'];
