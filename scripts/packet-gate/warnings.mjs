/**
 * warnings.mjs — everything the approval view must SAY but not refuse over.
 * =========================================================================
 * Split out of packet-gate.mjs for the 300-line cap (CLAUDE.md rule 4).
 *
 * A warning here is never decoration. Each one exists because a check either did not run, or ran and
 * bound on something weaker than it looks — and the failure this whole gate is built against is a
 * checker that reports clean about something it never examined. Refusing on these would breed the
 * refusal fatigue that gets the gate bypassed; staying silent would reproduce the defect. So they
 * are declared.
 *
 * @module packet-gate/warnings
 */
import { isUnverifiedFence } from './fences.mjs';
import { hasBindingAnchors, unboundNamedPaths, weakBindingOnly, caseOnlyBinding } from './artifact.mjs';

/**
 * @param {object} ctx  { allBlocks, boundPaths, boundContent, aboutCode, allowUncited, premises }
 * @returns {string[]}  warning lines, in the order the operator should read them.
 */
export function buildWarnings({ allBlocks, boundPaths, boundContent, aboutCode, allowUncited, premises }) {
  const out = [...premises.warnings];

  // Only when the operator ACKNOWLEDGED them: without --allow-uncited an uncited fence is an R3
  // finding, and reporting the same fences as both a refusal and a warning is how an operator
  // learns to skim. Same predicate as the refusal — deliberately not a second filter, because two
  // copies of this exact predicate is what produced a bypass that raised neither.
  const uncited = allBlocks.filter(isUnverifiedFence);
  if (allowUncited && uncited.length) {
    out.push(`${uncited.length} uncited fence(s) at line(s) ${uncited.map((b) => b.start).join(', ')} — NOT byte-verified; accepted deliberately via --allow-uncited`);
  }

  // R4 bound only because two paths differ in CASE. One file on NTFS/APFS/WSL; TWO DIFFERENT REAL
  // FILES on ext4, where R5 and R3 each pass on their own file and the operator would otherwise see
  // a fully-green approval view for a packet carrying the wrong source.
  const caseOnly = caseOnlyBinding(allBlocks, boundPaths);
  if (caseOnly) {
    out.push(`R4 bound ${caseOnly.cited} to the remit's ${caseOnly.named} by CASE-INSENSITIVE match — on a case-sensitive filesystem these are two different files`);
  }

  // R4 was satisfied by a MENTION while the remit also named a path. Allowed, because vetoing it
  // false-refused "does the handler for /api/sessions read package.json?" — but declared, because a
  // mention is the dimension the round-2 decoy attack lived in.
  if (weakBindingOnly(allBlocks, boundPaths, boundContent)) {
    out.push(`R4 bound by a route/symbol MENTION, not by the named path(s) ${boundPaths.join(', ')} — the artifact is tied to the remit by a mention, not by identity`);
  }

  // The remit names a file the packet does not carry. R4 is satisfied by ONE bound artifact, so the
  // model would answer about an interaction it can only see half of.
  const unbound = unboundNamedPaths(allBlocks, boundPaths);
  if (unbound.length && unbound.length < boundPaths.length) {
    out.push(`remit names ${boundPaths.length} path(s); ${unbound.join(', ')} ${unbound.length === 1 ? 'is' : 'are'} NOT carried by this packet — the model answers about what it cannot see`);
  }

  // A CHECK THAT DID NOT RUN MUST SAY SO. If every anchor was excluded — all paths allow-missing, no
  // resolvable route or symbol — R4's binding returns early and any single cited block satisfies it.
  // Defensible (nothing is left in the repo to bind to) but it was SILENT, which is the Category-2
  // failure this gate exists to refuse in other people's code.
  if (aboutCode && !hasBindingAnchors(boundPaths, boundContent)) {
    out.push('R4 binding did not run: every anchor the remit names is allow-missing or unresolvable, so any one cited block satisfies R4');
  }

  return out;
}
