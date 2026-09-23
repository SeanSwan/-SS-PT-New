import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useVoiceRecorder } from './useVoiceRecorder';
class Recorder {
  static instances: Recorder[]=[];
  static isTypeSupported(){return true;}
  state='inactive'; onstop:(()=>void)|null=null; onerror:(()=>void)|null=null;
  ondataavailable:((event:{data:Blob})=>void)|null=null;
  start=vi.fn(()=>{this.state='recording';});
  stop=vi.fn(()=>{this.state='inactive';});
  constructor(public stream:MediaStream){Recorder.instances.push(this);}
}
const deferred=()=>{
  let resolve!:(stream:MediaStream)=>void; let reject!:(reason:Error)=>void;
  const promise=new Promise<MediaStream>((yes,no)=>{resolve=yes;reject=no;});
  return {promise,resolve,reject};
};
const stream=()=>{const stop=vi.fn();return {stop,value:{getTracks:()=>[{stop}]} as unknown as MediaStream};};
beforeEach(()=>{Recorder.instances=[];vi.stubGlobal('MediaRecorder',Recorder);});
afterEach(()=>vi.unstubAllGlobals());
function mic(...requests:ReturnType<typeof deferred>[]){
  const getUserMedia=vi.fn(); requests.forEach(r=>getUserMedia.mockReturnValueOnce(r.promise));
  Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia}});
}
it('unmount while permission is pending releases the eventual stream',async()=>{
  const req=deferred();mic(req);const track=stream();
  const {result,unmount}=renderHook(()=>useVoiceRecorder());let started!:Promise<void>;
  act(()=>{started=result.current.start();});unmount();
  await act(async()=>{req.resolve(track.value);await started;});
  expect(track.stop).toHaveBeenCalledTimes(1);expect(Recorder.instances).toHaveLength(0);
});
it('abort then restart cannot revive the older permission request',async()=>{
  const a=deferred(),b=deferred();mic(a,b);const old=stream(),current=stream();
  const {result}=renderHook(()=>useVoiceRecorder());let first!:Promise<void>,second!:Promise<void>;
  act(()=>{first=result.current.start();result.current.abort();second=result.current.start();});
  await act(async()=>{b.resolve(current.value);await second;a.resolve(old.value);await first;});
  expect(old.stop).toHaveBeenCalledTimes(1);expect(current.stop).not.toHaveBeenCalled();
  expect(Recorder.instances).toHaveLength(1);expect(result.current.state).toBe('recording');
});
it('late rejection from an old request cannot tear down the new recording',async()=>{
  const a=deferred(),b=deferred();mic(a,b);const current=stream();
  const {result}=renderHook(()=>useVoiceRecorder());let first!:Promise<void>,second!:Promise<void>;
  act(()=>{first=result.current.start();result.current.reset();second=result.current.start();});
  await act(async()=>{b.resolve(current.value);await second;a.reject(new Error('old denial'));await first;});
  expect(current.stop).not.toHaveBeenCalled();expect(result.current.state).toBe('recording');
  expect(result.current.error).toBeNull();
});
it('a queued stop callback after abort cannot publish an old blob',async()=>{
  const req=deferred();mic(req);const track=stream();
  const {result}=renderHook(()=>useVoiceRecorder());let started!:Promise<void>;
  act(()=>{started=result.current.start();});await act(async()=>{req.resolve(track.value);await started;});
  const recorder=Recorder.instances[0],queuedStop=recorder.onstop;
  act(()=>{result.current.stop();result.current.abort();queuedStop?.();});
  expect(result.current.state).toBe('idle');expect(result.current.audioBlob).toBeNull();
});

it('normal stop publishes the collected blob, releases tracks and allows a fresh retry',async()=>{
  const first=deferred(),second=deferred();mic(first,second);const a=stream(),b=stream();
  const {result}=renderHook(()=>useVoiceRecorder());let started!:Promise<void>;
  act(()=>{started=result.current.start();});await act(async()=>{first.resolve(a.value);await started;});
  const recorder=Recorder.instances[0];
  act(()=>{recorder.ondataavailable?.({data:new Blob(['voice'])});result.current.stop();recorder.onstop?.();});
  expect(result.current.state).toBe('stopped');expect(result.current.audioBlob?.size).toBe(5);
  expect(a.stop).toHaveBeenCalledTimes(1);expect(recorder.onstop).toBeNull();
  act(()=>{result.current.reset();started=result.current.start();});
  await act(async()=>{second.resolve(b.value);await started;});
  expect(result.current.state).toBe('recording');expect(result.current.audioBlob).toBeNull();
  act(()=>result.current.abort());expect(b.stop).toHaveBeenCalledTimes(1);
});
it('unmount during an active recording releases tracks and cannot publish a queued blob',async()=>{
  const request=deferred();mic(request);const audio=stream();
  const {result,unmount}=renderHook(()=>useVoiceRecorder());let started!:Promise<void>;
  act(()=>{started=result.current.start();});await act(async()=>{request.resolve(audio.value);await started;});
  const recorder=Recorder.instances[0],queued=recorder.onstop;unmount();
  expect(audio.stop).toHaveBeenCalledTimes(1);expect(recorder.stop).toHaveBeenCalledTimes(1);
  expect(recorder.ondataavailable).toBeNull();expect(recorder.onstop).toBeNull();
  act(()=>queued?.());expect(result.current.audioBlob).toBeNull();
});
