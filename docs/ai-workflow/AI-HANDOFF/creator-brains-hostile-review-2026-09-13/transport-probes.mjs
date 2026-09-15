// Tests the real text parsers and argv builder with a synthetic child process.
// No network or yt-dlp installation is used. Exit 1 means defects reproduced.
import cp from 'node:child_process';
import {syncBuiltinESMExports} from 'node:module';
import {writeSync,writeFileSync,mkdtempSync,readFileSync,openSync,closeSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {tmpdir} from 'node:os';
const here=dirname(fileURLToPath(import.meta.url));
const source=process.env.REVIEW_SOURCE_ROOT||join(here,'snapshot');
const nativeExec=cp.execFileSync;
const calls=[];let response='';
cp.execFileSync=(file,args,opts)=>{calls.push({file,args});if(response)writeSync(opts.stdio[1],response);return null};
syncBuiltinESMExports();
process.env.CREATOR_BRAINS_YTDLP='synthetic-yt-dlp';
const imp=p=>import(pathToFileURL(join(source,p)).href);
const {probeSubs,listUploads,runYtDlp}=await imp('scripts/creator-brains/lib/ytdlp.mjs');
const {fetchVideo}=await imp('scripts/creator-brains/lib/fetch.mjs');
const {newVideoState}=await imp('scripts/creator-brains/lib/fsm.mjs');
const results=[];const r=mkdtempSync(join(tmpdir(),'cb-transport-hostile-'));
const ch='UC'+'a'.repeat(22),id='a'.repeat(11);let now=Date.parse('2026-09-13T10:00:00Z');
const empty=probeSubs(id);let v=newVideoState(id,ch);
v=await fetchVideo(v,{r,creator:{channelId:ch},now:()=>now});now+=49*3600000;
v=await fetchVideo(v,{r,creator:{channelId:ch},now:()=>now});
results.push({id:'HR19',expected:'Exit-0 empty probe is an unanswered/shape failure',observed:{probe:empty,finalState:v.state},violated:v.state==='unavailable'});
response=`${id}\tExample\t30\t5\t20260101`;
listUploads(`https://www.youtube.com/channel/${ch}/videos`,{limit:0});
const enumeration=calls.at(-1).args;
results.push({id:'HR20',expected:'Ignore ambient config and enforce approved effects centrally',observed:{enumerationArgs:enumeration,ignoreConfigPresent:enumeration.includes('--ignore-config'),skipDownloadPresent:enumeration.includes('--skip-download')},violated:!enumeration.includes('--ignore-config')});
// No actual media operation occurs: the child process is a recorder here.
let mediaGuardRejected=false;try{runYtDlp(['https://www.youtube.com/watch?v='+id,'--format=best'])}catch{mediaGuardRejected=true}
results.push({id:'HR20b',expected:'Central effect guard rejects inline media options',observed:{mediaGuardRejected},violated:!mediaGuardRejected});
// Two distinct Node processes, with equal clocks and a fresh module-level counter.
cp.execFileSync=nativeExec;syncBuiltinESMExports();
const ledgerUrl=pathToFileURL(join(source,'scripts/creator-brains/lib/ledger.mjs')).href;
const child=join(r,'id.mjs');writeFileSync(child,`import {runIdFor} from ${JSON.stringify(ledgerUrl)}; console.log(runIdFor(()=>0));`);
const ids=[];
for(let i=0;i<2;i++){const p=join(r,`id-${i}.txt`),fd=openSync(p,'w');try{nativeExec(process.execPath,[child],{stdio:['ignore',fd,fd],windowsHide:true,timeout:10000})}finally{closeSync(fd)}ids.push(readFileSync(p,'utf8').trim())}
results.push({id:'HR21',expected:'Cross-process runs have unique IDs',observed:{ids},violated:ids[0]===ids[1]});
const receipt={source,network:'none',probes:results.length,violations:results.filter(x=>x.violated).length,results};
writeFileSync(join(here,'transport-results.json'),JSON.stringify(receipt,null,2)+'\n');
for(const x of results)console.log(`${x.violated?'REPRODUCED':'NOT REPRODUCED'} ${x.id}: ${JSON.stringify(x.observed)}`);
process.exitCode=receipt.violations?1:0;
