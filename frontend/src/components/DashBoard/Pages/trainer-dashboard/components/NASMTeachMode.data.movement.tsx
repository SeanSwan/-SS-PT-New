import { AlertTriangle, BookOpen, Eye, Ruler } from 'lucide-react';
import {
  BulletList,
  ClientScript,
  CompensationTable,
  InfoBox,
  ScriptNote,
  StepList,
} from './NASMTeachMode.styles';
import type { TeachModeData } from './NASMTeachMode.data.types';

export const movementScreenTeachData = {
  title: 'NASM Overhead Squat Assessment (OHSA)',
  sections: [
    {
      title: 'Equipment & Setup',
      icon: <Ruler size={16} aria-hidden="true" />,
      content: (
        <>
          <BulletList>
            <li>Dowel rod or PVC pipe (broomstick works)</li>
            <li>Flat, hard surface (not thick carpet)</li>
            <li>Client removes shoes - barefoot assessment is standard</li>
            <li>Optional: camera/tablet for recording anterior and lateral views</li>
          </BulletList>
          <StepList>
            <li>Client stands with feet shoulder-width apart, toes pointing straight ahead</li>
            <li>Client holds dowel overhead with arms fully extended, elbows locked</li>
            <li>Grip width: when bar rests on head, elbows form 90 degrees - then press overhead</li>
            <li>Dowel should align with ears when viewed from the side</li>
          </StepList>
        </>
      ),
    },
    {
      title: 'What to Tell the Client',
      icon: <BookOpen size={16} aria-hidden="true" />,
      content: (
        <ClientScript>
          &quot;Stand with your feet shoulder-width apart, toes pointing straight ahead. Hold this bar
          overhead with your arms fully extended. Squat down as low as you comfortably can, as if
          sitting into a chair, then stand back up. Perform 5 repetitions at a comfortable pace.
          Keep your feet flat and arms overhead the entire time.&quot;
          <ScriptNote>Do NOT coach or cue corrections. You are observing natural movement.
          If the client asks &quot;like this?&quot; just say &quot;however feels natural.&quot;</ScriptNote>
        </ClientScript>
      ),
    },
    {
      title: 'Anterior View (Front) - Checkpoints',
      icon: <Eye size={16} aria-hidden="true" />,
      content: (
        <CompensationTable>
          <thead>
            <tr><th>Checkpoint</th><th>Compensation</th><th>Overactive</th><th>Underactive</th></tr>
          </thead>
          <tbody>
            <tr>
              <td>Feet</td>
              <td>Turn out {'>'} 10 degrees</td>
              <td>Soleus, lateral gastroc, biceps femoris (short head)</td>
              <td>Medial gastroc, medial hamstring, gracilis, popliteus</td>
            </tr>
            <tr>
              <td>Feet</td>
              <td>Flatten / pronate</td>
              <td>Peroneals, lateral gastroc, biceps femoris</td>
              <td>Anterior tibialis, posterior tibialis, glute med</td>
            </tr>
            <tr>
              <td>Knees</td>
              <td>Move inward (valgus)</td>
              <td>Adductors, TFL, vastus lateralis</td>
              <td>Glute med, glute max, VMO</td>
            </tr>
            <tr>
              <td>Knees</td>
              <td>Move outward (varus)</td>
              <td>Piriformis, biceps femoris</td>
              <td>Adductors, medial hamstring</td>
            </tr>
          </tbody>
        </CompensationTable>
      ),
    },
    {
      title: 'Lateral View (Side) - Checkpoints',
      icon: <Eye size={16} aria-hidden="true" />,
      content: (
        <CompensationTable>
          <thead>
            <tr><th>Checkpoint</th><th>Compensation</th><th>Overactive</th><th>Underactive</th></tr>
          </thead>
          <tbody>
            <tr>
              <td>Foot/Ankle</td>
              <td>Heels rise off ground</td>
              <td>Soleus, gastrocnemius</td>
              <td>Anterior tibialis, glute max</td>
            </tr>
            <tr>
              <td>LPHC</td>
              <td>Excessive forward lean</td>
              <td>Soleus, gastroc, hip flexors, abs</td>
              <td>Glute max, erector spinae</td>
            </tr>
            <tr>
              <td>LPHC</td>
              <td>Low back arches (anterior tilt)</td>
              <td>Hip flexors, erector spinae</td>
              <td>Glute max, hamstrings, TVA, multifidus</td>
            </tr>
            <tr>
              <td>Shoulders</td>
              <td>Arms fall forward</td>
              <td>Lats, teres major, pec major/minor</td>
              <td>Mid/lower trap, rhomboids, rotator cuff</td>
            </tr>
            <tr>
              <td>Head</td>
              <td>Forward head posture</td>
              <td>Upper trap, levator scapulae, SCM</td>
              <td>Deep cervical flexors</td>
            </tr>
          </tbody>
        </CompensationTable>
      ),
    },
    {
      title: 'Scoring & Safety',
      icon: <AlertTriangle size={16} aria-hidden="true" />,
      content: (
        <>
          <InfoBox>
            <strong>Scoring:</strong> Pass/fail per checkpoint. Observe all 5 reps - record the pattern
            that appears in 3+ reps. If a compensation appears in any reps, note it.
          </InfoBox>
          <BulletList>
            <li>Clear area around client - they may lose balance</li>
            <li>If acute knee/back/shoulder pain, modify or skip</li>
            <li>If client can&apos;t hold dowel overhead, use arms-crossed-on-chest modification</li>
            <li>No warm-up before assessment - observe natural movement patterns</li>
            <li>Barefoot on clean, non-slippery surface</li>
          </BulletList>
        </>
      ),
    },
  ],
} satisfies TeachModeData;
