/** Capture read-only repository facts and refresh embedded diagram source for this planning artifact. */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
const packet = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repository = resolve(packet, '../../../..');
const run = (file, args) => execFileSync(file, args, { cwd: repository, encoding: 'utf8', windowsHide: true }).trim();
const hash = file => createHash('sha256').update(readFileSync(file)).digest('hex');
const put = (path, value) => writeFileSync(resolve(packet,path), JSON.stringify(value,null,2)+'\n');
const observedAt = new Date().toISOString();
const sourceNames = /(?:DashboardRoutes|UniversalDashboardLayout\.(?:routes|shellPieces|routeComponents)|ClientBodyMapModal|BiometricsTabContent|MeasurementEntry|WorkoutOutletWrapper|painEntryService|painChartInsights|ClientPainEntry|painEntryRoutes|painEntryController|painWriteService|bootcampPainAlerts|useCoachCommand|useAIChat|useAnalytics|useClientAnalytics|RecoverySignalBars|chartDataController|analyticsRoutes|clientAnalyticsRoutes|WorkoutLog|WorkoutSession|WorkoutExercise|ExerciseMuscleGroup|Exercise|workoutLogService|workoutRoutes|workoutSessionRoutes|ClientAnalyticsPanel|ProfileChartsSection|CoachCommandCenterPage|CoachReviewPanel|roleConfig)\.(?:tsx?|mjs)$/;
const allSources = run('rg',['--files','frontend/src','backend']).split(/\r?\n/).map(p=>p.replaceAll('\\','/'));
const selected = allSources.filter(p=>sourceNames.test(p));
selected.push('frontend/src/components/BodyMap/index.tsx','frontend/package.json','backend/core/routes.mjs',
  'docs/ai-workflow/design-brain/design.md','docs/ai-workflow/design-brain/qa-gates.md',
  'docs/ai-workflow/design-brain/adapters/product-surfaces.md','docs/ai-workflow/references/SWAN-CINEMATIC-DESIGN-SYSTEM.md',
  '.claude/skills/swan-design-router/SKILL.md');
const files = [...new Set(selected)].sort().map(path=>({path,sha256:hash(resolve(repository,path)),lines:readFileSync(resolve(repository,path),'utf8').split('\n').length}));
// Compact per-file rows keep the machine manifest reviewable.
writeFileSync(resolve(packet,'evidence/source-manifest.json'), '{\n'+
  '"repository":'+JSON.stringify(repository)+',\n"observedAt":'+JSON.stringify(observedAt)+',\n"files":[\n'+
  files.map(x=>JSON.stringify(x)).join(',\n')+'\n]}\n');
const rootInventory = readdirSync(repository).map(name=>({name,kind:statSync(resolve(repository,name)).isDirectory()?'directory':'file'}));
const relevant = allSources.filter(p=>/BodyMap|PainChart|PainEntry|CoachCommandCenter|SwanCoachAssistant|RecoverySignal|MuscleRecovery/.test(p));
put('evidence/hygiene.json',{observedAt,rootInventory,relevantSurfaces:relevant,
  routeOverlap:['/api/workout mount precedes /api/workout/sessions; sessions CRUD overlaps',
    'RecoverySignalBars versus deprecated MuscleRecoveryHeatmap and legacy chart-muscle-recovery request',
    'Shared BodyMap embedded in role routes and client/modal/measurement consumers',
    'Shared Coach UI versus separately owned Universe V3 and Astra worktrees'],
  archiveCandidates:['Superseded Coach plans after link/owner/restore checks','Legacy Coach shells after all-caller proof','Loose root patch/backup files after ownership review'],
  actions:'Inventory only; nothing archived, moved or deleted.'});
const branch=run('git',['branch','--show-current']),head=run('git',['rev-parse','HEAD']);
const status=run('git',['status','--short']).split(/\r?\n/);
put('evidence/baseline.json',{observedAt,repository,branch,head,initialStatusEntries:804,currentStatusEntries:status.length,
  applicationWritesByThisTask:0,authorization:'Planning, read-only audit, wireframes, acceptance specifications and reusable packaged skill only',
  tests:[{id:'B01',status:'FAIL',passed:808,failed:2,files:131,exitCode:1,log:'frontend-baseline.log'},
    {id:'B02',status:'PASS',passed:5,failed:0,files:2,exitCode:0,log:'backend-baseline.log'},
    {id:'B03',status:'PASS',passed:39,failed:0,exitCode:0,log:'design-brain-baseline.log'}],
  liveAudit:{actualViewport:[2195,1097],coachComposerTop:1139.6,coachComposerBottom:1191.6,
    deploymentSha:'UNKNOWN',roleJourneys:'Admin observed read-only; real client/trainer acceptance NOT RUN',
    requestedViewportOverrides:'414x896,2560x1440,3840x2160 ineffective; not verified'},
  skill:{path:'swan-pain-atlas/SKILL.md',status:'Packaged and quick_validate passed; not installed globally or promoted into Design Brain'},
  preservation:{manifest:'.ai-workflow/vault/anatomy-coach-planning-20260906/manifest.json',
    sha256:'8e1b2cda80369c65f0fbcaebe65a19181ae5220b043a269e26c86bd9a52b9c6a',verifiedFiles:243,restoreSamples:2,nativeHook:'UNOBSERVED'},
  externalSpend:0,sourceFilesHashed:files.length,limitations:['Source checks are not DB runtime proof','No application implementation/deployment acceptance','No clinical calibration or physical-device GPU test']});
const diagrams = Object.fromEntries(readdirSync(resolve(packet,'diagrams')).filter(f=>f.endsWith('.mmd')).map(f=>[f,readFileSync(resolve(packet,'diagrams',f),'utf8')]));
const reviewPath=resolve(packet,'review.js');
writeFileSync(reviewPath,readFileSync(reviewPath,'utf8').replace(/^const diagrams = .*;$/m,()=>`const diagrams = ${JSON.stringify(diagrams)};`));
process.stdout.write(JSON.stringify({capturedAt:observedAt,sourceFiles:files.length,branch,head})+'\n');
