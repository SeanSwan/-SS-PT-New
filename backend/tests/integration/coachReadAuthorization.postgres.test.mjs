import { beforeAll, beforeEach, afterAll, afterEach, describe, expect, it, vi } from 'vitest';
import { DataTypes } from 'sequelize';
import jwt from 'jsonwebtoken';
import db from '../helpers/coachTestDatabase.mjs';
import express from 'express';
import request from 'supertest';

const mocks = vi.hoisted(() => ({
  createConversation: vi.fn(),
  findConversation: vi.fn(),
  query: vi.fn(),
  sendChatMessage: vi.fn(),
  providerGenerate: vi.fn(),
  getCoachProviderAdapter: vi.fn(),
  buildPromptMessages: vi.fn(),
  enrichWithUserData: vi.fn(),
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Real protect and JWT. Production model classes bind only to the fixed owned DB1.
vi.mock('../../models/index.mjs', async () => {
  const { default: database } = await import('../helpers/coachTestDatabase.mjs');
  const { default: User } = await import('../../models/User.mjs');
  const { default: Assignment } = await import('../../models/ClientTrainerAssignment.mjs');
  const { default: Permissions } = await import('../../models/TrainerPermissions.mjs');
  return {
    getUser:()=>User, getClientTrainerAssignment:()=>Assignment, getTrainerPermissions:()=>Permissions,
    getModel:name=>database.models[name], getAllModels:()=>database.models,
    getDailyWorkoutForm:()=>({count:vi.fn(async()=>0),findOne:vi.fn(async()=>null),create:mocks.createConversation}),
    getWorkoutLog:()=>({}),getWorkoutSession:()=>({}),getWorkoutPlan:()=>({}),getWorkoutPlanCompletionReceipt:()=>({}),getSession:()=>({}),getSessionType:()=>({}),getBodyMeasurement:()=>({}),getChallenge:()=>({}),getChallengeParticipant:()=>({}),getVariationLog:()=>({}),
  };
});

vi.mock('../../middleware/aiRateLimiter.mjs', () => ({
  aiRateLimiter: (_req, _res, next) => next(),
}));

vi.mock('../../middleware/requireSubscription.mjs', () => ({
  requireSubscription: () => (_req, _res, next) => next(),
}));

vi.mock('../../middleware/piiSanitizationMiddleware.mjs', () => ({
  strictPiiMiddleware: (_req, _res, next) => next(),
}));

vi.mock('../../database.mjs', async () => ({ default: (await import('../helpers/coachTestDatabase.mjs')).default }));

// AiConversation is the real model; no conversation storage mock.

vi.mock('../../services/aiChatService.mjs', () => ({
  getSystemPrompt: vi.fn(() => ''),
  buildPromptMessages: mocks.buildPromptMessages,
  sendChatMessage: mocks.sendChatMessage,
  getCoachProviderAdapter: mocks.getCoachProviderAdapter,
  enrichWithUserData: mocks.enrichWithUserData,
  getAIChatDiagnostics: vi.fn(),
  sanitizeAiChatMetadataForClient: vi.fn((value) => value),
  sanitizeAiFailoverTrace: vi.fn((value) => value),
}));

vi.mock('../../services/voiceTranscriptionService.mjs', () => ({
  transcribeAudio: vi.fn(),
  isAudioFile: vi.fn(() => true),
  checkAndRecordTranscription: vi.fn(),
}));

vi.mock('../../services/aiPrivacyService.mjs', () => ({
  stripIdentityFromMessage: vi.fn(async (message) => ({ sanitizedMessage: message, identitiesStripped: 0 })),
  stripIdentityFromResponse: vi.fn(async (message) => ({ sanitizedResponse: message, identitiesStripped: 0 })),
  scrubGenericPII: vi.fn(async (message) => ({ sanitizedText: message, piiRemoved: 0 })),
}));


vi.mock('../../services/ai/coachIntakeContextService.mjs', () => ({
  buildCoachIntakeContextPromptBlock: vi.fn(() => ''),
  buildCoachIntakeContextFromResult: vi.fn(() => null),
}));

vi.mock('../../services/nutrition/nutritionCareCopy.mjs', () => ({
  sanitizeNutritionChatCopy: vi.fn((value) => value),
}));

vi.mock('../../services/coachIntakeItemService.mjs', () => ({
  listUnifiedCoachIntakeItems: vi.fn(async () => []),
}));

vi.mock('../../services/coachIntakeHealthService.mjs', () => ({
  getCoachIntakeHealth: vi.fn(async () => null),
}));

vi.mock('../../services/coachIntakeRetentionPolicyService.mjs', () => ({
  getCoachIntakeRetentionReport: vi.fn(async () => null),
}));

vi.mock('../../services/coachIntakeRetentionPurgeService.mjs', () => ({
  purgeCoachIntakeRawArtifacts: vi.fn(async () => null),
}));

vi.mock('../../services/ai/coachActionProposalService.mjs', () => ({
  createCoachActionProposalsFromAiResponse: vi.fn(async () => ({ proposals: [], frontendActions: [] })),
}));

vi.mock('../../services/contentStudioCoverageService.mjs', () => ({
  buildSwanCoachCoveragePromptBlockFromModels: vi.fn(async () => ''),
}));

vi.mock('../../utils/logger.mjs', () => ({
  default: mocks.logger,
}));


vi.mock('../../services/awardWorkoutXP.mjs',()=>({awardWorkoutXP:vi.fn()}));
vi.mock('../../services/trainerSessionEarningService.mjs',()=>({accrueFlatSessionEarning:vi.fn()}));
vi.mock('../../services/badgeGamificationBridge.mjs',()=>({fireWorkoutBadgeChecks:vi.fn()}));
vi.mock('../../services/postSaveHandoffAssembler.mjs',()=>({safeAssemble:vi.fn()}));
vi.mock('../../services/workout/workoutPrDetectionService.mjs',()=>({detectAndRecordPersonalRecords:vi.fn()}));
const { default: User } = await import('../../models/User.mjs');
const { default: Conversation } = await import('../../models/AiConversation.mjs');
const { default: Assignment } = await import('../../models/ClientTrainerAssignment.mjs');
const { default: Permissions } = await import('../../models/TrainerPermissions.mjs');
const { default: chatRouter } = await import('../../routes/aiChatRoutes.mjs');
const { default: workoutRouter } = await import('../../routes/dailyWorkoutFormRoutes.mjs');
const app=express();app.use(express.json());app.use('/api/ai-chat',chatRouter);app.use('/api/workout-forms',workoutRouter);
const rawQuery=db.query.bind(db);
let Waiver;
const auth=()=>jwt.sign({id:7,tokenType:'access'},process.env.JWT_SECRET,{expiresIn:'1h'});
const get=(url,token=auth())=>request(app).get('/api/ai-chat'+url).set('Authorization','Bearer '+token);
const info=()=>request(app).get('/api/workout-forms/client/42/info').set('Authorization','Bearer '+auth());
const actor=(id,role)=>({id,role,firstName:'Synthetic',lastName:'Fixture',email:'g04ra-'+id+'@example.invalid',username:'g04ra-'+id,password:'synthetic-disabled-login',isActive:true,isLocked:false,timeZone:'UTC',timeZoneConfigured:true});
const thread=(over={})=>({id:9001,userId:7,role:'trainer',context:'coach_assistant',targetUserId:42,title:'SYNTHETIC PRIVATE TITLE',messages:[{role:'user',content:'SYNTHETIC PRIVATE MESSAGE'}],status:'active',messageCount:1,...over});
beforeAll(async()=>{
  vi.stubEnv('NODE_ENV','test');vi.stubEnv('JWT_SECRET','g04ra-synthetic-test-only-secret');
  await db.authenticate();
  const [identity]=await rawQuery('SELECT current_database() AS name');
  if(identity[0].name!=='coach_test_20260906')throw Error('Owned DB1 identity mismatch');
  // No reset here. Root must supply a verified clean, exclusive DB1 before run.
  await User.sync();await Assignment.sync();await Conversation.sync();await Permissions.sync();
  await rawQuery('CREATE TABLE sessions (id INTEGER PRIMARY KEY, "trainerId" INTEGER NOT NULL, "userId" INTEGER NOT NULL, status VARCHAR(30), "sessionDate" TIMESTAMPTZ)');
  Waiver=db.define('WaiverRecord',{id:{type:DataTypes.INTEGER,primaryKey:true,autoIncrement:true},userId:DataTypes.INTEGER,status:DataTypes.STRING,signedAt:DataTypes.DATE},{tableName:'g04ra_waivers',timestamps:false});await Waiver.sync();
});
beforeEach(async()=>{
  vi.clearAllMocks();
  await Conversation.destroy({where:{}});await Permissions.destroy({where:{}});await Assignment.destroy({where:{}});await Waiver.destroy({where:{}});await rawQuery('DELETE FROM sessions');await User.destroy({where:{},force:true});
  await User.bulkCreate([actor(7,'trainer'),actor(8,'admin'),actor(42,'client'),actor(43,'client')],{hooks:false,individualHooks:false});
  await Assignment.create({trainerId:7,clientId:42,status:'active',assignedBy:8});
  await Waiver.create({userId:7,status:'linked',signedAt:new Date()});
  await Conversation.create(thread());
});
afterEach(()=>vi.restoreAllMocks());
afterAll(async()=>{await db.close();vi.unstubAllEnvs();});

describe('G04RA real PostgreSQL model and protect/JWT boundaries',()=>{
  it('allows active assignment, then removes revoked titles/messages/admissions with the same token',async()=>{
    const token=auth();expect((await get('/conversations',token)).body.conversations).toHaveLength(1);expect((await get('/conversations/9001',token)).status).toBe(200);
    const receipt=await get('/target-access?conversationId=9001&targetUserId=42&audienceRole=trainer',token);
    expect(receipt.status).toBe(200);expect(receipt.body).toEqual({success:true,access:{scope:'coach_target_read',actorUserId:7,actorRole:'trainer',targetUserId:42,conversationId:9001}});expect(receipt.headers['cache-control']).toBe('no-store');expect(receipt.headers.vary).toContain('Authorization');expect(receipt.headers.etag).toBeUndefined();
    await Assignment.update({status:'inactive'},{where:{trainerId:7,clientId:42}});
    for(const suffix of ['/conversations','/conversations?audienceRole=trainer']){const res=await get(suffix,token);expect(res.status).toBe(200);expect(res.body.conversations).toEqual([]);expect(JSON.stringify(res.body)).not.toContain('PRIVATE');}
    for(const suffix of ['/conversations/9001','/target-access?targetUserId=42','/target-access?conversationId=9001']){const res=await get(suffix,token);expect(res.status).toBe(403);expect(JSON.stringify(res.body)).not.toContain('PRIVATE');}
  });
  it('preserves canonical self admission for the actual string actor attached by protect',async()=>{
    await Assignment.destroy({where:{}});const res=await get('/target-access?targetUserId=7');expect(res.status).toBe(200);expect(res.body.access).toMatchObject({actorUserId:7,targetUserId:7});
  });
  it('keeps recent qualifying real-session fallback after assignment removal',async()=>{
    await Assignment.destroy({where:{}});await rawQuery('INSERT INTO sessions VALUES (1,7,42,\'completed\',NOW() - INTERVAL \'1 day\')');
    expect((await get('/conversations/9001')).status).toBe(200);expect((await get('/target-access?targetUserId=42')).status).toBe(200);
  });
  it.each(['cancelled','requested','available','blocked'])('non-qualifying session status %s does not grant access',async status=>{
    await Assignment.destroy({where:{}});await rawQuery('INSERT INTO sessions VALUES (1,7,42,:status,NOW())',{replacements:{status}});expect((await get('/conversations/9001')).status).toBe(403);
  });
  it.each([null,new Date('2000-01-01')])('null/old session date does not grant access (%s)',async date=>{
    await Assignment.destroy({where:{}});await rawQuery('INSERT INTO sessions VALUES (1,7,42,\'completed\',:date)',{replacements:{date}});expect((await get('/target-access?targetUserId=42')).status).toBe(403);
  });
  it('current DB role demotion retires privileged historical audience with unchanged signed token',async()=>{
    const token=auth();await Conversation.update({role:'admin'},{where:{id:9001}});await User.update({role:'admin'},{where:{id:7}});expect((await get('/conversations/9001',token)).status).toBe(200);
    await User.update({role:'trainer'},{where:{id:7}});expect((await get('/conversations/9001',token)).status).toBe(404);expect((await get('/conversations',token)).body.conversations).toEqual([]);
    await User.update({role:'client'},{where:{id:7}});expect((await get('/target-access?targetUserId=7',token)).status).toBe(403);
  });
  it.each(['targetUserId','role','context'])('actual payload SQL rejects %s changed after metadata read',async field=>{
    const original=Conversation.findOne.bind(Conversation);let changed=false;
    vi.spyOn(Conversation,'findOne').mockImplementation(async opts=>{const value=await original(opts);if(!changed && opts.attributes && !opts.attributes.includes('messages')){changed=true;await Conversation.update({[field]:field==='targetUserId'?43:field==='role'?'client':'general'},{where:{id:9001}});}return value;});
    const res=await get('/conversations/9001');expect(res.status).toBe(404);expect(JSON.stringify(res.body)).not.toContain('PRIVATE');
  });
  it('revocation after actual payload read is caught by the final canonical check',async()=>{
    const original=Conversation.findOne.bind(Conversation);
    vi.spyOn(Conversation,'findOne').mockImplementation(async opts=>{const value=await original(opts);if(opts.attributes?.includes('messages'))await Assignment.update({status:'inactive'},{where:{trainerId:7,clientId:42}});return value;});
    const res=await get('/conversations/9001');expect(res.status).toBe(403);expect(JSON.stringify(res.body)).not.toContain('PRIVATE');
  });
  it('permission zero-row default and active grant remain allowed; configured withheld/expired/inactive deny',async()=>{
    expect((await info()).status).toBe(200);
    const grant=await Permissions.create({trainerId:7,permissionType:'edit_workouts',grantedBy:8,isActive:true});expect((await info()).status).toBe(200);
    await grant.update({isActive:false});expect((await info()).status).toBe(403);
    await rawQuery('UPDATE trainer_permissions SET "isActive"=true, "expiresAt"=NOW() - INTERVAL \'1 day\'');expect((await info()).status).toBe(403);
    await grant.destroy();await Permissions.create({trainerId:7,permissionType:'view_progress',grantedBy:8,isActive:true});expect((await info()).status).toBe(403);
  });
  it('real missing permission table denies info and submit before mutations; restores table in finally',async()=>{
    const before=await User.findByPk(42);const snapshot=before.toJSON();
    await rawQuery('ALTER TABLE trainer_permissions RENAME TO g04ra_permissions_unavailable');
    try{
      expect((await info()).status).toBe(403);
      const res=await request(app).post('/api/workout-forms').set('Authorization','Bearer '+auth()).send({clientId:42,date:'2026-09-12',exercises:[{exerciseName:'Synthetic',sets:[{reps:8,weight:20}]}]});expect(res.status).toBe(403);
    }finally{await rawQuery('ALTER TABLE g04ra_permissions_unavailable RENAME TO trainer_permissions');}
    expect((await User.findByPk(42)).toJSON()).toEqual(snapshot);expect(mocks.createConversation).not.toHaveBeenCalled();expect(mocks.sendChatMessage).not.toHaveBeenCalled();
  });
  it('real assignment verification outage fails entire read instead of returning filtered success',async()=>{
    await rawQuery('ALTER TABLE client_trainer_assignments RENAME TO g04ra_assignments_unavailable');
    try{for(const suffix of ['/conversations','/conversations/9001','/target-access?targetUserId=42']){const res=await get(suffix);expect(res.status).toBe(503);expect(res.body.code).toBe('COACH_READ_UNAVAILABLE');expect(JSON.stringify(res.body)).not.toContain('PRIVATE');}}finally{await rawQuery('ALTER TABLE g04ra_assignments_unavailable RENAME TO client_trainer_assignments');}
  });
  it('measures a 50-target real page: max4 active, max100 relationship SQL, sampled p95 under500ms',async()=>{
    await Conversation.destroy({where:{}});await Assignment.destroy({where:{}});
    await User.bulkCreate(Array.from({length:50},(_,i)=>actor(1000+i,'client')),{hooks:false,individualHooks:false});
    await Conversation.bulkCreate(Array.from({length:50},(_,i)=>thread({id:10000+i,targetUserId:1000+i})));
    let active=0,max=0,count=0;
    vi.spyOn(db,'query').mockImplementation(async(...args)=>{const relation=typeof args[0]==='string' && /SELECT 1 FROM (?:client_trainer_assignments|sessions)/.test(args[0]);if(relation){count++;active++;max=Math.max(max,active);}try{return await rawQuery(...args);}finally{if(relation)active--;}});
    const samples=[];
    for(let i=0;i<10;i++){
      count=0;max=0;const start=performance.now();const res=await get('/conversations?limit=50');samples.push(performance.now()-start);
      expect(res.status).toBe(200);expect(res.body.conversations).toEqual([]);expect(res.body).toMatchObject({total:null,totalIsExact:false,nextOffset:50,hasMore:null});expect(count).toBe(100);expect(max).toBeLessThanOrEqual(4);
    }
    const sorted=[...samples].sort((a,b)=>a-b);const p95=sorted[Math.ceil(sorted.length*.95)-1];
    console.log('[G04RA postgres metrics]',JSON.stringify({samplesMs:samples.map(v=>Math.round(v)),p95Ms:Math.round(p95),maxActive:max,relationshipSqlPerRequest:count,rows:50}));expect(p95).toBeLessThan(500);
  });
});
