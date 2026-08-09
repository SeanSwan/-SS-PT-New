/**
 * @file hook-decision.mjs
 * @description Pure observe/enforce decision for verification receipts.
 */
import { verifyReceipt } from './receipt.mjs';

function result(mode, block, reason) {
  return Object.freeze({ mode, block: mode === 'observe' ? false : block, reason });
}

export function decideHook({ mode = 'observe', receipt, currentSnapshot } = {}) {
  if (!['observe', 'enforce'].includes(mode)) return result('enforce', true, `unknown-mode:${mode}`);
  if (!receipt) return result(mode, true, 'verification-receipt-missing');
  const verified = verifyReceipt(receipt);
  if (!verified.valid) return result(mode, true, verified.error);
  if (verified.verdict.verdict !== 'CLEAN_IN_PROVEN_SCOPE') {
    return result(mode, true, `verification-verdict:${verified.verdict.verdict}`);
  }
  if (mode === 'enforce' && verified.verdict.provenance !== 'CI_ATTESTED') {
    return result(mode, true, 'verification-provenance-not-protected');
  }
  if (!currentSnapshot) return result(mode, true, 'current-snapshot-missing');
  const stale = receipt.headSha !== currentSnapshot.headSha ||
    receipt.sourceHash !== currentSnapshot.sourceHash ||
    receipt.scopeHash !== currentSnapshot.scopeHash;
  if (stale) return result(mode, true, 'verification-receipt-stale');
  return result(mode, false, 'clean-current-receipt');
}
