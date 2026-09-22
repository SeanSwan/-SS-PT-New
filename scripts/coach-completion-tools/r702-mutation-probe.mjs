// R7-02 probe, corrected. Astra's mutations tamper with the DECLARED PREDECESSOR SNAPSHOT
// (`origin.state`) — i.e. the migration rewrites the immutable past so that its own claim and
// its own content agree. My first probe mutated only the copy that was ALSO the `before`
// argument, so the two sides stayed consistent and the mutation was invisible by construction.
// The attack: `before` is the true predecessor; `origin.state` is the migration's FALSIFIED claim.
import { checkControllerMigration } from '../coach-completion-admission.mjs';

const truePred = () => ({
  taskId: 't', sessionId: 's', calls: 12,
  slices: ['S83', 'S84', 'S85', 'S86', 'S87', 'S88a', 'S88b', 'S89', 'S90'].map((id) => ({
    id, status: 'tested', digest: 'd', frozen: { file: 'hash' }, reviewDisposition: 'accept', allowedFiles: ['a', 'b'],
  })),
  events: Array.from({ length: 216 }, (_, i) => ({ type: `e${i}`, payload: { n: i } })),
  authorization: { cadence: 'final-astra' },
});

// The migration claims a predecessor, and may LIE about it.
const buildPair = (falsify) => {
  const claim = JSON.parse(JSON.stringify(truePred()));
  if (falsify) falsify(claim);
  return {
    before: truePred(),
    after: {
      taskId: 't', sessionId: 's', calls: 12,
      slices: ['C0', 'C1', 'C2', 'C3', 'C4', 'C5'].map((id) => ({ id, status: 'build' })),
      events: [...claim.events, { type: 'explicit-migration' }],
      origin: { state: claim, events: claim.events },
      authorization: { cadence: 'final-astra' },
    },
  };
};

const MUT = {
  'allowedFiles: ["a","b"] -> ["a"] in the claimed snapshot': (c) => { c.slices[0].allowedFiles = ['a']; },
  'frozen: {file:"hash"} -> {} in the claimed snapshot': (c) => { c.slices[0].frozen = {}; },
  'digest: "digest" -> null in the claimed snapshot': (c) => { c.slices[0].digest = null; },
  'predecessor slice REPLACED (same count)': (c) => { c.slices[0] = { id: 'SXX-FABRICATED', status: 'tested' }; },
  'equal-count replacement of event bodies': (c) => { c.events = c.events.map((e, i) => (i === 0 ? { type: 'TAMPERED', payload: { n: 0 } } : e)); },
  'predecessor gutted to almost-empty': (c) => { c.slices = []; c.events = []; },
  'authorization rewritten in the claimed snapshot': (c) => { c.authorization = { cadence: 'final-fable' }; },
};

const control = checkControllerMigration(buildPair());
console.log('CONTROL (honest migration) ->', JSON.stringify(control), '(expected [])');
let admitted = 0;
for (const [name, mut] of Object.entries(MUT)) {
  const v = checkControllerMigration(buildPair(mut));
  if (v.length === 0) admitted += 1;
  console.log(v.length === 0 ? 'ADMITTED []  <-- STILL OPEN' : `caught (${v.length})`, '|', name);
}
console.log('');
console.log(`mutations admitted: ${admitted}/${Object.keys(MUT).length}`);
