import { beforeEach, describe, expect, it, vi } from 'vitest';
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

vi.mock('../../middleware/authMiddleware.mjs', () => ({
  protect: (req, _res, next) => {
    req.user = {
      id: Number(req.get('x-test-user-id') || 7),
      role: req.get('x-test-user-role') || 'admin',
    };
    next();
  },
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
    findAll: vi.fn(),
    findOne: mocks.findConversation,
  },
}));

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

const { default: aiChatRoutes } = await import('../../routes/aiChatRoutes.mjs');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/ai-chat', aiChatRoutes);
  return app;
}

function mockCreatedConversation(payload) {
  return {
    id: 9001,
    title: payload.title,
    context: payload.context,
    role: payload.role,
    status: payload.status,
    targetUserId: payload.targetUserId ?? null,
    messageCount: payload.messageCount,
  };
}

describe('AI chat conversation target guard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.AI_CHAT_CLIENT_ACCESS_SOFT;
    mocks.findConversation.mockReset();
    mocks.sendChatMessage.mockReset();
    mocks.getCoachProviderAdapter.mockReset().mockReturnValue({name:"gemini",generate:mocks.providerGenerate});
    mocks.providerGenerate.mockReset().mockImplementation(async(...args)=>({ok:true,...await mocks.sendChatMessage(...args)}));
    mocks.buildPromptMessages.mockReset();
    mocks.buildPromptMessages.mockImplementation((_system, history, current) => [...history, { role: 'user', content: current }]);
    mocks.enrichWithUserData.mockReset();
    mocks.enrichWithUserData.mockResolvedValue('');
    mocks.createConversation.mockImplementation(async (payload) => mockCreatedConversation(payload));
    mocks.query.mockResolvedValue([]);
    mocks.sendChatMessage.mockResolvedValue({
      content: 'Your next training step is ready.',
      provider: 'test-provider',
      model: 'test-model',
      tokenUsage: null,
      failoverTrace: [],
    });
  });

  it('allows a client to create an owned Coach conversation without accepting a target user', async () => {
    const response = await request(buildApp())
      .post('/api/ai-chat/conversations')
      .set('x-test-user-id', '21')
      .set('x-test-user-role', 'client')
      .send({ context: 'coach_assistant', targetUserId: '42' });
    expect(response.status).toBe(201);
    expect(mocks.createConversation).toHaveBeenCalledWith(expect.objectContaining({
      userId: 21,
      role: 'client',
      context: 'coach_assistant',
    }));
    expect(mocks.createConversation.mock.calls[0][0]).not.toHaveProperty('targetUserId');
  });

  it('allows a client to message only an owned Coach conversation', async () => {
    const update = vi.fn();
    mocks.findConversation.mockResolvedValue({
      id: 9001,
      userId: 21,
      role: 'client',
      context: 'coach_assistant',
      targetUserId: null,
      title: null,
      messages: [],
      metadata: { responseStyle: 'both' },
      update,
    });

    const response = await request(buildApp())
      .post('/api/ai-chat/conversations/9001/messages')
      .set('x-test-user-id', '21')
      .set('x-test-user-role', 'client')
      .send({ message: 'What should I train next?' });
    expect(response.status).toBe(200);
    expect(mocks.findConversation).toHaveBeenCalledWith({
      where: { id: '9001', userId: 21, status: 'active' },
    });
    expect(mocks.sendChatMessage).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledTimes(1);
  });

  it('redacts accessible client identities from unpinned staff message, history, and response prompts', async () => {
    const update = vi.fn();
    mocks.findConversation.mockResolvedValue({
      id: 9001,
      userId: 7,
      role: 'admin',
      context: 'coach_assistant',
      targetUserId: null,
      title: null,
      messages: [{ role: 'user', content: 'Jackie Reed prefers mornings' }],
      metadata: { responseStyle: 'both' },
      update,
    });
    mocks.query.mockImplementation(async (sql) => {
      if (/ai_privacy_profiles/i.test(sql)) return [];
      return [{
        id: 61,
        firstName: 'Jackie',
        lastName: 'Reed',
        email: 'jackie.reed@example.com',
        phone: '555-123-4567',
      }];
    });
    mocks.sendChatMessage.mockResolvedValue({
      content: 'Jackie Reed can train tomorrow.',
      provider: 'test-provider',
      model: 'test-model',
      tokenUsage: null,
      failoverTrace: [],
    });

    const response = await request(buildApp())
      .post('/api/ai-chat/conversations/9001/messages')
      .set('x-test-user-id', '7')
      .set('x-test-user-role', 'admin')
      .send({ message: 'Schedule Jackie Reed tomorrow' });

    expect(response.status).toBe(200);
    const [, promptHistory, currentMessage] = mocks.buildPromptMessages.mock.calls[0];
    expect(currentMessage).toBe('Schedule Client #61 tomorrow');
    expect(JSON.stringify(promptHistory)).not.toContain('Jackie Reed');
    expect(response.body.assistantMessage.content).toBe('Client #61 can train tomorrow.');
    expect(mocks.sendChatMessage).toHaveBeenCalledTimes(1);
  });

  it('fails closed before the provider when unpinned staff identity lookup fails', async () => {
    mocks.findConversation.mockResolvedValue({
      id: 9001,
      userId: 7,
      role: 'admin',
      context: 'coach_assistant',
      targetUserId: null,
      title: null,
      messages: [],
      metadata: { responseStyle: 'both' },
      update: vi.fn(),
    });
    mocks.query.mockImplementation(async (sql) => {
      if (/ai_privacy_profiles/i.test(sql)) return [];
      throw new Error('database unavailable');
    });

    const response = await request(buildApp())
      .post('/api/ai-chat/conversations/9001/messages')
      .set('x-test-user-role', 'admin')
      .send({ message: 'Schedule Jackie Reed tomorrow' });

    expect(response.status).toBe(503);
    expect(response.body.code).toBe('AI_IDENTITY_REDACTION_UNAVAILABLE');
    expect(mocks.sendChatMessage).not.toHaveBeenCalled();
  });

  it('applies roster-wide identity redaction even when staff pinned a target client', async () => {
    mocks.findConversation.mockResolvedValue({
      id: 9001,
      userId: 7,
      role: 'admin',
      context: 'coach_assistant',
      targetUserId: 42,
      title: null,
      messages: [{ role: 'user', content: 'Compare Sarah Smith with Jackie Reed' }],
      metadata: { responseStyle: 'both' },
      update: vi.fn(),
    });
    mocks.query.mockImplementation(async (sql) => {
      if (/ai_privacy_profiles/i.test(sql)) return [];
      return [
        { id: 42, firstName: 'Sarah', lastName: 'Smith', email: null, phone: null },
        { id: 61, firstName: 'Jackie', lastName: 'Reed', email: null, phone: null },
      ];
    });
    mocks.enrichWithUserData.mockResolvedValue('Target context also mentions Jackie Reed');
    mocks.sendChatMessage.mockResolvedValue({
      content: 'Jackie Reed can train with Sarah Smith.',
      provider: 'test-provider',
      model: 'test-model',
      tokenUsage: null,
      failoverTrace: [],
    });

    const response = await request(buildApp())
      .post('/api/ai-chat/conversations/9001/messages')
      .set('x-test-user-role', 'admin')
      .send({ message: 'Compare Sarah Smith with Jackie Reed' });

    expect(response.status).toBe(200);
    const [systemPrompt, promptHistory, currentMessage] = mocks.buildPromptMessages.mock.calls[0];
    expect(currentMessage).not.toMatch(/Sarah Smith|Jackie Reed/);
    expect(JSON.stringify(promptHistory)).not.toMatch(/Sarah Smith|Jackie Reed/);
    expect(response.body.assistantMessage.content).not.toMatch(/Sarah Smith|Jackie Reed/);
    expect(systemPrompt).not.toMatch(/Sarah Smith|Jackie Reed/);
  });

  it('creates a staff-owned client-preview conversation with client prompt scope', async () => {
    const response = await request(buildApp())
      .post('/api/ai-chat/conversations')
      .set('x-test-user-id', '7')
      .set('x-test-user-role', 'admin')
      .send({ context: 'coach_assistant', audienceRole: 'client' });
    expect(response.status).toBe(201);
    expect(mocks.createConversation).toHaveBeenCalledWith(expect.objectContaining({
      userId: 7,
      role: 'client',
      metadata: expect.objectContaining({ audienceRole: 'client' }),
    }));
    expect(response.body.conversation.role).toBe('client');
  });

  it('allows an admin to open the trainer dashboard conversation audience', async () => {
    const response = await request(buildApp())
      .post('/api/ai-chat/conversations')
      .set('x-test-user-id', '7')
      .set('x-test-user-role', 'admin')
      .send({ context: 'coach_assistant', audienceRole: 'trainer' });
    expect(response.status).toBe(201);
    expect(mocks.createConversation).toHaveBeenCalledWith(expect.objectContaining({
      userId: 7,
      role: 'trainer',
      metadata: expect.objectContaining({ audienceRole: 'trainer' }),
    }));
    expect(response.body.conversation.role).toBe('trainer');
  });

  it('rejects a client request for a privileged conversation audience', async () => {
    const response = await request(buildApp())
      .post('/api/ai-chat/conversations')
      .set('x-test-user-role', 'client')
      .send({ context: 'coach_assistant', audienceRole: 'admin' });
    expect(response.status).toBe(403);
    expect(response.body.code).toBe('INVALID_AUDIENCE_ROLE');
    expect(mocks.createConversation).not.toHaveBeenCalled();
  });

  it('rejects malformed admin targetUserId before model or access queries', async () => {
    const malformedTargets = [' 42', '042', '1e2', '42abc', 0, -1, true, [], {}];

    for (const targetUserId of malformedTargets) {
      vi.clearAllMocks();
      mocks.createConversation.mockImplementation(async (payload) => mockCreatedConversation(payload));
      mocks.query.mockResolvedValue([]);

      const response = await request(buildApp())
        .post('/api/ai-chat/conversations')
        .set('x-test-user-role', 'admin')
        .send({ context: 'coach_assistant', targetUserId });
      expect(response.status).toBe(400);
      expect(response.body.code).toBe('INVALID_TARGET_USER_ID');
      expect(mocks.createConversation).not.toHaveBeenCalled();
      expect(mocks.query).not.toHaveBeenCalled();
    }
  });

  it('normalizes an admin targetUserId before creating the conversation', async () => {
    const response = await request(buildApp())
      .post('/api/ai-chat/conversations')
      .set('x-test-user-role', 'admin')
      .send({ context: 'coach_assistant', targetUserId: '42' });
    expect(response.status).toBe(201);
    expect(mocks.query).not.toHaveBeenCalled();
    expect(mocks.createConversation).toHaveBeenCalledWith(expect.objectContaining({
      context: 'coach_assistant',
      targetUserId: 42,
    }));
    expect(response.body.conversation.targetUserId).toBe(42);
  });

  it('allows an assigned trainer to create a target-bound Coach conversation', async () => {
    mocks.query.mockImplementation(async (sql) => (sql.includes('client_trainer_assignments') ? [{ ok: 1 }] : []));

    const response = await request(buildApp())
      .post('/api/ai-chat/conversations')
      .set('x-test-user-id', '7')
      .set('x-test-user-role', 'trainer')
      .send({ context: 'coach_assistant', targetUserId: '42' });
    expect(response.status).toBe(201);
    expect(mocks.createConversation).toHaveBeenCalledWith(expect.objectContaining({
      userId: 7,
      role: 'trainer',
      targetUserId: 42,
    }));
  });

  it('rejects an unassigned trainer target before creating the conversation row', async () => {
    mocks.query.mockResolvedValue([]);

    const response = await request(buildApp())
      .post('/api/ai-chat/conversations')
      .set('x-test-user-id', '7')
      .set('x-test-user-role', 'trainer')
      .send({ context: 'coach_assistant', targetUserId: '42' });
    expect(response.status).toBe(403);
    expect(response.body.code).toBe('CLIENT_ACCESS_DENIED');
    expect(mocks.createConversation).not.toHaveBeenCalled();
    expect(mocks.query).toHaveBeenCalledTimes(2);
  });
  it('uses the selected provider through real inference and preserves provider metadata',async()=>{
    mocks.findConversation.mockResolvedValue({id:9001,userId:7,role:'admin',context:'coach_assistant',targetUserId:null,title:null,messages:[],metadata:{},update:vi.fn()});
    mocks.providerGenerate.mockResolvedValue({ok:true,content:'Synthetic evidence response',model:'fixture-model',tokenUsage:{totalTokens:12}});
    const response=await request(buildApp()).post('/api/ai-chat/conversations/9001/messages').send({message:'Show progress'});
    expect(response.status).toBe(200);
    expect(mocks.providerGenerate).toHaveBeenCalledTimes(1);
    expect(mocks.sendChatMessage).not.toHaveBeenCalled();
    expect(response.body.assistantMessage.content).toBe('Synthetic evidence response');
    expect(JSON.stringify(mocks.providerGenerate.mock.calls[0][0])).toContain('END EVIDENCE');
  });
  it('does not bypass the boundary when provider selection throws',async()=>{
    mocks.findConversation.mockResolvedValue({id:9001,userId:7,role:'admin',context:'coach_assistant',targetUserId:null,title:null,messages:[],metadata:{},update:vi.fn()});
    mocks.getCoachProviderAdapter.mockImplementation(()=>{throw new Error('synthetic adapter unavailable');});
    const response=await request(buildApp()).post('/api/ai-chat/conversations/9001/messages').send({message:'Show progress'});
    expect(response.status).toBe(200);
    expect(response.body.assistantMessage.content).toContain('temporarily unavailable');
    expect(mocks.sendChatMessage).not.toHaveBeenCalled();
    expect(mocks.providerGenerate).not.toHaveBeenCalled();
  });

  it('scrubs identities added by evidence tools after initial prompt sanitization',async()=>{
    mocks.findConversation.mockResolvedValue({id:9001,userId:7,role:'admin',context:'coach_assistant',targetUserId:61,title:null,messages:[],metadata:{},update:vi.fn()});
    mocks.query.mockImplementation(async(sql)=>{
      if(sql.includes('json_agg'))return [{id:'synthetic-session',title:'Jackie Reed training',createdAt:new Date().toISOString(),exercises:[]}];
      if(sql.includes('"Users"'))return [{id:61,firstName:'Jackie',lastName:'Reed',email:'jackie.reed@example.com'}];
      return [];
    });
    mocks.providerGenerate.mockResolvedValue({ok:true,content:'Synthetic response'});
    const response=await request(buildApp()).post('/api/ai-chat/conversations/9001/messages').send({message:'Show progress'});
    expect(response.status).toBe(200);
    expect(mocks.providerGenerate).toHaveBeenCalledTimes(1);
    const prompt=JSON.stringify(mocks.providerGenerate.mock.calls[0][0]);
    expect(prompt).toContain('synthetic-session');
    expect(prompt).not.toContain('Jackie');
    expect(prompt).not.toContain('jackie.reed@example.com');
  });

  it.each(['admin','trainer'])('unpinned mounted %s chat queries no personal evidence',async(role)=>{
    mocks.findConversation.mockResolvedValue({id:9001,userId:7,role,context:'coach_assistant',targetUserId:null,title:null,messages:[],metadata:{},update:vi.fn()});
    const response=await request(buildApp()).post('/api/ai-chat/conversations/9001/messages').set('x-test-user-role',role).send({message:'Help me use the Coach'});
    expect(response.status).toBe(200);expect(mocks.providerGenerate).toHaveBeenCalledTimes(1);
    expect(mocks.query.mock.calls.filter(([sql])=>/workout_sessions|client_pain_entries|daily_macro_logs|FROM goals/.test(sql))).toEqual([]);
  });
  it('does not send evidence after consent is withdrawn during the final prompt scrub',async()=>{
    const {scrubGenericPII}=await import('../../services/aiPrivacyService.mjs');let withdrawn=false;
    mocks.findConversation.mockResolvedValue({id:9001,userId:7,role:'admin',context:'coach_assistant',targetUserId:61,title:null,messages:[],metadata:{},update:vi.fn()});
    mocks.query.mockImplementation(async(sql)=>sql.includes('ai_privacy_profiles')?[{aiEnabled:!withdrawn,withdrawnAt:withdrawn?new Date():null}]:[]);
    scrubGenericPII.mockImplementation(async(message)=>{if(message.includes('END EVIDENCE'))withdrawn=true;return {sanitizedText:message,piiRemoved:0};});
    try{
      await request(buildApp()).post('/api/ai-chat/conversations/9001/messages').send({message:'Show progress'});
      expect(mocks.providerGenerate).not.toHaveBeenCalled();
    }finally{scrubGenericPII.mockImplementation(async(message)=>({sanitizedText:message,piiRemoved:0}));}
  });
  it('disconnect aborts provider, prevents late save, and allows a clean retry',async()=>{
    const update=vi.fn();mocks.findConversation.mockResolvedValue({id:9001,userId:7,role:'admin',context:'coach_assistant',targetUserId:null,title:null,messages:[],metadata:{},update});
    let start;const started=new Promise(resolve=>{start=resolve;});let finish;let providerSignal;
    mocks.providerGenerate.mockImplementationOnce((_messages,{signal})=>{providerSignal=signal;start();return new Promise(resolve=>{finish=resolve;});});
    const app=buildApp();const httpRequest=request(app).post('/api/ai-chat/conversations/9001/messages').send({message:'Cancelled turn'});
    httpRequest.end(()=>{});await started;httpRequest.abort();
    await vi.waitFor(()=>expect(providerSignal.aborted).toBe(true));
    finish({ok:true,content:'late response'});
    await new Promise(resolve=>setTimeout(resolve,20));expect(update).not.toHaveBeenCalled();
    mocks.providerGenerate.mockResolvedValueOnce({ok:true,content:'retry response'});
    const response=await request(app).post('/api/ai-chat/conversations/9001/messages').send({message:'Retry turn'});
    expect(response.status).toBe(200);expect(update).toHaveBeenCalledTimes(1);
    expect(update.mock.calls[0][0].messages.map(m=>m.content)).toEqual(['Retry turn','retry response']);
  });


  describe('HR11 created target integrity', () => {
    const unavailable = { success: false, code: 'COACH_CONVERSATION_CREATE_UNAVAILABLE', error: 'Swan Coach cannot create this conversation right now. Please try again later.' };
    const create = (body = { context: 'coach_assistant', targetUserId: '42' }) => request(buildApp()).post('/api/ai-chat/conversations').send(body);
    const expectNoProvider = () => { expect(mocks.providerGenerate).not.toHaveBeenCalled(); expect(mocks.sendChatMessage).not.toHaveBeenCalled(); };

    it.each(['original', 'parent', 'direct'])('schema failure in %s never retries without target and never leaks diagnostics', async shape => {
      const diagnostic = 'HR11_PRIVATE_SQL_SENTINEL';
      const error = new Error(diagnostic);
      if (shape === 'direct') error.code = '42703';
      else error[shape] = { code: '42703', message: diagnostic, sql: diagnostic };
      mocks.createConversation.mockRejectedValueOnce(error);
      const response = await create();
      expect(response.status).toBe(503); expect(response.body).toEqual(unavailable);
      expect(mocks.createConversation).toHaveBeenCalledTimes(1);
      expect(mocks.createConversation.mock.calls[0][0].targetUserId).toBe(42);
      expect(JSON.stringify([response.body, mocks.logger.error.mock.calls, mocks.logger.warn.mock.calls])).not.toContain(diagnostic);
      expectNoProvider();
      const retry = await create();
      expect(retry.status).toBe(201); expect(retry.body.conversation.targetUserId).toBe(42);
      expect(mocks.createConversation).toHaveBeenCalledTimes(2);
    });

    it('does not classify arbitrary targetUserId text as a schema retry', async () => {
      const diagnostic = 'targetUserId HR11_PRIVATE_TEXT_SENTINEL';
      mocks.createConversation.mockRejectedValueOnce(new Error(diagnostic));
      const response = await create();
      expect(response.status).toBe(500); expect(response.body).toEqual({ success: false, error: 'Failed to create conversation' });
      expect(mocks.createConversation).toHaveBeenCalledTimes(1);
      expect(mocks.createConversation.mock.calls[0][0].targetUserId).toBe(42);
      expect(JSON.stringify([response.body, mocks.logger.error.mock.calls])).not.toContain(diagnostic);
      expectNoProvider();
    });

    it('keeps generic failure details out of route logs as well as the response', async () => {
      const diagnostic = 'HR11_PRIVATE_CONNECTION_SENTINEL';
      mocks.createConversation.mockRejectedValueOnce(Object.assign(new Error(diagnostic), { original: { code: '08006', sql: diagnostic } }));
      const response = await create();
      expect(response.status).toBe(500); expect(response.body.error).toBe('Failed to create conversation');
      expect(mocks.createConversation).toHaveBeenCalledTimes(1);
      expect(JSON.stringify([response.body, mocks.logger.error.mock.calls])).not.toContain(diagnostic);
      expectNoProvider();
    });

    it.each([43, null, undefined, '042', true, 0, 'invalid'])('does not publish a created row with wrong/malformed target %j', async target => {
      mocks.createConversation.mockImplementationOnce(async payload => ({ ...mockCreatedConversation(payload), targetUserId: target }));
      const response = await create();
      expect(response.status).toBe(503); expect(response.body).toEqual(unavailable);
      expect(mocks.createConversation).toHaveBeenCalledTimes(1);
      expect(mocks.createConversation.mock.calls[0][0].targetUserId).toBe(42);
      expectNoProvider();
    });

    it('declines a missing created record without retry', async () => {
      mocks.createConversation.mockResolvedValueOnce(null);
      const response = await create();
      expect(response.status).toBe(503); expect(response.body).toEqual(unavailable);
      expect(mocks.createConversation).toHaveBeenCalledTimes(1); expectNoProvider();
    });

    it.each([42, undefined, false])('does not attach an unscoped request to an unexpected returned target %j', async target => {
      mocks.createConversation.mockImplementationOnce(async payload => ({ ...mockCreatedConversation(payload), targetUserId: target }));
      const response = await create({ context: 'coach_assistant', targetUserId: null });
      expect(response.status).toBe(503); expect(response.body).toEqual(unavailable);
      expect(mocks.createConversation).toHaveBeenCalledTimes(1);
      expect(mocks.createConversation.mock.calls[0][0]).not.toHaveProperty('targetUserId'); expectNoProvider();
    });

    it('normalizes the actual canonical string target and preserves explicit unscoped success', async () => {
      mocks.createConversation.mockImplementationOnce(async payload => ({ ...mockCreatedConversation(payload), targetUserId: '42' }));
      const targeted = await create();
      expect(targeted.status).toBe(201); expect(targeted.body.conversation.targetUserId).toBe(42);
      const unscoped = await create({ context: 'coach_assistant', targetUserId: null });
      expect(unscoped.status).toBe(201); expect(unscoped.body.conversation.targetUserId).toBeNull();
      expect(mocks.createConversation).toHaveBeenCalledTimes(2); expectNoProvider();
    });
  });

});
