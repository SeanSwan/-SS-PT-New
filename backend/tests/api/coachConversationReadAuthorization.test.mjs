import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';

const mocks = vi.hoisted(() => ({
  account: null, rows: [], findUser: vi.fn(), findAll: vi.fn(), findAndCountAll: vi.fn(),
  createConversation: vi.fn(),
  findConversation: vi.fn(),
  query: vi.fn(),
  sendChatMessage: vi.fn(),
  providerGenerate: vi.fn(),
  getCoachProviderAdapter: vi.fn(),
  buildPromptMessages: vi.fn(),
  enrichWithUserData: vi.fn(),
  metadataSanitizeCalls: [],
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Exercise real protect/JWT; only account/model storage is mocked.
vi.mock('../../models/index.mjs', () => ({
  getUser: () => ({ findByPk: mocks.findUser }),
  getModel: () => ({ findOne: vi.fn(async () => ({ status: 'linked' })) }),
  getAllModels: () => ({}),
}));

vi.mock('../../middleware/aiRateLimiter.mjs', () => ({
  aiRateLimiter: (_req, _res, next) => next(),
}));

vi.mock('../../middleware/requireSubscription.mjs', () => ({
  requireSubscription: () => (_req, _res, next) => next(),
}));

vi.mock('../../middleware/piiSanitizationMiddleware.mjs', () => ({
  strictPiiMiddleware: (_req, _res, next) => next(),
}));

vi.mock('../../database.mjs', () => ({
  default: {
    QueryTypes: { SELECT: 'SELECT' },
    query: mocks.query,
  },
}));

vi.mock('../../models/AiConversation.mjs', () => ({
  default: {
    create: mocks.createConversation,
    findAll: mocks.findAll,
    findAndCountAll: mocks.findAndCountAll,
    findOne: mocks.findConversation,
  },
}));

// The metadata sanitizer is the REAL export: a privacy assertion that runs
// against a mocked-as-identity sanitizer proves nothing about the sanitizer. Only
// the external/provider work is stubbed. Calls are recorded so a denied read can
// be shown to never reach payload sanitization at all.
vi.mock('../../services/aiChatService.mjs', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    getSystemPrompt: vi.fn(() => ''),
    buildPromptMessages: mocks.buildPromptMessages,
    sendChatMessage: mocks.sendChatMessage,
    getCoachProviderAdapter: mocks.getCoachProviderAdapter,
    enrichWithUserData: mocks.enrichWithUserData,
    getAIChatDiagnostics: vi.fn(),
    sanitizeAiChatMetadataForClient: (value) => {
      mocks.metadataSanitizeCalls.push(value);
      return actual.sanitizeAiChatMetadataForClient(value);
    },
  };
});

vi.mock('../../services/voiceTranscriptionService.mjs', () => ({
  transcribeAudio: vi.fn(),
  isAudioFile: vi.fn(() => true),
  checkAndRecordTranscription: vi.fn(),
}));

// Importing the real aiChatService (below) also pulls its real transitive
// dependencies, so the partial mocks in this file must still expose the pure
// exports those modules import. Missing exports are a harness failure, not a
// privacy result.
vi.mock('../../services/analyticsExerciseHistoryService.mjs', () => ({
  getExerciseHistoryFromLogs: vi.fn().mockResolvedValue({ exercises: [] }),
}));

vi.mock('../../services/aiPrivacyService.mjs', () => ({
  stripIdentityFromMessage: vi.fn(async (message) => ({ sanitizedMessage: message, identitiesStripped: 0 })),
  stripIdentityFromResponse: vi.fn(async (message) => ({ sanitizedResponse: message, identitiesStripped: 0 })),
  scrubGenericPII: vi.fn(async (message) => ({ sanitizedText: message, piiRemoved: 0 })),
  stripIdentityFromNotes: (note) => note,
}));


vi.mock('../../services/ai/coachIntakeContextService.mjs', () => ({
  buildCoachIntakeContextPromptBlock: vi.fn(() => ''),
  buildCoachIntakeContextFromResult: vi.fn(() => null),
}));

vi.mock('../../services/nutrition/nutritionCareCopy.mjs', async (importOriginal) => ({
  ...(await importOriginal()),
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


const { default: router } = await import('../../routes/aiChatRoutes.mjs');
let wire;
const app = express(); app.use(express.json());
app.use((req,res,next)=>{wire={req,res,abortedListeners:req.listenerCount('aborted')};next();});
app.use('/api/ai-chat', router);
const token = (extra = {}) => jwt.sign({ id: 7, tokenType: 'access', ...extra }, process.env.JWT_SECRET, extra.exp === undefined ? { expiresIn: '1h' } : {});
const get = (url, auth = token()) => request(app).get('/api/ai-chat'+url).set('Authorization', 'Bearer '+auth);
const row = (over = {}) => ({ id: 9001, userId: 7, role: 'trainer', status: 'active', targetUserId: 42,
  context: 'coach_assistant', title: 'SYNTHETIC PRIVATE TITLE', messages: [{ role:'user',content:'SYNTHETIC PRIVATE MESSAGE' }],
  messageCount: 1, metadata: {}, createdAt: new Date('2026-01-01'), lastMessageAt: null, ...over });
const plain = (r, attributes) => !r ? null : attributes ? Object.fromEntries(attributes.map(k => [k,r[k]])) : {...r};
// The model fake respects the important predicates; guards must also defend returned metadata.
function matches(r, where) {
  for (const key of ['id','userId','role','status','targetUserId','context']) {
    if (!(key in where)) continue;
    const value=where[key];
    if (value && typeof value==='object') {
      for (const sym of Object.getOwnPropertySymbols(value)) {
        if (sym.description==='in' && !value[sym].includes(r[key])) return false;
        if (sym.description==='ne' && r[key]===value[sym]) return false;
      }
    } else if (String(value)!==String(r[key])) return false;
  }
  return true;
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.metadataSanitizeCalls.length = 0;
  mocks.account={id:7,role:'trainer',isActive:true,isLocked:false}; mocks.rows=[row()];
  mocks.query.mockReset().mockResolvedValue([]);
  mocks.findUser.mockReset().mockImplementation(async (id,opts) => opts?.attributes ? {id:Number(id)} : {...mocks.account});
  mocks.findAll.mockReset().mockImplementation(async opts => mocks.rows.filter(r=>matches(r,opts.where)).slice(opts.offset,opts.offset+opts.limit).map(r=>plain(r,opts.attributes)));
  mocks.findAndCountAll.mockReset().mockImplementation(async opts => ({ rows:await mocks.findAll(opts),count:mocks.rows.length }));
  mocks.findConversation.mockReset().mockImplementation(async opts => plain(mocks.rows.find(r=>matches(r,opts.where)),opts.attributes));
});

describe('G04RA real protect/JWT, current conversation reads (API models mocked)', () => {
  it('omits an owned conversation after canonical target access is revoked',async()=>{
    const res=await get('/conversations'); expect(res.status).toBe(200);
    expect(res.body.conversations).toEqual([]); expect(JSON.stringify(res.body)).not.toContain('PRIVATE');
    expect(res.body).toMatchObject({total:null,totalIsExact:false,nextOffset:null,hasMore:false});
  });
  it('denies owned detail before reading message payload when target is revoked',async()=>{
    const res=await get('/conversations/9001'); expect(res.status).toBe(403);
    expect(res.body.code).toBe('COACH_TARGET_ACCESS_DENIED'); expect(JSON.stringify(res.body)).not.toContain('PRIVATE');
    expect(mocks.findConversation.mock.calls.every(([o])=>o.attributes && !o.attributes.includes('messages'))).toBe(true);
  });
  it('denies target-only admission using canonical access',async()=>{
    const res=await get('/target-access?targetUserId=42'); expect(res.status).toBe(403);
    expect(res.body.code).toBe('COACH_TARGET_ACCESS_DENIED');
  });
  it('returns only the exact no-data receipt for an assigned target',async()=>{
    mocks.query.mockResolvedValue([{one:1}]);
    const res=await get('/target-access?targetUserId=42&audienceRole=trainer');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({success:true,access:{scope:'coach_target_read',actorUserId:7,actorRole:'trainer',targetUserId:42,conversationId:null}});
    expect(res.headers['cache-control']).toBe('no-store'); expect(res.headers.vary).toContain('Authorization');
    expect(mocks.findUser).toHaveBeenLastCalledWith(42,expect.objectContaining({attributes:['id']}));
  });
  it('supports explicit unscoped staff admission without substituting actor',async()=>{
    const res=await get('/target-access'); expect(res.status).toBe(200);
    expect(res.body.access.targetUserId).toBeNull(); expect(mocks.query).not.toHaveBeenCalled();
  });
  it('resolves thread-only admission and refuses explicit target conflict',async()=>{
    mocks.query.mockResolvedValue([{one:1}]);
    const res=await get('/target-access?conversationId=9001'); expect(res.status).toBe(200); expect(res.body.access).toMatchObject({targetUserId:42,conversationId:9001});
    const conflict=await get('/target-access?conversationId=9001&targetUserId=43');
    expect(conflict.status).toBe(400); expect(conflict.body.code).toBe('COACH_TARGET_CONFLICT');
  });
  it.each(['targetUserId=','targetUserId=01','targetUserId=%2042','targetUserId=1e2','targetUserId=1.5','targetUserId=-1','targetUserId=9007199254740992','targetUserId=42&targetUserId=43','targetUserId[x]=42','audienceRole=','audienceRole=trainer&audienceRole=client','extra=value'])('rejects malformed admission query %s',async query=>{
    const res=await get('/target-access?'+query); expect(res.status).toBe(400); expect(res.body.code).toBe('INVALID_COACH_READ_REQUEST');
  });
  it('uses current role from DB even if the same signed token predates demotion',async()=>{
    const sameToken=token({role:'admin'}); mocks.account.role='client';
    const res=await get('/conversations/9001',sameToken); expect([403,404]).toContain(res.status); expect(JSON.stringify(res.body)).not.toContain('PRIVATE');
    const list=await get('/conversations',sameToken); expect(list.status).toBe(200); expect(list.body.conversations).toEqual([]);
    expect((await get('/target-access?targetUserId=7',sameToken)).status).toBe(403);
  });
  it.each(['isActive','isLocked'])('real protect blocks inactive/locked account (%s)',async field=>{
    mocks.account[field]=field==='isLocked'; const res=await get('/conversations'); expect(res.status).toBe(403); expect(mocks.findAll).not.toHaveBeenCalled();
  });
  it('real protect rejects missing/expired/wrong-type authentication before reads',async()=>{
    expect((await request(app).get('/api/ai-chat/conversations')).status).toBe(401);
    expect((await get('/conversations',token({exp:1}))).status).toBe(401);
    expect((await get('/conversations',token({tokenType:'refresh'}))).status).toBe(401);
    expect(mocks.findAll).not.toHaveBeenCalled();
  });
  it('filters mixed pages without replacing denied rows or reporting global counts',async()=>{
    mocks.rows=[row(),row({id:9002,targetUserId:43}),row({id:9003,targetUserId:43})];
    mocks.query.mockImplementation(async (_sql,{replacements})=>replacements.clientId===43?[{one:1}]:[]);
    const res=await get('/conversations?limit=3'); expect(res.status).toBe(200);
    expect(res.body.conversations.map(r=>r.id)).toEqual([9002,9003]);
    expect(res.body).toMatchObject({total:null,totalIsExact:false,nextOffset:3,hasMore:null});
    expect(mocks.findAll).toHaveBeenCalledTimes(1); expect(mocks.findAndCountAll).not.toHaveBeenCalled();
    expect(mocks.query.mock.calls.filter(([,opts])=>opts.replacements.clientId===43)).toHaveLength(1);
  });
  it('fails the whole list on verification outage without private details',async()=>{
    mocks.query.mockRejectedValue(new Error('SYNTHETIC PRIVATE database error'));
    const res=await get('/conversations'); expect(res.status).toBe(503); expect(res.body.code).toBe('COACH_READ_UNAVAILABLE'); expect(JSON.stringify(res.body)).not.toContain('PRIVATE');
  });
  it.each(['limit=0','limit=51','limit=1e1','limit=1&limit=2','offset=-1','offset=01','offset=10001'])('rejects malformed paging %s',async query=>{
    expect((await get('/conversations?'+query)).status).toBe(400); expect(mocks.findAll).not.toHaveBeenCalled();
  });
  it('does not call providers or mutation APIs for authorized reads',async()=>{
    mocks.query.mockResolvedValue([{one:1}]); const res=await get('/conversations/9001'); expect(res.status).toBe(200);
    expect(mocks.sendChatMessage).not.toHaveBeenCalled(); expect(mocks.providerGenerate).not.toHaveBeenCalled(); expect(mocks.createConversation).not.toHaveBeenCalled();
  });
});


describe('G04RA bounded work, lifecycle and publication',()=>{
  it.each([{targetUserId:'broken'},{targetUserId:undefined},{targetUserId:0}])('malformed stored target is never unscoped: %j',async over=>{
    mocks.rows=[row(over)];
    const list=await get('/conversations');expect(list.status).toBe(200);expect(list.body.conversations).toEqual([]);
    expect((await get('/conversations/9001')).status).toBe(404);expect((await get('/target-access?conversationId=9001')).status).toBe(404);expect(mocks.query).not.toHaveBeenCalled();
  });
  it.each([{userId:8},{status:'deleted'}])('foreign/deleted metadata is unavailable: %j',async over=>{
    mocks.rows=[row(over)];expect((await get('/conversations/9001')).status).toBe(404);expect((await get('/target-access?conversationId=9001')).status).toBe(404);expect(mocks.query).not.toHaveBeenCalled();
  });
  it('permits owned archived detail and unscoped staff without granting another role',async()=>{
    mocks.rows=[row({status:'archived',targetUserId:null})];
    expect((await get('/conversations/9001')).status).toBe(200);
    const list=await get('/conversations?status=archived');expect(list.body.conversations).toHaveLength(1);expect(mocks.query).not.toHaveBeenCalled();
    expect((await get('/target-access?conversationId=9001&targetUserId=42')).body.code).toBe('COACH_TARGET_CONFLICT');
  });
  it('client readers get only owned self-target permitted audience and cannot use staff admission',async()=>{
    mocks.account.role='client';mocks.rows=[row({role:'client',targetUserId:7}),row({id:9002,role:'client',targetUserId:42}),row({id:9003,role:'client',targetUserId:null})];
    const list=await get('/conversations');
    // HR15-R1/R2: 9001 is explicit-self and 9003 is the stored-null shape a
    // normal client create produces. Both are the client's own readable threads;
    // 9002 targets a different client and stays out.
    expect(list.body.conversations.map(r=>r.id)).toEqual([9001,9003]);expect((await get('/conversations/9001')).status).toBe(200);expect((await get('/conversations/9003')).status).toBe(200);expect((await get('/conversations/9002')).status).toBe(404);
    expect((await get('/target-access?targetUserId=7')).status).toBe(403);
  });
  it.each(['admin','unknown','trainer&audienceRole=client',''])('denies or rejects invalid current audience %s',async audience=>{
    const res=await get('/conversations?audienceRole='+audience);expect([400,403]).toContain(res.status);expect(mocks.findAll).not.toHaveBeenCalled();
  });
  it.each(['targetUserId','role','context'])('binds the payload query and rejects changed %s',async field=>{
    mocks.query.mockResolvedValue([{one:1}]);
    const original=row();const changed={...original,[field]:field==='targetUserId'?43:field==='role'?'client':'general'};
    mocks.findConversation.mockImplementation(async opts=>opts.attributes.includes('messages')?changed:plain(original,opts.attributes));
    const res=await get('/conversations/9001');expect(res.status).toBe(404);expect(JSON.stringify(res.body)).not.toContain('PRIVATE');
    expect(mocks.findConversation.mock.calls[1][0].where).toEqual({id:9001,userId:7,role:'trainer',status:'active',targetUserId:42,context:'coach_assistant'});
  });
  it('reauthorizes after payload read instead of reusing the first successful decision',async()=>{
    let granted=true;
    mocks.query.mockImplementation(async()=>granted?[{one:1}]:[]);
    mocks.findConversation.mockImplementation(async opts=>{if(opts.attributes.includes('messages'))granted=false;return plain(row(),opts.attributes);});
    const res=await get('/conversations/9001');expect(res.status).toBe(403);expect(res.body.code).toBe('COACH_TARGET_ACCESS_DENIED');expect(JSON.stringify(res.body)).not.toContain('PRIVATE');expect(mocks.query).toHaveBeenCalledTimes(3);
  });
  it('fails target existence model errors safely and checks only ID after authorization',async()=>{
    mocks.query.mockResolvedValue([{one:1}]);mocks.findUser.mockImplementation(async(_id,opts)=>{if(opts?.attributes)throw new Error('SYNTHETIC PRIVATE ERROR');return mocks.account;});
    const res=await get('/target-access?targetUserId=42');expect(res.status).toBe(503);expect(JSON.stringify(res.body)).not.toContain('PRIVATE');
  });
  it('returns target-not-found only after a successful target check',async()=>{
    mocks.query.mockResolvedValue([{one:1}]);mocks.findUser.mockImplementation(async(_id,opts)=>opts?.attributes?null:mocks.account);
    const res=await get('/target-access?targetUserId=42');expect(res.status).toBe(404);expect(res.body.code).toBe('COACH_TARGET_NOT_FOUND');
  });
  it('never emits ETag or a conditional 304 admission shortcut',async()=>{
    const first=await get('/target-access');expect(first.status).toBe(200);expect(first.headers.etag).toBeUndefined();
    const again=await get('/target-access').set('If-None-Match','*');expect(again.status).toBe(200);expect(again.body.access.scope).toBe('coach_target_read');
  });
  it('caps 50 distinct targets at four active checks and 100 SQL calls without refilling',async()=>{
    mocks.rows=Array.from({length:50},(_,i)=>row({id:9001+i,targetUserId:1000+i}));
    let active=0,max=0;
    mocks.query.mockImplementation(async()=>{active++;max=Math.max(max,active);await new Promise(r=>setTimeout(r,2));active--;return [];});
    const started=performance.now();const res=await get('/conversations?limit=50');const elapsed=performance.now()-started;
    expect(res.status).toBe(200);expect(res.body).toMatchObject({conversations:[],nextOffset:50,hasMore:null,total:null,totalIsExact:false});expect(mocks.findAll).toHaveBeenCalledTimes(1);expect(mocks.query).toHaveBeenCalledTimes(100);expect(max).toBe(4);
    expect(mocks.findAll.mock.calls[0][0].order).toEqual([['lastMessageAt','DESC NULLS LAST'],['createdAt','DESC'],['id','DESC']]);
    console.log('[G04RA mocked bounds]',JSON.stringify({rows:50,sqlCalls:100,maxActive:max,elapsedMs:Math.round(elapsed)}));
  });
  it('does not emit a cursor beyond offset10000 even for a full source page',async()=>{
    mocks.findAll.mockResolvedValue(Array.from({length:50},(_,i)=>row({id:9001+i,targetUserId:7})));
    const res=await get('/conversations?limit=50&offset=10000');expect(res.status).toBe(200);expect(res.body.conversations).toHaveLength(50);expect(res.body.nextOffset).toBeNull();expect(res.body.hasMore).toBeNull();
  });
  it('stops launching work on verification error but does not expose raw error/log content',async()=>{
    mocks.rows=Array.from({length:50},(_,i)=>row({id:9001+i,targetUserId:1000+i}));
    const waiting=[];
    mocks.query.mockImplementation(async(_sql,opts)=>{if(opts.replacements.clientId===1000)throw new Error('SYNTHETIC PRIVATE DB PASSWORD');return await new Promise(resolve=>waiting.push(resolve));});
    const res=await get('/conversations?limit=50');expect(res.status).toBe(503);expect(mocks.query.mock.calls.length).toBeLessThanOrEqual(4);expect(JSON.stringify(res.body)).not.toContain('PRIVATE');
    expect(JSON.stringify(mocks.logger.error.mock.calls)).not.toContain('PRIVATE');
    waiting.forEach(resolve=>resolve([]));await new Promise(resolve=>setImmediate(resolve));expect(mocks.query.mock.calls.length).toBeLessThanOrEqual(4);
  });
  it('expires the 3-second budget, prevents follow-on SQL/publication, then permits a fresh retry',async()=>{
    let release; mocks.query.mockImplementation(()=>new Promise(resolve=>{release=resolve;}));
    const started=performance.now();const res=await get('/conversations');const elapsed=performance.now()-started;
    expect(res.status).toBe(503);expect(res.body.code).toBe('COACH_READ_UNAVAILABLE');expect(elapsed).toBeGreaterThanOrEqual(2900);expect(elapsed).toBeLessThan(3800);expect(mocks.query).toHaveBeenCalledTimes(1);
    release([]);await new Promise(resolve=>setImmediate(resolve));expect(mocks.query).toHaveBeenCalledTimes(1);expect(wire.req.listenerCount('aborted')).toBe(wire.abortedListeners);
    mocks.query.mockResolvedValue([{one:1}]);expect((await get('/conversations')).status).toBe(200);
  });
  it('retires a disconnected response and does not launch fallback SQL when the driver finishes',async()=>{
    let release;mocks.query.mockImplementation(()=>new Promise(resolve=>{release=resolve;}));
    const pending=get('/conversations').then(()=>null,error=>error);
    await vi.waitFor(()=>expect(mocks.query).toHaveBeenCalledTimes(1));
    const end=vi.spyOn(wire.res,'end');wire.res.destroy();await pending;
    release([]);await new Promise(resolve=>setImmediate(resolve));expect(mocks.query).toHaveBeenCalledTimes(1);expect(end).not.toHaveBeenCalled();expect(wire.req.listenerCount('aborted')).toBe(wire.abortedListeners);
  });
});

// Behavioural replacement for the obsolete aiChatRoutes source guard
// ("routes all client-visible metadata through the sanitizer"). These run the
// mounted router with the REAL sanitizer, so a route that stopped sanitizing —
// or persisted raw failover text — fails here.
const PRIVATE_DETAIL = 'SYNTHETIC_PRIVATE_PROVIDER_DETAIL';
const SAFE_METADATA = { responseStyle: 'concise', lastProvider: 'fallback' };

describe('G04RA failover-trace metadata privacy through the mounted router', () => {
  it('sanitizes stored failover metadata on an authorized detail read without mutating the record',async()=>{
    mocks.query.mockResolvedValue([{one:1}]);
    const stored={...SAFE_METADATA,failoverTrace:[`gemini:401 ${PRIVATE_DETAIL} sk-proj-secret rejected`,'openai:success']};
    mocks.rows=[row({metadata:stored})];

    const res=await get('/conversations/9001');
    expect(res.status).toBe(200);
    expect(res.body.conversation.metadata).toEqual({...SAFE_METADATA,failoverTrace:['gemini:provider_error','openai:success']});
    expect(JSON.stringify(res.body)).not.toContain(PRIVATE_DETAIL);
    expect(JSON.stringify(res.body)).not.toMatch(/sk-proj|401/);
    // A read must not rewrite the caller's stored value; the sanitizer copies.
    expect(stored.failoverTrace[0]).toContain(PRIVATE_DETAIL);
    expect(mocks.metadataSanitizeCalls).toHaveLength(1);
  });

  it('keeps a denied detail read away from the payload and the metadata sanitizer',async()=>{
    mocks.query.mockResolvedValue([]);
    mocks.rows=[row({metadata:{failoverTrace:[`gemini:503 ${PRIVATE_DETAIL}`]}})];

    const res=await get('/conversations/9001');
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('COACH_TARGET_ACCESS_DENIED');
    expect(JSON.stringify(res.body)).not.toContain(PRIVATE_DETAIL);
    expect(JSON.stringify(res.body)).not.toContain('PRIVATE');
    expect(mocks.metadataSanitizeCalls).toHaveLength(0);
    expect(mocks.findConversation.mock.calls.every(([o])=>o.attributes
      && !o.attributes.includes('messages') && !o.attributes.includes('metadata'))).toBe(true);
  });

  it('sanitizes failover metadata before the message route persists the conversation',async()=>{
    mocks.query.mockImplementation(async(sql)=>String(sql).includes('ai_privacy_profiles')
      ?[{aiEnabled:true,withdrawnAt:null}]:[{one:1}]);
    // The stored record already carries a RAW trace, so the persisted result is
    // only clean if the route re-sanitizes the failover metadata it writes.
    const record=row({context:'general',metadata:{...SAFE_METADATA,failoverTrace:[`anthropic:500 ${PRIVATE_DETAIL}`]}});
    record.update=vi.fn(async(patch)=>{Object.assign(record,patch);});
    mocks.findConversation.mockImplementation(async opts=>opts?.attributes?plain(record,opts.attributes):record);
    mocks.sendChatMessage.mockResolvedValue({ok:true,content:'Logged it.',provider:'openai',
      model:'synthetic-model',tokenUsage:null,failoverTrace:[`gemini:401 ${PRIVATE_DETAIL}`,'openai:success']});

    const res=await request(app).post('/api/ai-chat/conversations/9001/messages')
      .set('Authorization','Bearer '+token()).send({message:'log my squat session'});

    expect(res.status).toBe(200);
    expect(record.update).toHaveBeenCalledTimes(1);
    const patch=record.update.mock.calls[0][0];
    expect(patch.metadata.failoverTrace).toEqual(['gemini:provider_error','openai:success']);
    expect(patch.metadata).toMatchObject({responseStyle:'concise',lastProvider:'openai'});
    expect(JSON.stringify(patch)).not.toContain(PRIVATE_DETAIL);
    expect(JSON.stringify(res.body)).not.toContain(PRIVATE_DETAIL);

    // The persisted record is then readable through the real detail route.
    mocks.rows=[record];
    const read=await get('/conversations/9001');
    expect(read.status).toBe(200);
    expect(read.body.conversation.metadata.failoverTrace).toEqual(['gemini:provider_error','openai:success']);
    expect(JSON.stringify(read.body)).not.toContain(PRIVATE_DETAIL);
  });
});

// HR15 (plan 65): POST /api/ai-chat/conversations omits targetUserId for a
// client thread, so a normally created client conversation is stored with an
// explicit null target (aiChatRoutes.mjs:391-436). These run the mounted router
// with real protect/JWT, the real read helper, the real canonical client access
// gate and the real metadata sanitizer; only model storage is mocked, exactly as
// the suites above do. The stored null and an explicit self ID are distinct
// representations and must both survive to the response unchanged.
describe('HR15 client self-conversation read compatibility', () => {
  const asClient = () => { mocks.account = { id: 7, role: 'client', isActive: true, isLocked: false }; };
  const ownRow = (over = {}) => row({ id: 13, userId: 7, role: 'client', targetUserId: null,
    title: 'SYNTHETIC HR15 OWN THREAD', ...over });
  const createOwnThread = async () => {
    mocks.createConversation.mockImplementation(async payload => ({
      id: 13, ...payload,
      targetUserId: payload.targetUserId === undefined ? null : payload.targetUserId,
      status: 'active', messageCount: 0, lastMessageAt: null, createdAt: new Date('2026-09-12'),
    }));
    const created = await request(app).post('/api/ai-chat/conversations')
      .set('Authorization', 'Bearer ' + token())
      .send({ context: 'coach_assistant', audienceRole: 'client', title: 'SYNTHETIC HR15 OWN THREAD' });
    return created;
  };

  it('HR15-R1/T01 lists and opens the normally created null-target client thread with the stored null intact', async () => {
    asClient();
    const created = await createOwnThread();
    expect(created.status).toBe(201);
    expect(created.body.conversation).toMatchObject({ id: 13, role: 'client', targetUserId: null });
    // The normal create never sends a target for a client actor: the stored null
    // is the real shape, not a synthetic fixture choice.
    expect(mocks.createConversation.mock.calls[0][0]).not.toHaveProperty('targetUserId');
    mocks.rows = [ownRow()];

    const detail = await get('/conversations/13?audienceRole=client');
    expect(detail.body.code).toBeUndefined();
    expect(detail.status).toBe(200);
    expect(detail.body.conversation).toMatchObject({ id: 13, role: 'client', targetUserId: null });
    expect(detail.body.conversation.messages).toEqual(ownRow().messages);
    expect(detail.headers['cache-control']).toBe('no-store');
    expect(JSON.stringify(detail.body)).not.toContain('accessTarget');

    const list = await get('/conversations?status=active&limit=50&audienceRole=client');
    expect(list.status).toBe(200);
    const listed = list.body.conversations.find(item => item.id === 13);
    expect(listed).toBeDefined();
    expect(listed.targetUserId).toBeNull();
    expect(list.headers['cache-control']).toBe('no-store');
    expect(list.headers.vary).toContain('Authorization');

    // Client self access is the canonical gate's `self` branch: no relationship SQL.
    expect(mocks.query).not.toHaveBeenCalled();
  });

  it('HR15-R1 archives stay readable for the same owner', async () => {
    asClient();
    mocks.rows = [ownRow({ status: 'archived' })];
    const list = await get('/conversations?status=archived&audienceRole=client');
    expect(list.body.conversations.map(item => item.id)).toEqual([13]);
    expect((await get('/conversations/13')).status).toBe(200);
    expect(mocks.query).not.toHaveBeenCalled();
  });

  it('HR15-R2 keeps explicit-self readable and distinct from stored null', async () => {
    asClient();
    mocks.rows = [ownRow(), ownRow({ id: 14, targetUserId: 7, title: 'SYNTHETIC HR15 EXPLICIT SELF' })];
    const list = await get('/conversations?limit=50&audienceRole=client');
    expect(list.body.conversations.map(item => [item.id, item.targetUserId])).toEqual([[13, null], [14, 7]]);
    expect((await get('/conversations/13')).body.conversation.targetUserId).toBeNull();
    expect((await get('/conversations/14')).body.conversation.targetUserId).toBe(7);
    expect(mocks.query).not.toHaveBeenCalled();
  });

  it('HR15-R3/T02 denies a foreign owner, another target, a staff-role thread and malformed targets', async () => {
    asClient();
    const deniedRow = (over = {}) => ownRow({ title: 'SYNTHETIC PRIVATE DENIED THREAD', ...over });
    mocks.rows = [ownRow(), deniedRow({ id: 21, userId: 8 }), deniedRow({ id: 22, targetUserId: 99 }),
      deniedRow({ id: 23, role: 'trainer' }), deniedRow({ id: 24, status: 'deleted' }),
      deniedRow({ id: 31, targetUserId: undefined }), deniedRow({ id: 32, targetUserId: 0 }), deniedRow({ id: 33, targetUserId: 'broken' })];
    const list = await get('/conversations?limit=50&audienceRole=client');
    expect(list.status).toBe(200);
    expect(list.body.conversations.map(item => item.id)).toEqual([13]);
    expect(JSON.stringify(list.body)).not.toContain('PRIVATE');
    for (const denied of [21, 22, 23, 24, 31, 32, 33]) {
      const res = await get('/conversations/' + denied);
      expect(res.status).toBe(404);
      expect(res.body.code).toBe('COACH_CONVERSATION_NOT_FOUND');
      expect(JSON.stringify(res.body)).not.toContain('PRIVATE');
    }
    // A denied metadata row never reaches the payload read or the sanitizer.
    expect(mocks.findConversation.mock.calls.every(([opts]) => opts.attributes && !opts.attributes.includes('messages'))).toBe(true);
    expect(mocks.metadataSanitizeCalls).toHaveLength(0);
    expect(mocks.query).not.toHaveBeenCalled();
  });

  it('HR15-R3 never aliases a raw user actor into the client audience', async () => {
    mocks.account = { id: 7, role: 'user', isActive: true, isLocked: false };
    mocks.rows = [ownRow()];
    const list = await get('/conversations');
    expect(list.status).toBe(200);
    expect(list.body.conversations).toEqual([]);
    expect((await get('/conversations/13')).status).toBe(404);
    expect(mocks.query).not.toHaveBeenCalled();
  });

  it('HR15-R4/R7 leaves staff unscoped and canonical trainer checks unchanged', async () => {
    mocks.rows = [row({ id: 41, targetUserId: null }), row({ id: 42, targetUserId: 43 })];
    mocks.query.mockImplementation(async (_sql, { replacements }) => replacements.clientId === 43 ? [{ one: 1 }] : []);
    const list = await get('/conversations?limit=50');
    expect(list.body.conversations.map(item => item.id)).toEqual([41, 42]);
    expect(mocks.query).toHaveBeenCalledTimes(1);
    expect(mocks.sendChatMessage).not.toHaveBeenCalled();
    expect(mocks.createConversation).not.toHaveBeenCalled();
  });

  it('HR15-R5/T02 keeps client staff-target admission denied for unscoped, thread and self requests', async () => {
    asClient();
    mocks.rows = [ownRow()];
    for (const url of ['/target-access', '/target-access?conversationId=13',
      '/target-access?targetUserId=7', '/target-access?conversationId=13&audienceRole=client']) {
      const res = await get(url);
      expect(res.status).toBe(403);
      expect(res.body.code).toBe('COACH_READ_FORBIDDEN');
      expect(JSON.stringify(res.body)).not.toContain('coach_target_read');
    }
    expect(mocks.query).not.toHaveBeenCalled();
  });

  it('HR15-R6/T04 treats a mid-read null-to-self or self-to-null change as stale without payload', async () => {
    asClient();
    for (const [stored, changed] of [[null, 7], [7, null]]) {
      mocks.findConversation.mockClear();
      mocks.metadataSanitizeCalls.length = 0;
      mocks.rows = [ownRow({ targetUserId: stored })];
      mocks.findConversation.mockImplementation(async opts => opts.attributes.includes('messages')
        ? plain(ownRow({ targetUserId: changed }), opts.attributes)
        : plain(mocks.rows[0], opts.attributes));
      const res = await get('/conversations/13');
      expect(res.status).toBe(404);
      expect(res.body.code).toBe('COACH_CONVERSATION_NOT_FOUND');
      expect(JSON.stringify(res.body)).not.toContain('SYNTHETIC');
      // The payload predicate still binds the ORIGINAL stored representation.
      expect(mocks.findConversation.mock.calls[1]?.[0].where.targetUserId).toBe(stored);
      expect(mocks.metadataSanitizeCalls).toHaveLength(0);
      expect(mocks.query).not.toHaveBeenCalled();
    }
  });
});
