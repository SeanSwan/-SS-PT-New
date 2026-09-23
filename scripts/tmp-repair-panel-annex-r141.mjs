import crypto from 'node:crypto';
import fs from 'node:fs';

const file = 'docs/ai-workflow/AI-HANDOFF/PANEL-LEDGER-ANNEX-V1.json';
const entries = JSON.parse(fs.readFileSync(file, 'utf8'));
const r137 = entries.find((entry) => entry.roundId === 'r137');
if (!r137) throw new Error('r137 missing');
r137.adjudicationRecordDigest = '6f3231ad814e27feb4423fd0f8c0c3c0bf4186c80076fc5d8584ab609c45dc39';

if (entries.some((entry) => entry.roundId === 'r139')) throw new Error('r139 already present');
entries.push({
  roundId: 'r139',
  packetSha256: 'ec6a2c80eb47447eeb855a9ebb401cf6a59d2b7711b6d1327d7cbcd4d74d0815',
  seatArtifactDigests: {
    glm: '9f0c819f0cddeb4f478810af95318e807b8bf7ecfc7766f32d3be9e8dc281730',
    glmflash: 'd818911a6a5989e7ebfcd020b8a3ec3a41f2fcf3c5b0ad8471f90397b1b4e634',
    activeBuilder: null,
  },
  adjudicationRecordDigest: '2bf68e8bebe66068c9aa081f2c80365d0a4b0ed2338cd77dd944eeed74af1921',
  verdict: 'REVISE',
  annexReceiptHash: '',
});

entries.sort((a, b) => Number(a.roundId.slice(1)) - Number(b.roundId.slice(1)));
const ids = entries.map((entry) => entry.roundId);
if (new Set(ids).size !== ids.length) throw new Error('duplicate roundId');
for (let index = 1; index < ids.length; index += 1) {
  if (Number(ids[index]) <= Number(ids[index - 1])) throw new Error('round order failed');
}

for (const entry of entries) {
  const values = [
    entry.roundId,
    entry.packetSha256,
    entry.seatArtifactDigests.glm ?? '',
    entry.seatArtifactDigests.glmflash ?? '',
    entry.seatArtifactDigests.activeBuilder ?? '',
    entry.adjudicationRecordDigest ?? '',
    entry.verdict,
  ];
  entry.annexReceiptHash = crypto.createHash('sha256').update(values.join('|'), 'utf8').digest('hex');
}

fs.writeFileSync(file, JSON.stringify(entries, null, 2) + '\n', 'utf8');
const bytes = fs.readFileSync(file);
console.log(JSON.stringify({file, count: entries.length, sha256: crypto.createHash('sha256').update(bytes).digest('hex')}));
