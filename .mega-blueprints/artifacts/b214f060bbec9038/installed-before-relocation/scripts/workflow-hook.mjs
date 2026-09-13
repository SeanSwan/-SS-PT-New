#!/usr/bin/env node
/** Native enrolled-session guard. Does not read transcripts, credentials or execute commands. */
import fs from 'node:fs';import path from 'node:path';import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {policy,hash,confined,validateStateShape,validateFrozenEvidence,validateReviewRound,validatePendingAttempt} from './workflow-policy.mjs';
import {transact} from './workflow.mjs';
import {isOverride, overrideTransition, validateOverridePending} from './workflow-override.mjs';
const here=path.dirname(fileURLToPath(import.meta.url));
export const registryRoot=()=>process.env.HERMES_HOME?path.join(process.env.HERMES_HOME,'state/mega-blueprints'):path.join(os.homedir(),'.agents/build-protocol/enrollments');
export function enroll(file,registry=registryRoot()){
 const state=JSON.parse(fs.readFileSync(file,'utf8'));
 validateStateShape(state);
 if(![3,4].includes(state.schemaVersion)||!state.sessionId||!state.taskId||state.policyHash!==hash(JSON.stringify(policy)))throw Error('valid task/session state required');
 const dest=path.join(registry,hash(state.sessionId)+'.json');fs.mkdirSync(registry,{recursive:true});
 let previousEnrollment=null;
 if(fs.existsSync(dest)){const old=JSON.parse(fs.readFileSync(dest,'utf8'));if(old.stateFile!==fs.realpathSync(file)){const before=JSON.parse(fs.readFileSync(old.stateFile,'utf8'));const explicitReplacement=isOverride(state)&&state.origin.previousState&&fs.realpathSync(confined(state.repoRoot,state.origin.previousState.path))===old.stateFile&&hash(fs.readFileSync(old.stateFile))===state.origin.previousState.sha256;if(before.status!=='complete'&&!explicitReplacement)throw Error('session already enrolled in active task');previousEnrollment=old}else{return {enrolled:true,taskId:state.taskId,unchanged:true}}}
 fs.writeFileSync(dest,JSON.stringify({schemaVersion:state.schemaVersion,sessionId:state.sessionId,taskId:state.taskId,repoRoot:fs.realpathSync(state.repoRoot),stateFile:fs.realpathSync(file),...(previousEnrollment?{previousEnrollment}:{})}));
 return {enrolled:true,taskId:state.taskId};
}
const tokens=cmd=>[...cmd.matchAll(/"([^"]*)"|'([^']*)'|([^\s]+)/g)].map(m=>m[1]??m[2]??m[3]);
function controller(cmd,record){
 const cleaned=cmd.trim().replace(/^&\s+/,'');
 if(/[\r\n;|&<>$\x60]/.test(cleaned))return false;
 const t=tokens(cleaned);
 if(t.length<4||t.length>5)return false;
 try{
  if(fs.realpathSync(t[0])!==fs.realpathSync(process.execPath)||fs.realpathSync(t[1])!==fs.realpathSync(path.join(here,'workflow.mjs'))||fs.realpathSync(t[3])!==record.stateFile)return false;
 }catch{return false}
 return ['status','snapshot','freeze','admit','review','fix','advance','pause','resume','reconcile','append-slice'].includes(t[2]);
}
function statusController(cmd,record){
 const cleaned=cmd.trim().replace(/^&\s+/, '');
 if(/[\r\n;|&<>$\x60]/.test(cleaned))return false;
 const t=tokens(cleaned);
 if(t.length!==4||t[2]!=='status')return false;
 try{return fs.realpathSync(t[0])===fs.realpathSync(process.execPath)&&fs.realpathSync(t[1])===fs.realpathSync(path.join(here,'workflow.mjs'))&&fs.realpathSync(t[3])===record.stateFile}catch{return false}
}
function supportedState(state){
 try{validateStateShape(state);return true}catch{return false}
}
function explicitMigrationCommand(cmd,record){
 const cleaned=cmd.trim().replace(/^&\s+/,'');if(/[\r\n;|&<>$\x60]/.test(cleaned))return false;
 const t=tokens(cleaned);
 try{
  if(fs.realpathSync(t[0])!==fs.realpathSync(process.execPath))return false;
  if(fs.realpathSync(t[1])===fs.realpathSync(path.join(here,'workflow.mjs'))&&t[2]==='migrate'&&(t.length===5||(t.length===6&&t[5]==='--check'))){
   if(fs.existsSync(t[3]))return false;
   const input=JSON.parse(fs.readFileSync(t[4],'utf8')),next=overrideTransition(null,'migrate',input);
   confined(record.repoRoot,path.relative(record.repoRoot,path.resolve(t[3])));
   return fs.realpathSync(confined(next.repoRoot,next.origin.previousState.path))===record.stateFile;
  }
  if(fs.realpathSync(t[1])===fs.realpathSync(path.join(here,'workflow-hook.mjs'))&&t[2]==='enroll'&&t.length===4){
   const next=JSON.parse(fs.readFileSync(t[3],'utf8'));validateStateShape(next);
   return isOverride(next)&&next.origin.previousState&&fs.realpathSync(confined(next.repoRoot,next.origin.previousState.path))===record.stateFile;
  }
 }catch{return false}return false;
}
const readTools=new Set(['read_file','readFile','Read','read_mcp_resource','list_mcp_resources','list_mcp_resource_templates','list_directory','list_dir','file_search','search_files','grep','rg','Glob','Grep','view_image','get_usage_limits','clock__curr_time']);
function safeReadCommand(cmd){
 if(/[\r\n;|&<>$\x60]/.test(cmd))return false;
 const t=tokens(cmd);
 if(t[0]==='git')return ['status','diff','show','log','rev-parse'].includes(t[1])&&!t.some(x=>/^--(output|ext-diff|textconv|exec|config-env)/.test(x));
 if(['pwd','Get-Location'].includes(t[0]))return t.length===1;
 if(['cat','head','tail','Get-Content','ls','Get-ChildItem'].includes(t[0]))return !t.some(x=>/^-.*(exec|delete)/i.test(x));
 return false;
}
function fileTargets(name,args){
 const explicit=args.file_path||args.path||args.filename;
 if(name==='apply_patch'||(name==='patch'&&args.mode==='patch')){
  const patch=args.patch||args.command||args.input||'';
  if(typeof patch!=='string')return [];
  const targets=explicit?[explicit]:[];let parsed=0;
  for(const line of patch.split(/\r?\n/)){
   let m;
   if((m=line.match(/^\*\*\*\s*(?:Add|Update|Delete)\s+File:\s*(.+)$/))){targets.push(m[1].trim());parsed++}
   else if((m=line.match(/^\*\*\*\s*Move\s+File:\s*(.+?)\s*->\s*(.+)$/))){targets.push(m[1].trim(),m[2].trim());parsed++}
   else if((m=line.match(/^\*\*\*\s*Move\s+to:\s*(.+)$/))){targets.push(m[1].trim());parsed++}
   else if(/^\*\*\*/.test(line)&&!/^\*\*\*\s*(?:Begin Patch|End Patch|End of File)\s*$/.test(line))return [];
  }
  return parsed?targets:[];
 }
 return explicit?[explicit]:[];
}
function canonicalTarget(full){let p=full;while(!fs.existsSync(p))p=path.dirname(p);return path.resolve(fs.realpathSync(p),path.relative(p,full))}

export function guard(event,registry=registryRoot()){
 const id=event.session_id||event.sessionId;if(!id)return null;
 const enrollment=path.join(registry,hash(id)+'.json');if(!fs.existsSync(enrollment))return null;
 try{
  const record=JSON.parse(fs.readFileSync(enrollment,'utf8'));
  const state=JSON.parse(fs.readFileSync(record.stateFile,'utf8'));
   let stateRoot;try{stateRoot=fs.realpathSync(state.repoRoot)}catch{throw Error('enrollment/state mismatch')}
   if(!supportedState(state)||record.sessionId!==id||record.taskId!==state.taskId||state.sessionId!==id||stateRoot!==record.repoRoot)throw Error('enrollment/state mismatch');
   const name=event.tool_name||event.toolName||'',args=event.tool_input||event.args||{};
   if(readTools.has(name)||readTools.has(name.split('__').pop()))return null;
   const cmd=args.command||args.cmd||'';
   if(['Bash','exec_command','terminal','shell','shell_command'].includes(name)&&explicitMigrationCommand(cmd,record))return null;
   if(state.policyHash!==hash(JSON.stringify(policy))){
    if(['Bash','exec_command','terminal','shell','shell_command'].includes(name)&&(statusController(cmd,record)||safeReadCommand(cmd)))return null;
    throw Error('stale policy; replan and reenroll; no automatic migration');
   }
   if(state.status==='complete')return null;
  if(['Bash','exec_command','terminal','shell','shell_command'].includes(name)&&controller(cmd,record))return null;
  const run=state.inFlight;
  if(run?.dispatch&&name===run.dispatch.toolName&&hash(JSON.stringify(args))===run.dispatch.inputHash){
   if(state.status!=='active'||run.dispatched||Date.now()>run.deadline)throw Error('dispatch already consumed or deadline expired; reconcile execution');
   transact(record.stateFile,s=>{
    validateStateShape(s);
    const current=s.stage==='final'?s.finalReview:s.slices[s.index];
    if(s.policyHash!==hash(JSON.stringify(policy))||s.status!=='active'||current?.status!=='review'||s.inFlight?.id!==run.id||s.inFlight.dispatched||Date.now()>s.inFlight.deadline)throw Error('dispatch already consumed or state changed');
    if(isOverride(s))validateOverridePending(s,{forDispatch:true});
    else{validatePendingAttempt(s,current,{forDispatch:true});validateFrozenEvidence(s,current,{checkCurrent:true});validateReviewRound(s,current);}
    s.inFlight.dispatched=true;return {state:s,result:null};
   });return null;
  }
  const a=state.stage==='final'?state.finalReview:state.slices[state.index];
  if(!a||!['build','review','tested'].includes(a.status))throw Error('invalid slice phase');
  const writes=/write|edit|patch|notebook/i.test(name)&&!/^write_stdin$/i.test(name);
  if(writes){
   const targets=fileTargets(name,args);if(!targets.length)throw Error('write target cannot be established');
   for(const target of targets){
    if(!path.isAbsolute(target)&&!event.cwd)throw Error('authoritative task cwd unavailable; use absolute paths');
    const relative=path.relative(record.repoRoot,path.resolve(event.cwd||record.repoRoot,target)),full=confined(record.repoRoot,relative);
    const artifactPrefix=path.join('.mega-blueprints','artifacts',hash(state.taskId).slice(0,16))+path.sep;
    const artifact=relative.startsWith(artifactPrefix)&&/\.(json|md|txt|log|png|svg)$/.test(relative);
    const allowed=(a.allowedFiles||[]).some(p=>confined(record.repoRoot,p)===full);
    if(artifact){if(canonicalTarget(full)!==full||(fs.existsSync(full)&&fs.statSync(full).nlink>1))throw Error('artifact aliases protected source');continue;}
    if(state.status!=='active'||a.status!=='build'||!allowed)throw Error('write outside current build slice or review is frozen');
   }return null;
  }
  if(['Bash','exec_command','terminal','shell','shell_command'].includes(name)&&safeReadCommand(cmd))return null;
  if(state.status==='active'&&a.status==='build')return null;
  throw Error('review is frozen: only reads, evidence, admitted dispatch and workflow transitions are available');
 }catch(e){return 'Mega Blueprints: '+e.message}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const command=process.argv[2];
  if(command==='enroll'){console.log(JSON.stringify(enroll(path.resolve(process.argv[3]))))}
  else{const raw=fs.readFileSync(0,'utf8');if(raw.length>1024*1024)throw Error('oversized native event');const message=guard(JSON.parse(raw));const hermes=command==='hermes';console.log(JSON.stringify(message?(hermes?{action:'block',message}:{hookSpecificOutput:{hookEventName:'PreToolUse',permissionDecision:'deny',permissionDecisionReason:message}}):{}))}
 }catch(e){console.error('Mega Blueprints guard: '+e.message);process.exitCode=2}
}


