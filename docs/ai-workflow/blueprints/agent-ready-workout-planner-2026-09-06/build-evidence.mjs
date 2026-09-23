/** v2 receipt refresh only. This does not execute tests or change their statuses.
 * Run only after inspecting the current evidence, then run check-readiness.mjs.
 * The former v1 packet generator is preserved in the verified v1 vault snapshot.
 */
import fs from 'node:fs';import path from'node:path';import crypto from'node:crypto';import{fileURLToPath}from'node:url';
const dir=path.dirname(fileURLToPath(import.meta.url)),file=path.join(dir,'readiness.json'),receipt=JSON.parse(fs.readFileSync(file,'utf8'));
const hash=entry=>{const p=path.resolve(dir,entry.path);if(!p.startsWith(dir+path.sep))throw Error('Evidence outside packet');return {...entry,sha256:crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')}};
for(const section of Object.values(receipt.sections))if(section.evidence)section.evidence=section.evidence.map(hash);
for(const test of receipt.tests)if(test.evidence)test.evidence=test.evidence.map(hash);
fs.writeFileSync(file,JSON.stringify(receipt,null,2)+'\n');console.log('Refreshed evidence references only. No tests or runtime verification performed.');
