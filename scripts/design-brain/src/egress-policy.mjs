import { recordDenial } from './denial-audit.mjs';
/** Deny-by-default exact-schema egress policy for external model calls. */
export function authorizeEgress(request) {
  if (request?.destination !== 'external-model') return { allowed: false, code: 'E_EGRESS_DESTINATION' };
  if (request?.dataClass !== 'class-0') return { allowed: false, code: 'E_EGRESS_DATA_CLASS' };
  const fields = request.fields;
  if (!fields || typeof fields !== 'object' || Array.isArray(fields)) return { allowed: false, code: 'E_EGRESS_PAYLOAD' };
  if (Object.keys(fields).length !== 2 || !Object.hasOwn(fields, 'taskId') || !Object.hasOwn(fields, 'testCount')) return { allowed: false, code: 'E_EGRESS_SCHEMA' };
  if (typeof fields.taskId !== 'string' || !/^TASK-[A-Za-z0-9-]{4,64}$/.test(fields.taskId)) return { allowed: false, code: 'E_EGRESS_TASK_ID' };
  if (!Number.isInteger(fields.testCount) || fields.testCount < 0 || fields.testCount > 100000) return { allowed: false, code: 'E_EGRESS_TEST_COUNT' };
  return { allowed: true, code: 'ALLOW_TYPED_CLASS_ZERO' };
}
export function authorizeAndAuditEgress(root, request, now = new Date()) {
  const result = authorizeEgress(request);
  if (!result.allowed) recordDenial(root, { code: result.code, operation: 'egress' }, now);
  return result;
}