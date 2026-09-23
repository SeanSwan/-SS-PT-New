/** Lead browser component harness: actual mounted Panel, synthetic hook/auth adapters only.
 * No application boot, auth profile, server or network. Not production-route proof.
 * Usage: node capture-kg1c1-panel.mjs BUILD_ROOT NEW_OUTPUT_ROOT
 */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { resolve, join } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';
const [rootArg,outArg]=process.argv.slice(2);
assert.ok(rootArg&&outArg,'Explicit isolated build root and new QA output directory required');
const root=resolve(rootArg),out=resolve(outArg),front=join(root,'frontend');
const require=createRequire(join(front,'package.json'));
const {build}=require('esbuild');
const {chromium,expect}=require('@playwright/test');
const revision=`h1:${'a'.repeat(64)}`;
const log={id:12,exerciseName:'Bench press',setNumber:1,reps:8,weight:220.46226218487757,
  enteredWeight:100,enteredWeightUnit:'kg',weightStatus:'known',circuitName:'Circuit A',circuitOrder:1,
  exerciseRole:'primary',setType:'working',isometricHoldSeconds:null,tempo:'2/1/2',rest:60,rpe:7,
  notes:'Controlled final repetitions',exerciseNote:'Steady tempo, full range',
  createdAt:'2026-09-01T12:00:00.000Z',updatedAt:'2026-09-01T12:01:00.000Z'};
const session={id:'00000000-0000-4000-8000-000000000001',title:'Strength session',
  date:'2026-09-01T12:00:00.000Z',duration:45,intensity:7,status:'completed',totalSets:3,
  totalReps:24,totalWeight:3807,editRevision:revision,editable:true,notes:'Synthetic browser fixture',
  logs:[log,{...log,id:13,setNumber:2,weight:80,enteredWeight:null,enteredWeightUnit:null,weightStatus:'unknown-unit'},
    {...log,id:14,circuitName:'Circuit B',circuitOrder:2,enteredWeight:90}]};
const data={sessions:[session],weeklyVolume:[],exerciseFrequency:[],intensityTrend:[],
  workoutCalendar:[],personalRecords:[],oneRMProgression:[],muscleGroupVolume:[],rpeTrend:[],
  summary:{totalWorkouts:1,totalExercises:1,totalVolume:3807,avgIntensity:7,avgRPE:7,longestStreak:1}};
const adapters={
  AuthContext:`export const useAuth=()=>({authAxios:{patch:async(url,body)=>{window.__patches.push({url,body});return {data:{success:true}};}}});`,
  useWorkoutAnalytics:`export const useWorkoutAnalytics=()=>({data:${JSON.stringify(data)},isLoading:false,error:null,refetch:async()=>{}});`,
  ShareToFeedModal:'export default ()=>null;',HistoryBackfillDialog:'export default ()=>null;',
  AdminProgressChartsGrid:'export default ()=>null;',
};
const entry=`import React from 'react';import {createRoot} from 'react-dom/client';
import Panel from './src/components/DashBoard/Pages/admin-clients/components/WorkoutHistoryPanel';
window.__patches=[];createRoot(document.getElementById('root')).render(<Panel clientId={42} clientName="Synthetic client" variant="embedded" active/>);`;
const bundle=await build({stdin:{contents:entry,loader:'tsx',resolveDir:front},bundle:true,write:false,
  platform:'browser',format:'iife',define:{'process.env.NODE_ENV':'"production"'},logLevel:'silent',
  plugins:[{name:'synthetic-boundaries',setup(b){
    b.onResolve({filter:/(AuthContext|useWorkoutAnalytics|ShareToFeedModal|HistoryBackfillDialog|AdminProgressChartsGrid)$/},args=>({path:args.path.split('/').at(-1),namespace:'synthetic'}));
    b.onLoad({filter:/.*/,namespace:'synthetic'},args=>({contents:adapters[args.path],loader:'js'}));
  }}]});
mkdirSync(out); // fresh evidence directory only
const browser=await chromium.launch({channel:'chrome',headless:true});
const results=[],errors=[];
try {
  const context=await browser.newContext({reducedMotion:'reduce',deviceScaleFactor:1});
  await context.route('**/*',r=>r.abort());
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  for(const [width,height] of [[320,900],[414,1000],[768,1024],[1440,1080],[2560,1440],[3840,2160]]) {
    await page.setViewportSize({width,height});
    await page.setContent('<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;padding:16px;background:#002060;color:#E0ECF4;font-family:Arial,sans-serif}*{box-sizing:border-box}#root{max-width:1600px;margin:auto}</style></head><body><main id="root"></main></body></html>');
    await page.addScriptTag({content:bundle.outputFiles[0].text});
    await page.getByText('Strength session',{exact:true}).click();
    await page.getByTestId(`edit-start-${session.id}`).click();
    await expect(page.getByTestId(`edit-save-${session.id}`)).toBeVisible();
    const controls=await page.locator('input,select,button,textarea').evaluateAll(elements=>elements
      .map(el=>({tag:el.tagName,label:el.getAttribute('aria-label')||el.textContent||el.getAttribute('data-testid'),
        disabled:el.disabled,rect:el.getBoundingClientRect().toJSON()}))
      .filter(item=>item.rect.width>0&&item.rect.height>0));
    const measurements=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,viewport:innerWidth}));
    const file=`history-editor-${width}.png`;
    await page.screenshot({path:join(out,file),fullPage:true});
    results.push({width,height,...measurements,controls,file});
  }
  const receipt={scope:'real Panel component with synthetic analytics/auth adapters; no actual dashboard route or database',results,errors};
  writeFileSync(join(out,'receipt.json'),JSON.stringify(receipt,null,2));
  assert.deepEqual(errors,[],'Browser runtime errors');
  for(const result of results) {
    assert.ok(result.scrollWidth<=result.width,`Page overflow at ${result.width}`);
    const small=result.controls.filter(c=>!c.disabled&&(c.rect.width<44||c.rect.height<44));
    assert.deepEqual(small,[],`Undersized controls at ${result.width}`);
    const clipped=result.controls.filter(c=>!c.disabled&&(c.rect.left<0||c.rect.right>result.width+0.5));
    assert.deepEqual(clipped,[],`Offscreen horizontal controls at ${result.width}`);
  }
  console.log(JSON.stringify({scope:receipt.scope,viewports:results.map(r=>[r.width,r.height]),errors}));
}finally{await browser.close();}
