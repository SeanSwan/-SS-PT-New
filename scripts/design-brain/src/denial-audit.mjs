/** Privacy-minimal denial receipts with closed, non-user-controlled fields. */
import { appendFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
const CODES = new Set(['E_SOURCE_CLASS_REQUIRED', 'E_SOURCE_CLASS_INVALID', 'E_SOURCE_CLASS_LEGACY', 'E_SOURCE_PRODUCTION_BLOCKED', 'E_SOURCE_CLASS_BLOCKED', 'E_EGRESS_DESTINATION', 'E_EGRESS_DATA_CLASS', 'E_EGRESS_PAYLOAD', 'E_EGRESS_SCHEMA', 'E_EGRESS_TASK_ID', 'E_EGRESS_TEST_COUNT', 'E_RECEIPT_VALIDATION']);
const OPERATIONS = new Set(['receipt-write', 'egress']);
export function recordDenial(root, denial, now = new Date()) {
  if (!CODES.has(denial?.code) || !OPERATIONS.has(denial?.operation)) throw new Error('E_DENIAL_AUDIT_SHAPE: closed denial code and operation required');
  mkdirSync(root, { recursive: true });
  const receipt = { schemaVersion: 'denial/1', day: now.toISOString().slice(0, 10), code: denial.code, operation: denial.operation };
  appendFileSync(join(root, 'denials.jsonl'), `${JSON.stringify(receipt)}\n`, 'utf8');
  return receipt;
}