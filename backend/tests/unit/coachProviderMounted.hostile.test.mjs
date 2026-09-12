import {afterEach,expect,test,vi} from 'vitest';
import {getCoachProviderAdapter} from '../../services/aiChatService.mjs';
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();});
const configure=()=>{
  vi.stubEnv('GEMINI_API_KEY','synthetic-key');vi.stubEnv('OPENAI_API_KEY','synthetic-key');
  vi.stubEnv('ANTHROPIC_API_KEY','');vi.stubEnv('VENICE_API_KEY','');
};
test('selected provider name matches the boundary allowlist and never retries another model/provider',async()=>{
  configure(); const fetcher=vi.fn().mockRejectedValue(new Error('synthetic outage'));vi.stubGlobal('fetch',fetcher);
  const adapter=getCoachProviderAdapter();
  expect(adapter.name).toBe('gemini');
  await expect(adapter.generate([{role:'user',content:'synthetic'}])).rejects.toThrow('synthetic outage');
  expect(fetcher).toHaveBeenCalledTimes(1);
});
test('provider cancellation reaches the network request',async()=>{
  configure(); const controller=new AbortController();
  const fetcher=vi.fn(async(_url,options)=>new Promise((_,reject)=>options.signal.addEventListener('abort',()=>reject(new Error('synthetic abort')))));
  vi.stubGlobal('fetch',fetcher);
  const pending=getCoachProviderAdapter().generate([{role:'user',content:'synthetic'}],{signal:controller.signal});
  controller.abort();
  await expect(pending).rejects.toThrow();
  expect(fetcher.mock.calls[0][1].signal.aborted).toBe(true);
  expect(fetcher).toHaveBeenCalledTimes(1);
});
test('missing configured provider stays unavailable without a network call',()=>{
  for(const key of ['GEMINI_API_KEY','OPENAI_API_KEY','ANTHROPIC_API_KEY','VENICE_API_KEY'])vi.stubEnv(key,'');
  expect(getCoachProviderAdapter()).toBeNull();
});
