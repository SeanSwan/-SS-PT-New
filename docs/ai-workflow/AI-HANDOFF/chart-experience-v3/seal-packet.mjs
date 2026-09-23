/** Planning integrity only. Creates a portable manifest; --verify never writes. */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root=dirname(fileURLToPath(import.meta.url));
const hash=name=>createHash('sha256').update(readFileSync(join(root,name))).digest('hex');
const names=readdirSync(root).filter(name=>/\.(md|html|css|js|mjs)$/.test(name)).sort();
const path=join(root,'packet-manifest.json');
if(process.argv.includes('--verify')) {
  const manifest=JSON.parse(readFileSync(path,'utf8'));
  if(JSON.stringify(manifest.files.map(f=>f.path))!==JSON.stringify(names)) throw new Error('Packet file set changed');
  for(const file of manifest.files) if(hash(file.path)!==file.sha256) throw new Error(`Changed: ${file.path}`);
  console.log(JSON.stringify({status:'PASS',files:names.length,manifestSha256:hash('packet-manifest.json')}));
} else {
  const manifest={schemaVersion:'swan-chart-planning-v3',createdAt:new Date().toISOString(),
    scope:'planning, synthetic study, acceptance gates and local slice evidence; not production verification',files:names.map(path=>({path,sha256:hash(path)}))};
  writeFileSync(path,JSON.stringify(manifest,null,2)+'\n');
  console.log(JSON.stringify({status:'SEALED',files:names.length,manifestSha256:hash('packet-manifest.json')}));
}
