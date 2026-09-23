/** Local diagram artifact builder; synthetic proposed contracts only; v1.0.
 * Reads 06-diagrams.md; writes Mermaid sources and a local rendering preview.
 * Browser renderer: pinned Mermaid 11.12.0, downloaded and retained locally.
 * Run with Node, then open diagrams.html via the packet's loopback server.
 * Owner: Sean. No API/database calls or remote diagram rendering.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const base=path.dirname(fileURLToPath(import.meta.url));
const text=fs.readFileSync(path.join(base,'06-diagrams.md'),'utf8');
const blocks=[...text.matchAll(/```mermaid\r?\n([\s\S]*?)```/g)].map(m=>m[1].trim());
const names=['Workflow','Proposal states','Agent sequence','Data relationships','Privacy boundaries','Provider and budget gate','Spending lifecycle','Reservation sequence'];
const escape=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
fs.mkdirSync(path.join(base,'diagrams'),{recursive:true});
blocks.forEach((b,i)=>fs.writeFileSync(path.join(base,'diagrams',`${i+1}.mmd`),b+'\n'));
fs.writeFileSync(path.join(base,'diagrams.html'),`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'none'; font-src 'self' data:"><title>SwanStudios — Blueprint diagrams</title><style>body{background:#0a0a0f;color:#e0ecf4;font:16px/1.6 system-ui;margin:32px}a{color:#60c0f0}article{background:#141419;border:1px solid #4070c0;border-radius:16px;padding:24px;margin:24px 0;overflow:auto}svg{min-width:600px}h1{font-size:32px}#render-status{color:#e0ecf4}</style><h1>SwanStudios: agents and training</h1><p>Proposed architecture · <a href="README.md">Read blueprint</a> · <a href="wireframes.html">Open wireframes</a></p><p id="render-status" role="status">Rendering ${blocks.length} diagrams locally…</p>${blocks.map((b,i)=>`<article><h2>${i+1}. ${names[i]}</h2><pre class="mermaid">${escape(b)}</pre></article>`).join('')}<script src="evidence/mermaid.min.js"></script><script>mermaid.initialize({startOnLoad:false,theme:'dark',securityLevel:'strict',themeVariables:{fontFamily:'Segoe UI, sans-serif',fontSize:'16px'},flowchart:{htmlLabels:false}});mermaid.run({querySelector:'.mermaid'}).then(()=>{document.getElementById('render-status').textContent='Rendered '+document.querySelectorAll('article svg').length+' of ${blocks.length} diagrams · Mermaid 11.12.0 · local renderer';}).catch(e=>{document.getElementById('render-status').textContent='RENDER FAILED: '+e.message;});</script></html>`);
console.log(`Wrote ${blocks.length} Mermaid sources and diagrams.html`);

