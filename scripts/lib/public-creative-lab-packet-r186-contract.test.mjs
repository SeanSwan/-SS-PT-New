import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const packetPath = path.join(
  repoRoot,
  'docs/ai-workflow/AI-HANDOFF/PUBLIC-CREATIVE-LAB-HOSTILE-REVIEW-AND-BUILD-BLUEPRINT-2026-08-25.md',
);
const packet = fs.readFileSync(packetPath, 'utf8');

test('malformed and prechallenge closure preimages retain keyed digests only', () => {
  assert.match(
    packet,
    /malformed-class failures then use `HMAC-SHA256-local-key:preparse-input-v1` over RFC-8785 canonical UTF-8 `\{domain:"preparse-input-v1",requestId,ruleId:"malformed",rawBytesHash\}`/,
  );
  assert.match(
    packet,
    /every receipt-emitting path, including prechallenge, persists only the keyed rawBytesHash in a payload-free request-ledger record/,
  );
  assert.doesNotMatch(
    packet,
    /Malformed-class failures use `HMAC-SHA256-local-key:preparse-input-v1` over RFC-8785 canonical UTF-8 `\{domain:"preparse-input-v1",requestId,ruleId:"malformed",rawBytesBase64\}`/,
  );
});

test('key rotation binds the next-key prefix to rotationTarget', () => {
  for (const [target, prefix] of [
    ['client-key-state', '^ck_'],
    ['household-receiver-key-state', '^rk_'],
    ['owner-key', '^owner_'],
  ]) {
    assert.ok(packet.includes(`rotationTarget":{"const":"${target}"}`));
    assert.ok(packet.includes(`nextKeyId":{"pattern":"${prefix}`));
  }
  assert.doesNotMatch(
    packet,
    /rotationTarget\":\{\"enum\":\[\"client-key-state\",\"household-receiver-key-state\",\"owner-key\"\].*nextKeyId\":\{\"type\":\"string\",\"pattern\":\"\^\(ck_/s,
  );
});

test('cancel discriminator wording matches the cancel field set', () => {
  assert.match(packet, /without consuming owner receipt or altering cancel idempotency lookup/);
  assert.doesNotMatch(packet, /without consuming a nonce or owner receipt/);
});

test('release gate has one clean-fold criterion and an ungated pre-finalization compactor path', () => {
  assert.ok(packet.includes('two consecutive rounds whose panel-ledger-annex fold verdict is CLEAN (every configured seat and the active builder valid APPROVE)'));
  assert.ok(packet.includes('pre-finalization, line-neutral migration of closed-round inline digest bindings is authorized before any provider dispatch and is not gated on CLEAN'));
  assert.doesNotMatch(packet, /two consecutive valid three-pass rounds/);
  assert.doesNotMatch(packet, /two consecutive valid clean three-pass rounds/);
  assert.doesNotMatch(packet, /two consecutive fresh valid three-pass rounds with no actionable finding/);
});

test('household capacity receipt has one closed field set and treats its domain as signing metadata', () => {
  assert.ok(packet.includes('reasonCode=household-reservation-capacity,exitCode=34,retryAfterSeconds=60,receiverKeyId,receiverSignature,createdAt};'));
  assert.ok(packet.includes('capacityPayload carries no domain property because its fixed signing domain is household-reservation-capacity-v1'));
  assert.doesNotMatch(packet, /reasonCode=household-reservation-capacity,exitCode=34,retryAfterSeconds=60,receiverKeyId,receiverSignature,createdAt,domain=household-reservation-capacity-v1/);
});

test('pre-source-set quarantine stages have explicit closure rows', () => {
  assert.ok(packet.includes('quarantine-source-intake and quarantine-source-decode'));
  assert.match(packet, /\{ruleId:"quarantine-source-intake",receiptType:"quarantine-source-raw-v1",hashDomain:"quarantine-source-raw-v1"/);
  assert.match(packet, /\{ruleId:"quarantine-source-decode",receiptType:"quarantine-source-raw-v1",hashDomain:"quarantine-source-raw-v1"/);
  assert.ok(packet.includes('no other stage may use quarantine-source-raw-v1'));
});

test('administrator receipt artifacts are schema-pinned and signed', () => {
  for (const schemaId of ['nightly-head-diff-v1', 'cancel-store-retention-v1', 'household-local-mirror-divergence-v1']) {
    assert.ok(packet.includes(schemaId));
  }
  assert.ok(packet.includes('admin-receipt-totality'));
  assert.ok(packet.includes('each has one positive and one negative vector'));
});

test('rehydration redemption uses the exact three-field ledger key', () => {
  assert.ok(packet.includes('single-use rehydration ledger is keyed exactly by {requestId,archiveObjectId,nonce}'));
  assert.ok(packet.includes('retry-rehydration-ledger-v1 has exactly'));
  assert.doesNotMatch(packet, /single-use rehydration ledger is keyed by the sealed object.s requestId and archiveObjectId, not only by the presented frame requestId/);
});

test('excluded mutable path closure enumerates state files and rotation receipts', () => {
  for (const pathToken of [
    'audit-archive/roots/manifest-rotations/',
    'e4-state.json',
    'household-receiver-key-state.json',
  ]) {
    assert.ok(packet.includes(pathToken), `missing excluded mutable path: ${pathToken}`);
  }
  assert.ok(packet.includes('excluded-set-enumeration-parity'));
});

test('household upstream ACK payload has schema-version parity with sibling payloads', () => {
  assert.ok(
    packet.includes(
      'ackPayload is the closed receiver-signed household-receiver-ack-v1 object with exact fields {schemaVersion,receiptId,messageId,decision:"sent",bodyHash,createdAt,receiverKeyId,receiverSignature,domain:"household-receiver-ack-v1"}',
    ),
  );
  assert.ok(packet.includes('household-upstream-sibling-payload-parity'));
});

test('suppressed draft cleanup outcome is a closed helper frame, not a receipt artifact', () => {
  assert.ok(
    packet.includes(
      'draft-local-cleanup-suppressed-v1 is a closed payload-free helper response with exact fields {operation:"draft-local-cleanup",requestId,reservationId,result:"suppressed-already-cleaned"}',
    ),
  );
  assert.ok(packet.includes('draft-local-cleanup-suppressed-frame'));
  assert.ok(packet.includes('the token suppressed-already-cleaned never appears inside a receipt-typed artifact'));
});

test('household same-body-hash remint terminality is scoped to canonical append', () => {
  assert.ok(packet.includes('a same-bodyHash re-mint with different signed bytes is terminal only after a canonical append exists'));
  assert.ok(packet.includes('before a canonical append exists it is the sanctioned retry and must append and release when the exact live key holds'));
  assert.ok(packet.includes('household-remint-scope-parity'));
});

test('household ledger divergence is a closed app-server artifact', () => {
  assert.ok(
    packet.includes(
      'household-send-ledger-divergence-v1 is a closed payload-free app-server metadata artifact stored only in the app-server conformance archive at app-server-conformance/household/divergence/{eventId}.json; it is never present under external audit-archive/household/; exact fields {schemaVersion,eventId,installationId,messageId,canonicalBodyHash,incomingBodyHash,observedAt,serverKeyId,serverSignature,domain:"household-send-ledger-divergence-v1"}',
    ),
  );
  assert.ok(packet.includes('household-send-ledger-divergence-contract'));
});

test('rehydration ledger rows carry an explicit schema version', () => {
  assert.ok(
    packet.includes(
      'retry-rehydration-ledger-v1 has exactly {schemaVersion,requestId,archiveObjectId,nonce,sourceHash,ownerApprovalReceiptId,redeemedAt,previousHash,hash}',
    ),
  );
  assert.ok(packet.includes('retry-rehydration-schema-version'));
});

test('radar cancel forbids client-created timestamps', () => {
  assert.ok(
    packet.includes(
      'radar-cancel wire fields are exactly {frontDoor,classification,schemaVersion,installationId,clientKeyId,clientSignature,requestId,lane,sessionId,targetRequestId,targetState,ownerApprovalReceiptId,ownerApprovalReceipt,idempotencyKey,reasonCode,leaseId}; createdAt is not a radar-cancel field',
    ),
  );
  assert.ok(packet.includes('radar-cancel-createdAt-forbidden'));
});

test('root rotation depth has an explicit hard-ceiling recovery rule', () => {
  assert.ok(
    packet.includes(
      'maxRotationChainDepth=64 is a hard ceiling; the 65th rotation is rejected before mutation with root-integrity-failure/37',
    ),
  );
  assert.ok(packet.includes('rotation-chain-depth-65-walk-rejected'));
  assert.ok(packet.includes('root-rebaseline-after-rotation-ceiling'));
});

test('household divergence is present in the normative pair table and stays app-server-only', () => {
  const row = '{ruleId:"household-send-ledger-divergence",receiptType:"household-send-ledger-divergence-v1",hashDomain:"household-send-ledger-divergence-v1"';
  assert.equal((packet.match(new RegExp(row.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length, 2);
  assert.ok(packet.includes('household-send-ledger-divergence-v1 is a closed payload-free app-server metadata artifact stored only in the app-server conformance archive at app-server-conformance/household/divergence/{eventId}.json'));
  assert.ok(packet.includes('household-divergence-writer-closure-negative'));
});

test('unknown-class source hashes are keyed before persistence', () => {
  assert.ok(packet.includes('transient rawBytesHash=sha256(decoded payload bytes)'));
  assert.ok(packet.includes('sourceHashBasis=HMAC-SHA256(local-key:unknown-class-source-v1) over RFC-8785 canonical UTF-8 {domain:"unknown-class-source-v1",rawBytesHash}'));
  assert.ok(packet.includes('unknown-class-sourcehash-keyed'));
});

test('household receiver clock-integrity failure has a closed wire outcome', () => {
  assert.ok(packet.includes('household-transport-nack-v1 reasonCode includes clock-integrity-failure'));
  assert.ok(packet.includes('household-receiver-clock-integrity'));
});

test('compact closure projection is keyed by rule and receipt pair', () => {
  assert.ok(packet.includes('compact projection is keyed by {ruleId,receiptType} and maps each explicit pair to hashDomain'));
  assert.ok(packet.includes('ruleid-compact-pair-closure'));
});

test('root verification has one pinned signing domain', () => {
  assert.ok(packet.includes('root-verification-receipt-v1 is the receipt type and root-verification-v1 is the sole fixed signing domain; the activation guard and verifier use that same domain; root-verification-domain-closure'));
});

test('admin spool branches have one explicit signing convention', () => {
  assert.ok(packet.includes('every admin-spool-resource-v1 producer branch signs the complete schema-valid typed object with only its own signer field omitted; administrator branches use typed-object-with-adminSignature-excluded and the household capacity branch uses typed-object-with-receiverSignature-excluded; admin-spool-signing-convention-parity'));
});

test('queued radar responses reject terminal timestamps', () => {
  assert.ok(packet.includes('queued radar-response rejects terminalTime via the schema\'s explicit queued branch; radar-response-queued-terminal-time'));
});

test('E4 consumers require fresh route proof at every evaluation', () => {
  assert.ok(packet.includes('every E4-consuming gate evaluation requires a fresh e4-route-mount-receipt-v1 minted and verified by the pinned checker host inside expiresAt; an expired receipt reverts E4 to UNPROVEN and requires a fresh checker run; e4-route-mount-freshness'));
});

test('lane policy names its single per-door instantiation', () => {
  assert.ok(packet.includes('the single pinned lane-policy.json is the PUBLIC-CREATIVE-LAB instance only; PERSONAL-ASSISTANT and CLASS-DESIGN-GENERIC door/class membership is governed solely by the root-manifest-pinned .policy/decision-matrix.json; no per-door lane-policy instance is loaded; lane-policy-door-instantiation'));
});

test('draft body binding is keyed before persistence', () => {
  assert.ok(packet.includes('each draftHash is HMAC-SHA256-local-key:draft-record-v1 over RFC-8785 canonical UTF-8 of {schemaVersion,draftId,requestId,frontDoor,classification,sourceHashes:[...new Set(sourceHashes)].sort(),bodyBinding}; bodyBinding=HMAC-SHA256-local-key:draft-body-v1 over RFC-8785 canonical UTF-8 {domain:"draft-body-v1",bodyUtf8}; draftHash never uses raw bodyUtf8 directly and only keyed values are persisted; draft-hash-keyed'));
});

test('household reservation expiry has one owner', () => {
  assert.ok(packet.includes('household reservation ledger is covered only by the external-archive lock; reservation expiry/reclaim is owned solely by the receiver\'s transactional reclaim at age >=1800; it is not a deadline-ledger record and no scheduled enforcer wake is required; household-reservation-deadline-owner'));
});

test('admission challenge hashing is stage-invariant over decoded payload bytes', () => {
  assert.ok(packet.includes('challengePayloadHash hashes the decoded payloadUtf8Base64 bytes only, stage-invariant and not either serialized admission frame; stage=challenge and stage=authorized recompute the same payload bytes while frame metadata may differ; admission-challenge-hash-input-shape'));
});

test('public authorized admission never performs owner handoff', () => {
  assert.ok(packet.includes('owner receipt handoff (PERSONAL-ASSISTANT personal-nonclassroom only; vacuous on public doors; public-door-authorized-no-owner-handoff) -> explicit'));
});

test('household remint refreshes projection timestamps', () => {
  assert.ok(packet.includes('a re-mint mints a new signed projection with fresh createdAt and fresh serverTime, identical messageId/bodyHash, proven against the exact live reservation key {messageId,bodyHash}; createdAt in a re-minted projection denotes projection issuance, not original message creation; household-remint-createdAt-refresh-positive and household-remint-stale-createdAt-expired'));
});
