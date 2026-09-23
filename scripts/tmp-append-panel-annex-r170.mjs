import fs from 'node:fs';
import crypto from 'node:crypto';

const annexPath = 'docs/ai-workflow/AI-HANDOFF/PANEL-LEDGER-ANNEX-V1.json';
const receiptPath = 'docs/ai-workflow/AI-HANDOFF/PANEL-LEDGER-ANNEX-RECEIPT.json';
const entry = {
  schemaVersion: '1.0.0',
  roundId: 'r170',
  packetSha256: '860f86c7d2fc09ac73c2d818dac773c017054fc09adf97ec4f24fc42dbb51643',
  seatArtifactDigests: {
    glm: '58af923c90ca821127d8256d2d6fb4b4f8d0ff3006255ce3e2818130b89fff86',
    glmflash: '91149e4027e7369e3e4bcaaac415721a0c75cabde01d35e02c80a7ae602ef451',
    activeBuilder: '3c9e123d66b923c65378a681e98d52ca345b12baec139a845977bdd909d46eab',
  },
  adjudicationRecordDigest: '3c9e123d66b923c65378a681e98d52ca345b12baec139a845977bdd909d46eab',
  verdict: 'REVISE',
  annexReceiptHash: '',
};
const annex = JSON.parse(fs.readFileSync(annexPath, 'utf8'));
if (annex.some((item) => item.roundId === entry.roundId)) throw new Error('r170 already exists');
const maxRound = Number(annex.at(-1).roundId.slice(1));
if (maxRound !== 169) throw new Error(`unexpected annex tail: ${annex.at(-1).roundId}`);
const values = [
  entry.roundId,
  entry.packetSha256,
  entry.seatArtifactDigests.glm,
  entry.seatArtifactDigests.glmflash,
  entry.seatArtifactDigests.activeBuilder,
  entry.adjudicationRecordDigest,
  entry.verdict,
];
entry.annexReceiptHash = crypto.createHash('sha256').update(values.join('|'), 'utf8').digest('hex');
annex.push(entry);
fs.writeFileSync(annexPath, `${JSON.stringify(annex, null, 2)}\n`, 'utf8');
const annexBytes = fs.readFileSync(annexPath);
const receipt = JSON.parse(fs.readFileSync(receiptPath, 'utf8'));
receipt.receiptId = 'plar_r170';
receipt.annexSha256 = crypto.createHash('sha256').update(annexBytes).digest('hex');
receipt.roundCount = annex.length;
receipt.createdAt = new Date().toISOString();
fs.writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({annexSha256: receipt.annexSha256, roundCount: annex.length, annexReceiptHash: entry.annexReceiptHash}));
