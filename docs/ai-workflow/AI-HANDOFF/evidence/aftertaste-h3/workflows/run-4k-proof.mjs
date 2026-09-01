// Build the 4K + 48fps finishing chain as an API graph and RUN it on a real clip.
const B = 'http://127.0.0.1:8189';
const clientId = 'swan-4k-' + Math.random().toString(16).slice(2);

const g = {
  "1": { class_type: "LoadVideo", inputs: { file: "swan-upscale-test.mp4" } },
  "2": { class_type: "GetVideoComponents", inputs: { video: ["1", 0] } },
  "3": { class_type: "ImageScale", inputs: { image: ["2", 0], upscale_method: "lanczos", width: 3840, height: 2160, crop: "center" } },
  "4": { class_type: "FrameInterpolationModelLoader", inputs: { model_name: "rife_v4.25.safetensors" } },
  "5": { class_type: "FrameInterpolate", inputs: { interp_model: ["4", 0], images: ["3", 0], multiplier: 2 } },
  "6": { class_type: "CreateVideo", inputs: { images: ["5", 0], fps: 48.0, audio: ["2", 1] } },
  "7": { class_type: "SaveVideo", inputs: { video: ["6", 0], filename_prefix: "swan/upscale-proof", format: "mp4", codec: "h264" } },
};

const r = await fetch(`${B}/prompt`, {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ prompt: g, client_id: clientId }),
});
const j = await r.json();
if (!r.ok || j.error) { console.log('REJECTED:', JSON.stringify(j).slice(0, 900)); process.exit(1); }
if (j.node_errors && Object.keys(j.node_errors).length) { console.log('NODE ERRORS:', JSON.stringify(j.node_errors).slice(0, 900)); process.exit(1); }
console.log('queued prompt_id', j.prompt_id);

// Poll history until it finishes.
for (let i = 0; i < 240; i++) {
  await new Promise((s) => setTimeout(s, 5000));
  const h = await (await fetch(`${B}/history/${j.prompt_id}`)).json();
  const e = h[j.prompt_id];
  if (!e) { if (i % 6 === 0) process.stdout.write('.'); continue; }
  const st = e.status || {};
  if (st.completed || st.status_str === 'success') {
    console.log('\nCOMPLETED');
    console.log('outputs:', JSON.stringify(e.outputs).slice(0, 500));
    process.exit(0);
  }
  if (st.status_str === 'error') { console.log('\nFAILED:', JSON.stringify(st.messages).slice(0, 1200)); process.exit(1); }
  if (i % 6 === 0) process.stdout.write('.');
}
console.log('\nTIMED OUT after 20 min');
process.exit(1);
