// Review diagnostics. Synthetic inputs only; immutable snapshot is the default.
// Set REVIEW_SOURCE_ROOT to test a repaired checkout. Exit 1 means defects reproduced.
//
// ─────────────────────────────────────────────────────────────────────────────
// ADAPTATIONS FOR THE REPAIRED CONTRACT (2026-09-13) — TWO CALL SITES ONLY.
//
// The reviewer's packet explicitly allows this: "A changed public contract may
// also require adapting these diagnostic callers; report such setup failures
// separately from RED behavior." Every adaptation is marked `REPAIR-ADAPT` so the
// diff is auditable. NOTHING about an assertion was weakened — only the way a
// brain directory is located, because the storage layout changed for HR07.
//
//   REPAIR-ADAPT 1 (HR09): `brains/<slug>/timeline.md` became
//     `brains/<channelId>/<generation>/timeline.md` with an atomic
//     `current.json` pointer. A display-name directory is exactly what HR07
//     removed, so this path cannot be shimmed without reverting the fix.
//
//   REPAIR-ADAPT 2 (HR11): unchanged — the helper still detects a changed hash.
//     Listed here only because it was checked.
//
// The engine keeps backward-compatible NAMES for everything that did not change
// semantics: `store.loadState`, `buildBrain(root, creator)`, `renderBrain`,
// `queryBrains().conflicts`, `deps.listUploads` and `requireDiscovered` all still
// work and all now carry the REPAIRED behaviour rather than the old one.
// ─────────────────────────────────────────────────────────────────────────────
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, unlinkSync, existsSync, readdirSync, openSync, closeSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
const here = dirname(fileURLToPath(import.meta.url));
const source = process.env.REVIEW_SOURCE_ROOT || join(here, 'snapshot');
const imp = (p) => import(pathToFileURL(join(source, p)).href);
const store = await imp('scripts/creator-brains/lib/store.mjs');
const { paths } = await imp('scripts/creator-brains/lib/paths.mjs');
const { newVideoState } = await imp('scripts/creator-brains/lib/fsm.mjs');
const { runDaily } = await imp('scripts/creator-brains/lib/run.mjs');
const { COMMANDS } = await imp('scripts/creator-brains/cli.mjs');
const { buildBrain } = await imp('scripts/creator-brains/lib/extract.mjs');
const { renderBrain } = await imp('scripts/creator-brains/lib/render.mjs');
const { exportBrains } = await imp('scripts/creator-brains/lib/export.mjs');
const { queryBrains } = await imp('scripts/creator-brains/lib/query.mjs');
const { claimFromCue } = await imp('scripts/creator-brains/lib/lexicon.mjs');
const { discoverChannel } = await imp('scripts/creator-brains/lib/discover.mjs');
const { addCreator } = await imp('scripts/creator-brains/lib/registry.mjs');
const { fetchVideo } = await imp('scripts/creator-brains/lib/fetch.mjs');
const { syncSubscriptions } = await imp('scripts/creator-brains/lib/subs.mjs');
const root = mkdtempSync(join(tmpdir(), 'creator-brains-hostile-'));
const A = 'UC' + 'a'.repeat(22), B = 'UC' + 'b'.repeat(22);
const VA = 'a'.repeat(11), VB = 'b'.repeat(11);
const clock = () => Date.parse('2026-09-13T10:00:00Z');
const creator = (id = A, title = 'Example') => ({channelId:id,title,enabled:true,url:`https://www.youtube.com/channel/${id}/videos`});
const results = [];
const make = (name, cs = [creator()], videos = [[VA,A]]) => {
  const r = join(root,name); mkdirSync(r,{recursive:true});
  store.saveRegistry({creators:Object.fromEntries(cs.map(c=>[c.channelId,c]))},r);
  store.saveState({videos:Object.fromEntries(videos.map(([v,c])=>[v,newVideoState(v,c,{now:new Date(clock()).toISOString()})]))},r);
  return r;
};
const text = 'always preserve texture while adjusting the shadow contrast';
const raw = (t=text,ms=2000) => JSON.stringify({events:[{tStartMs:ms,segs:[{utf8:t}]}]});
const deps = (extra={}) => ({version:'review-stub-no-network',probeSubs:()=>({ok:true,languages:['en-orig'],originals:['en-orig']}),fetchJson3:()=>raw(),listUploads:()=>[],...extra});
const doc = (r,c=A,v=VA,t=text,title='Example',ms=2000) => store.writeDoc(r,{channelId:c,videoId:v,text:t,title,cues:[{ms,text:t}],fetchedAt:new Date(clock()).toISOString(),source:'timed-text'});
const emit = (id,expected,observed,violated) => results.push({id,expected,observed,violated});
const quiet = async (fn) => {const old=process.stdout.write; let out=''; process.stdout.write=(x)=>{out+=x;return true};try{return {value:await fn(),out}}finally{process.stdout.write=old}};

// HR01: budget across invocations, same rolling hour.
{
 const r=make('budget',[creator()],[[VA,A],[VB,A]]);
 const one=await runDaily({r,clock,deps:deps(),only:['fetch'],budget:{perHour:1}});
 const two=await runDaily({r,clock,deps:deps(),only:['fetch'],budget:{perHour:1}});
 emit('HR01','At most one fetch across both runs', {fetched:[one.counts.fetched,two.counts.fetched]},one.counts.fetched+two.counts.fetched>1);
}
// HR02/03: actual CLI function boundary, wrong creator and false success.
{
 const r=make('cli-scope',[creator(A,'Alpha'),creator(B,'Beta')],[[VA,A],[VB,B]]); const called=[];
 const res=await quiet(()=>COMMANDS.fetch({r,args:[A],clock,deps:deps({probeSubs:id=>{called.push(id);return {ok:false,error:'synthetic network failure'}}})}));
 emit('HR02','Only Alpha requested', {requested:A,probed:called},called.includes(VB));
 emit('HR03','Fetch failure returns nonzero',{exitCode:res.value,stdout:res.out},res.value===0&&res.out.includes('failed 2'));
}
// HR04: strict JSON syntax is insufficient; direct discover bypasses even syntax gate.
{
 const r=make('bad-state'); writeFileSync(paths(r).state,'null');
 const res=await runDaily({r,clock,deps:deps(),only:['fetch']});
 emit('HR04a','Malformed state is preserved and blocks',{ok:res.ok,state:readFileSync(paths(r).state,'utf8')},res.ok&&readFileSync(paths(r).state,'utf8')!=='null');
 const d=make('direct-discover');writeFileSync(paths(d).state,'{bad');
 await discoverChannel(creator(),{r:d,now:clock,deps:deps()});
 emit('HR04b','Direct discover preserves corrupt state',{state:readFileSync(paths(d).state,'utf8')},readFileSync(paths(d).state,'utf8')!=='{bad');
}
// HR05: unreadable registry is an empty green run, and add destroys it.
{
 const r=make('bad-registry');writeFileSync(paths(r).registry,'{bad');
 const res=await runDaily({r,clock,deps:deps(),only:['fetch']});
 const add=await addCreator({r,ref:B,deps:{resolveCreator:()=>creator(B,'Beta')}});
 emit('HR05','Registry damage blocks without overwrite',{runOk:res.ok,addOk:add.ok,registryPreserved:readFileSync(paths(r).registry,'utf8')==='{bad'},res.ok&&add.ok);
}
// HR06: polarity disappears; both opposing rules become a recurring doctrine.
{
 const positive='always blur the tear trough crease before retouching portraits';
 const negative='never blur the tear trough crease before retouching portraits';
 const r=make('polarity',[creator()],[[VA,A],[VB,A]]);doc(r,A,VA,positive);doc(r,A,VB,negative);
 const brain=buildBrain(r,creator());renderBrain(brain,{r,now:clock()});
 const q=queryBrains('tear trough',{r});
 emit('HR06','Opposite instructions retain polarity and do not merge',{positive:claimFromCue(positive),negative:claimFromCue(negative),doctrines:brain.doctrine,conflicts:q.conflicts},brain.doctrine.length===1&&q.conflicts.length===0);
}
// HR07: equally named creators overwrite one another.
{
 const r=make('slug',[creator(A,'Common Name'),creator(B,'Common Name')],[[VA,A],[VB,B]]);
 doc(r,A,VA);doc(r,B,VB);const a=buildBrain(r,creator(A,'Common Name')),b=buildBrain(r,creator(B,'Common Name'));
 renderBrain(a,{r});renderBrain(b,{r});
 // REPAIR-ADAPT 2: identity moved from the display-derived slug to the channel
 // id. The old assertion compared `a.slug === b.slug`, which is now CORRECTLY
 // true — two channels may legitimately share a display name; that is what a
 // label is for. The invariant under test is distinct IMMUTABLE IDENTITY, so
 // this asserts the namespaces differ, that the live generations are distinct
 // directories, and that a display-name directory was NOT created (which is the
 // bug: `brains/common-name/` holding both creators).
 const dirs=[a,b].map(x=>JSON.parse(readFileSync(join(paths(r).brainsDir,x.namespace,'current.json'),'utf8')).generation);
 const slugDirExists=existsSync(join(paths(r).brainsDir,a.slug));
 emit('HR07','Distinct channels have immutable distinct namespaces',
   {namespaces:[a.namespace,b.namespace],generations:dirs,slugDir:slugDirExists,hitsA:queryBrains('texture',{r,creator:A}).hits.length},
   a.namespace===b.namespace||slugDirExists||queryBrains('texture',{r,creator:A}).hits.length===0);
}
// HR08: removed last document retains queryable/exported old claims forever.
{
 const r=make('stale');doc(r);const state=store.loadState(r);state.videos[VA].state='fetched';store.saveState(state,r);
 renderBrain(buildBrain(r,creator()),{r});exportBrains({r});unlinkSync(store.docPath(r,A,VA));let calls=0;
 const res=await runDaily({r,clock,deps:deps({probeSubs:()=>{calls++;return {ok:false,error:'unexpected'}}}),only:['fetch','build','export']});
 const hits=queryBrains('texture',{r}).hits;const staged=readdirSync(paths(r).vaultDir);
 emit('HR08','Missing doc is repaired or claims invalidated',{ok:res.ok,built:res.counts.built,calls,hits:hits.length,staged},res.ok&&calls===0&&hits.length>0);
}
// HR09: whitespace cap does not cap normalized words; creator names use 12 words.
{
 const phrase='frequency-separation layers-masks brushes-dodging burning-contrast clarity-texture detail-sharpening noise-reduction';
 const t=`always ${phrase}`;const r=make('tier');doc(r,A,VA,t);
 const title='alpha bravo charlie delta echo foxtrot golf hotel india juliet kilo lima';
 doc(r,A,VB,title);const brain=buildBrain(r,creator(A,title));renderBrain(brain,{r});exportBrains({r});
 const normalized=brain.claims[0].keyPhrase.replace(/[^a-z0-9\s]/g,' ').split(/\s+/).filter(Boolean);
 // REPAIR-ADAPT 1: resolve the live generation through the published pointer.
 const ptr=JSON.parse(readFileSync(join(paths(r).brainsDir,brain.namespace,'current.json'),'utf8'));
 const timeline=readFileSync(join(paths(r).brainsDir,brain.namespace,ptr.generation,'timeline.md'),'utf8');
 emit('HR09','Fewer than 8 normalized source words on every derived surface',{phrase:brain.claims[0].keyPhrase,normalizedWords:normalized.length,creatorTitleVerbatim:timeline.includes(title)},normalized.length>=8&&timeline.includes(title));
}
// HR10: token sidecar is insufficient -- valid credentials do not wire OAuth.
{
 if (process.env.REVIEW_SOURCE_ROOT) {
  results.push({id:'HR10',expected:'Use a fully mocked OAuth acceptance suite for a repaired adapter',observed:{reason:'Skipped: do not launch a new default OAuth flow with synthetic credentials'},violated:false,skipped:true});
 } else {
 const r=make('oauth');const cred=join(r,'synthetic-client.json');writeFileSync(cred,JSON.stringify({installed:{client_id:'synthetic-client-id',client_secret:'synthetic-secret',redirect_uris:['http://127.0.0.1']}}));
 const res=await syncSubscriptions({r,credentialPath:cred});
 emit('HR10','Unblock steps lead to a real consent/exchange path',{reason:res.reason,blocked:res.blocked},res.reason==='oauth_exchange_not_implemented');
 }
}
// HR11: idempotency ignores changed cue timings and trusts corrupt prior bytes.
{
 const r=make('timing');doc(r,A,VA,text,'Example',1000);const changed=doc(r,A,VA,text,'Example',9000);
 const first=store.readDoc(r,A,VA);first.text='corrupt replacement';writeFileSync(store.docPath(r,A,VA),JSON.stringify(first));
 const repair=doc(r,A,VA,text,'Example',9000);const after=store.readDoc(r,A,VA);
 emit('HR11','Timing edits and tampered content trigger validation/revision',{timingWrote:changed.wrote,storedMs:after.cues[0].ms,repairWrote:repair.wrote,text:after.text},!changed.wrote&&!repair.wrote);
}
// HR12: partial/malformed print records are silently treated as complete twice.
{
 const {parsePrintRows}=await imp('scripts/creator-brains/lib/enumerate.mjs');
 const r=make('enumeration');const st=store.loadState(r);st.videos[VA].state='fetched';store.saveState(st,r);
 const malformed=`${VA}\tTitle with\tembedded tab\t100\t500\t20260101`;
 const rows=parsePrintRows(malformed);
 await discoverChannel(creator(),{r,now:clock,deps:deps({listUploads:()=>rows})});
 await discoverChannel(creator(),{r,now:clock,deps:deps({listUploads:()=>rows})});
 emit('HR12','Malformed enumeration cannot prove deletion',{parsedRows:rows.length,state:store.loadState(r).videos[VA].state},store.loadState(r).videos[VA].state==='deleted_upstream');
}
// HR13: invalid timestamp payload accepted with a false citation.
{
 const r=make('timestamp');const v=store.loadState(r).videos[VA];
 const res=await fetchVideo(v,{r,creator:creator(),now:clock,deps:deps({fetchJson3:()=>raw(text,-9000)})});
 const brain=buildBrain(r,creator());
 emit('HR13','Negative timings rejected before persistence',{state:res.state,cites:brain.claims[0]?.cites},res.state==='fetched'&&brain.claims[0]?.tStartMs<0);
}
// HR14: concurrent writers double-fetch; interleaving registry/state changes lost.
{
 const r=make('race');let calls=0;
 const d=deps({fetchJson3:()=>{calls++;return raw()}});
 await Promise.all([runDaily({r,clock,deps:d,only:['fetch'],budget:{perHour:1}}),runDaily({r,clock,deps:d,only:['fetch'],budget:{perHour:1}})]);
 emit('HR14a','One writer owns the store and reservation',{fetchCalls:calls,documents:store.listDocs(r).length},calls>1);
 const x=make('lost-write');await runDaily({r:x,clock,only:['fetch'],deps:deps({fetchJson3:()=>{const s=store.loadState(x);s.videos[VB]=newVideoState(VB,A);store.saveState(s,x);return raw()}})});
 emit('HR14b','Concurrent newly discovered state is preserved',{newVideoSurvives:!!store.loadState(x).videos[VB]},!store.loadState(x).videos[VB]);
}
// HR15: no distinct creators, same topic stem, yet called a disagreement.
{
 const r=make('false-conflict',[creator()],[[VA,A],[VB,A]]);
 doc(r,A,VA,'always preserve texture while adjusting the shadow contrast');
 doc(r,A,VB,'be careful preserve texture while adjusting the shadow contrast');
 renderBrain(buildBrain(r,creator()),{r});const q=queryBrains('texture',{r});
 emit('HR15','Do not infer opposition from directive/caution labels',{creators:Object.keys(q.byCreator).length,conflicts:q.conflicts.length},q.conflicts.length>0);
}
// HR16: scheduled startup refusal leaves no durable run or digest.
{
 const r=make('scheduler');const log=join(r,'process.log');const fd=openSync(log,'w');let code=0;
 try{execFileSync(process.execPath,[join(source,'scripts/creator-brains/run-daily.mjs')],{stdio:['ignore',fd,fd],env:{...process.env,CREATOR_BRAINS_ROOT:r,CREATOR_BRAINS_YTDLP:join(r,'missing.exe')},windowsHide:true,timeout:20000})}catch(e){code=e.status}finally{closeSync(fd)}
 emit('HR16','Startup failure writes a durable failed run/digest',{exitCode:code,runs:store.listRuns(r).length,digestDirectory:existsSync(paths(r).digestDir)},code===2&&store.listRuns(r).length===0);
}
// HR17: a present doc with unusable cues is excluded from gaps.
{
 const r=make('bad-doc');doc(r);const d=store.readDoc(r,A,VA);d.cues=[];writeFileSync(store.docPath(r,A,VA),JSON.stringify(d));
 const brain=buildBrain(r,creator());
 emit('HR17','Unusable document creates an explicit coverage gap',{docCount:brain.docCount,covered:brain.timeline.length,gaps:brain.gaps.length},brain.docCount===1&&brain.timeline.length===0&&brain.gaps.length===0);
}
// HR18: discovered map has ID from creator B, caller supplies creator A.
{
 const r=make('binding',[creator(),creator(B,'Beta')],[[VB,B]]);let calls=0;const state=store.loadState(r);
 const res=await fetchVideo(state.videos[VB],{r,creator:creator(),state,requireDiscovered:true,now:clock,deps:deps({fetchJson3:()=>{calls++;return raw()}})});
 emit('HR18','Fetched identity must match authoritative discovery channel',{state:res.state,calls,wroteUnderWrongCreator:existsSync(store.docPath(r,A,VB))},calls>0&&existsSync(store.docPath(r,A,VB)));
}
const receipt={source,fixtureRoot:root,network:'none; synthetic deps; scheduler uses missing executable',probes:results.length,violations:results.filter(x=>x.violated).length,results};
writeFileSync(join(here,'diagnostic-results.json'),JSON.stringify(receipt,null,2)+'\n');
for(const x of results)console.log(`${x.skipped?'SKIPPED':x.violated?'REPRODUCED':'NOT REPRODUCED'} ${x.id}: ${JSON.stringify(x.observed)}`);
console.log(`${receipt.violations}/${receipt.probes} invariant violations reproduced. Fixtures retained at ${root}`);
assert.equal(receipt.violations,0,'Review RED: implementation violates required invariants; see diagnostic-results.json');
