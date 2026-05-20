/**
 * ============================================================================
 * FILE: NASMTeachMode.tsx
 * PURPOSE: Teach mode panels for NASM assessment protocols
 * AUTHOR: Claude Opus 4.6 | CREATED: 2026-03-29
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Provides step-by-step execution instructions for each
 * NASM assessment type so trainers can perform assessments without external
 * reference materials. Content is accurate to NASM CPT 7th Edition protocols.
 *
 * HOW IT FITS IN THE APP: TrainerAssessmentsPage -> NASMTeachMode (toggle)
 */
import React, { useState } from 'react';
import styled from 'styled-components';
import { BookOpen, ChevronDown, ChevronUp, AlertTriangle, Target, Eye, Ruler } from 'lucide-react';

// ─────────────────────────────────────────────────────────────
// SECTION: Types
// ─────────────────────────────────────────────────────────────

interface NASMTeachModeProps {
  assessmentType: string;
}

interface AccordionSection {
  title: string;
  icon?: React.ReactNode;
  content: React.ReactNode;
}

// ─────────────────────────────────────────────────────────────
// SECTION: Styled Components
// PURPOSE: Must be defined BEFORE TEACH_DATA because JSX in
//          the data object references these styled components.
// ─────────────────────────────────────────────────────────────

const TeachContainer = styled.div`
  background: var(--bg-elevated, #141419);
  border: 1px solid rgba(139, 92, 246, 0.2);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 24px;
`;

const TeachHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
  color: var(--accent-secondary, #8B5CF6);
  flex-wrap: wrap;
`;

const TeachTitle = styled.h3`
  font-family: 'Sora', sans-serif;
  font-size: 1rem;
  font-weight: 700;
  margin: 0;
  flex: 1;
`;

const ExpandControls = styled.div`display: flex; gap: 8px;`;
const ExpandBtn = styled.button`
  padding: 4px 12px;
  border-radius: 6px;
  border: 1px solid var(--border-soft, rgba(96,192,240,0.12));
  background: var(--bg-surface, #1A1A24);
  color: var(--text-secondary, rgba(224,236,244,0.6));
  font-size: 0.7rem;
  cursor: pointer;
  min-height: 32px;
  &:hover { border-color: var(--accent-primary, #60C0F0); color: var(--text-primary, #E0ECF4); }
`;

const AccordionItem = styled.div`
  border: 1px solid var(--border-soft, rgba(96,192,240,0.08));
  border-radius: 8px;
  margin-bottom: 6px;
  overflow: hidden;
`;

const AccordionHeader = styled.button`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  border: 0;
  padding: 12px 16px;
  cursor: pointer;
  min-height: 48px;
  background: var(--bg-surface, #1A1A24);
  color: var(--text-primary, #E0ECF4);
  font-size: 0.85rem;
  font-weight: 600;
  text-align: left;
  transition: background 0.2s;
  &:hover { background: rgba(96, 192, 240, 0.05); }
  &:focus-visible { outline: 2px solid #60C0F0; outline-offset: -2px; }
`;

const AccordionLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--accent-primary, #60C0F0);
  span { color: var(--text-primary, #E0ECF4); }
`;

const AccordionBody = styled.div`
  padding: 16px;
  font-size: 0.82rem;
  line-height: 1.6;
  color: var(--text-secondary, rgba(224,236,244,0.7));
`;

const BulletList = styled.ul`
  margin: 8px 0;
  padding-left: 20px;
  li { margin-bottom: 4px; }
`;

const StepList = styled.ol`
  margin: 8px 0;
  padding-left: 20px;
  li { margin-bottom: 6px; }
  strong { color: var(--text-primary, #E0ECF4); }
`;

const ClientScript = styled.div`
  background: rgba(139, 92, 246, 0.08);
  border-left: 3px solid var(--accent-secondary, #8B5CF6);
  border-radius: 0 8px 8px 0;
  padding: 14px 16px;
  margin: 10px 0;
  font-style: italic;
  color: var(--text-primary, #E0ECF4);
  font-size: 0.85rem;
  line-height: 1.6;
`;

const ScriptNote = styled.div`
  font-style: normal;
  font-weight: 600;
  color: var(--accent-gold, #C6A84B);
  margin-top: 10px;
  font-size: 0.8rem;
`;

const CompensationTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin: 8px 0;
  font-size: 0.78rem;

  th {
    text-align: left;
    padding: 8px 10px;
    background: var(--bg-surface, #1A1A24);
    color: var(--accent-primary, #60C0F0);
    font-weight: 600;
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    border-bottom: 1px solid var(--border-soft, rgba(96,192,240,0.15));
  }

  td {
    padding: 8px 10px;
    border-bottom: 1px solid var(--border-soft, rgba(96,192,240,0.06));
    vertical-align: top;
  }

  tr:hover td { background: rgba(96, 192, 240, 0.03); }
`;

const InfoBox = styled.div`
  background: rgba(96, 192, 240, 0.06);
  border: 1px solid rgba(96, 192, 240, 0.12);
  border-radius: 8px;
  padding: 12px 16px;
  margin: 10px 0;
  font-size: 0.82rem;
  line-height: 1.6;
  strong { color: var(--text-primary, #E0ECF4); }
`;

const TwoColumn = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin: 10px 0;
  @media (max-width: 600px) { grid-template-columns: 1fr; }
`;

const SubLabel = styled.div`
  font-weight: 700;
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 6px;
  color: var(--accent-primary, #60C0F0);
`;

// ─────────────────────────────────────────────────────────────
// SECTION: NASM Protocol Data
// ─────────────────────────────────────────────────────────────

const TEACH_DATA: Record<string, { title: string; sections: AccordionSection[] }> = {
  movement_screen: {
    title: 'NASM Overhead Squat Assessment (OHSA)',
    sections: [
      {
        title: 'Equipment & Setup',
        icon: <Ruler size={16} />,
        content: (
          <>
            <BulletList>
              <li>Dowel rod or PVC pipe (broomstick works)</li>
              <li>Flat, hard surface (not thick carpet)</li>
              <li>Client removes shoes — barefoot assessment is standard</li>
              <li>Optional: camera/tablet for recording anterior + lateral views</li>
            </BulletList>
            <StepList>
              <li>Client stands with feet shoulder-width apart, toes pointing straight ahead</li>
              <li>Client holds dowel overhead with arms fully extended, elbows locked</li>
              <li>Grip width: when bar rests on head, elbows form 90° — then press overhead</li>
              <li>Dowel should align with ears when viewed from the side</li>
            </StepList>
          </>
        ),
      },
      {
        title: 'What to Tell the Client',
        icon: <BookOpen size={16} />,
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
        title: 'Anterior View (Front) — Checkpoints',
        icon: <Eye size={16} />,
        content: (
          <CompensationTable>
            <thead>
              <tr><th>Checkpoint</th><th>Compensation</th><th>Overactive</th><th>Underactive</th></tr>
            </thead>
            <tbody>
              <tr>
                <td>Feet</td>
                <td>Turn out {'>'} 10°</td>
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
        title: 'Lateral View (Side) — Checkpoints',
        icon: <Eye size={16} />,
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
        icon: <AlertTriangle size={16} />,
        content: (
          <>
            <InfoBox>
              <strong>Scoring:</strong> Pass/fail per checkpoint. Observe all 5 reps — record the pattern
              that appears in 3+ reps. If a compensation appears in any reps, note it.
            </InfoBox>
            <BulletList>
              <li>Clear area around client — they may lose balance</li>
              <li>If acute knee/back/shoulder pain, modify or skip</li>
              <li>If client can&apos;t hold dowel overhead (frozen shoulder), use arms-crossed-on-chest modification</li>
              <li>No warm-up before assessment — observe natural movement patterns</li>
              <li>Barefoot on clean, non-slippery surface</li>
            </BulletList>
          </>
        ),
      },
    ],
  },
  postural_analysis: {
    title: 'NASM Static Posture Assessment',
    sections: [
      {
        title: 'Equipment & Setup',
        icon: <Ruler size={16} />,
        content: (
          <>
            <BulletList>
              <li>Plumb line or vertical reference on wall (optional but ideal)</li>
              <li>Client wears minimal, form-fitting clothing</li>
              <li>Client removes shoes and socks</li>
              <li>Optional: posture grid chart, camera for documentation</li>
            </BulletList>
            <StepList>
              <li>Client stands in natural, relaxed posture — do NOT say &quot;stand up straight&quot;</li>
              <li>Feet hip-width apart, arms hanging naturally</li>
              <li>Client looks straight ahead at fixed point (not at trainer)</li>
              <li>Allow 10-15 seconds to settle into natural stance before observing</li>
            </StepList>
            <ClientScript>
              &quot;Just stand how you normally would. Look straight ahead at the wall.
              Try to relax — I&apos;m just going to observe your posture.&quot;
            </ClientScript>
          </>
        ),
      },
      {
        title: 'Anterior View (Front)',
        icon: <Eye size={16} />,
        content: (
          <CompensationTable>
            <thead>
              <tr><th>Checkpoint</th><th>What to Look For</th><th>Indicates</th></tr>
            </thead>
            <tbody>
              <tr><td>Head</td><td>Lateral tilt or rotation</td><td>SCM / upper trap imbalance</td></tr>
              <tr><td>Shoulders</td><td>One elevated, both rounded forward</td><td>Upper trap dominance, pec tightness</td></tr>
              <tr><td>Hips</td><td>One hip higher, lateral tilt</td><td>QL overactivity, glute med weakness</td></tr>
              <tr><td>Kneecaps</td><td>Rotated inward or outward</td><td>TFL/adductor or piriformis overactivity</td></tr>
              <tr><td>Feet</td><td>Toes turned out, arches collapsed</td><td>External hip rotator tightness, pronation</td></tr>
              <tr><td>Hands</td><td>Palms face backward (knuckles forward)</td><td>Internal rotation — pec/lat/subscap tightness</td></tr>
            </tbody>
          </CompensationTable>
        ),
      },
      {
        title: 'Lateral View (Side)',
        icon: <Eye size={16} />,
        content: (
          <CompensationTable>
            <thead>
              <tr><th>Checkpoint</th><th>What to Look For</th><th>Indicates</th></tr>
            </thead>
            <tbody>
              <tr><td>Head</td><td>Ear anterior to shoulder</td><td>Forward head — Upper Crossed</td></tr>
              <tr><td>Shoulders</td><td>Rounded forward past plumb line</td><td>Pec major/minor tightness — Upper Crossed</td></tr>
              <tr><td>Thoracic</td><td>Excessive kyphosis</td><td>Pec tightness, weak mid/lower trap</td></tr>
              <tr><td>Lumbar</td><td>Excessive lordosis (sway back)</td><td>Hip flexor tightness — Lower Crossed</td></tr>
              <tr><td>Pelvis</td><td>Anterior tilt (belt line angles down)</td><td>Lower Crossed Syndrome</td></tr>
              <tr><td>Knee</td><td>Hyperextension (locked back)</td><td>Soleus/gastroc overactivity</td></tr>
            </tbody>
          </CompensationTable>
        ),
      },
      {
        title: 'Upper Crossed Syndrome',
        icon: <Target size={16} />,
        content: (
          <>
            <InfoBox>
              <strong>Pattern:</strong> Forward head + rounded shoulders + thoracic kyphosis + scapular winging
            </InfoBox>
            <TwoColumn>
              <div>
                <SubLabel>Overactive (Tight)</SubLabel>
                <BulletList>
                  <li>Upper trapezius</li>
                  <li>Levator scapulae</li>
                  <li>Pectoralis major/minor</li>
                  <li>SCM (sternocleidomastoid)</li>
                </BulletList>
              </div>
              <div>
                <SubLabel>Underactive (Weak)</SubLabel>
                <BulletList>
                  <li>Deep cervical flexors</li>
                  <li>Mid/lower trapezius</li>
                  <li>Rhomboids</li>
                  <li>Serratus anterior</li>
                </BulletList>
              </div>
            </TwoColumn>
            <InfoBox>
              <strong>NASM CEx Corrective Strategy:</strong><br />
              1. Inhibit (foam roll): upper trap, pec major/minor<br />
              2. Lengthen (static stretch): upper trap, levator scapulae, pecs, lats<br />
              3. Activate: chin tucks, prone Y/T raises, push-up plus<br />
              4. Integrate: squat to row, ball combo exercises
            </InfoBox>
          </>
        ),
      },
      {
        title: 'Lower Crossed Syndrome',
        icon: <Target size={16} />,
        content: (
          <>
            <InfoBox>
              <strong>Pattern:</strong> Anterior pelvic tilt + excessive lordosis + protruding abdomen + knee hyperextension
            </InfoBox>
            <TwoColumn>
              <div>
                <SubLabel>Overactive (Tight)</SubLabel>
                <BulletList>
                  <li>Hip flexors (iliopsoas, rectus femoris, TFL)</li>
                  <li>Erector spinae (lumbar)</li>
                </BulletList>
              </div>
              <div>
                <SubLabel>Underactive (Weak)</SubLabel>
                <BulletList>
                  <li>Gluteus maximus</li>
                  <li>Hamstrings</li>
                  <li>TVA (transverse abdominis)</li>
                  <li>Internal oblique, multifidus</li>
                </BulletList>
              </div>
            </TwoColumn>
            <InfoBox>
              <strong>NASM CEx Corrective Strategy:</strong><br />
              1. Inhibit (foam roll): TFL, rectus femoris, adductors, erector spinae<br />
              2. Lengthen (static stretch): kneeling hip flexor stretch, erector spinae<br />
              3. Activate: glute bridges, prone hip extension, drawing-in maneuver, planks<br />
              4. Integrate: ball wall squats, step-ups with overhead press
            </InfoBox>
          </>
        ),
      },
    ],
  },
  performance_test: {
    title: 'NASM Performance Assessments',
    sections: [
      {
        title: 'Push-Up Test (Muscular Endurance)',
        icon: <Target size={16} />,
        content: (
          <>
            <StepList>
              <li><strong>Males:</strong> Standard push-up — hands wider than shoulders, full plank, feet together</li>
              <li><strong>Females:</strong> Modified — knees on ground, straight line from head to knees</li>
              <li>Start in up position (arms extended)</li>
              <li>Lower until chin/chest touches floor OR upper arms parallel to floor (90° elbows)</li>
              <li>Push back to full extension = 1 rep</li>
              <li>Perform max reps without stopping — no resting at top or bottom</li>
              <li>Test ends when: client stops, form breaks 2 consecutive reps, or can&apos;t complete full ROM</li>
            </StepList>
            <InfoBox>
              <strong>Norms (Males):</strong> 20-29yr: Avg 22-28 | Good 29-35 | Excellent 36+<br />
              <strong>Norms (Females modified):</strong> 20-29yr: Avg 15-20 | Good 21-29 | Excellent 30+
            </InfoBox>
          </>
        ),
      },
      {
        title: 'Davies Test (Upper Body Agility)',
        icon: <Target size={16} />,
        content: (
          <>
            <StepList>
              <li>Place two tape strips on floor <strong>36 inches apart</strong></li>
              <li>Client assumes push-up position with one hand on each line</li>
              <li>On &quot;Go&quot; — alternately reach across to touch opposite tape line, return, repeat</li>
              <li>Each hand crossing and touching = 1 touch</li>
              <li>Test lasts <strong>15 seconds</strong> — perform <strong>3 trials</strong> (30-60s rest between)</li>
              <li><strong>Score = average touches across 3 trials</strong></li>
            </StepList>
            <InfoBox>
              Excellent: 24+ | Good: 20-23 | Average: 15-19 | Below Average: {'<'}15
            </InfoBox>
            <BulletList>
              <li>Watch for: trunk rotation, hip hiking, loss of plank, asymmetry</li>
              <li>Client must hold stable plank — allow practice trial at half speed first</li>
            </BulletList>
          </>
        ),
      },
      {
        title: 'Shark Skill Test (Lower Body Agility)',
        icon: <Target size={16} />,
        content: (
          <>
            <InfoBox>
              Create a plus-sign grid with 9 boxes (12&quot; x 12&quot; each). Number 1-8 clockwise from top. Center = start.
            </InfoBox>
            <StepList>
              <li>Client stands on one leg in center square, hands on hips</li>
              <li>Hop: Center→1→Center→2→Center→3... through all 8 squares, always returning to center</li>
              <li>Time the full cycle. <strong>Penalties: +0.10s</strong> for each: non-stance foot touches ground, hands leave hips, step outside grid</li>
              <li><strong>Test both legs</strong> — compare for asymmetry ({'>'} 0.5s difference = unilateral deficiency)</li>
            </StepList>
            <InfoBox>
              Excellent: {'<'}10s | Good: 10-14.9s | Average: 15-19.9s | Below Avg: {'>'} 20s
            </InfoBox>
          </>
        ),
      },
      {
        title: 'Single-Leg Squat',
        icon: <Target size={16} />,
        content: (
          <>
            <StepList>
              <li>Client stands on one leg, arms out front for balance</li>
              <li>Squat down as low as comfortable — 5 reps per leg</li>
              <li>Place a chair behind for safety/depth reference</li>
              <li>Observe from anterior AND lateral views</li>
              <li><strong>Test both legs</strong></li>
            </StepList>
            <CompensationTable>
              <thead>
                <tr><th>Compensation</th><th>Overactive</th><th>Underactive</th></tr>
              </thead>
              <tbody>
                <tr><td>Knee valgus</td><td>Adductors, TFL/IT band</td><td>Glute med, glute max, VMO</td></tr>
                <tr><td>Hip drop (Trendelenburg)</td><td>Adductors on stance side</td><td>Glute med on stance side</td></tr>
                <tr><td>Trunk lean</td><td>QL, adductors on stance side</td><td>Glute med, core stabilizers</td></tr>
                <tr><td>Forward lean</td><td>Soleus, gastroc, hip flexors</td><td>Glute max, core</td></tr>
              </tbody>
            </CompensationTable>
          </>
        ),
      },
      {
        title: 'YMCA 3-Minute Step Test (Cardio)',
        icon: <Target size={16} />,
        content: (
          <>
            <BulletList>
              <li><strong>Equipment:</strong> 12-inch step, metronome at 96 BPM, stopwatch, HR monitor</li>
              <li>Cadence: 24 steps/min — each step cycle = up-up-down-down (4 beats)</li>
            </BulletList>
            <StepList>
              <li>Practice cadence for 15-20 seconds</li>
              <li>Client steps for exactly <strong>3 minutes</strong> at 96 BPM metronome cadence</li>
              <li>Alternate leading leg every minute to avoid fatigue</li>
              <li>At 3 minutes: &quot;Stop&quot; — client immediately sits down</li>
              <li>Within 5 seconds, begin counting pulse for <strong>60 seconds</strong></li>
              <li>Record the 60-second recovery HR — this is the test score</li>
            </StepList>
            <InfoBox>
              <strong>Norms (Males 20-29):</strong> Excellent {'<'}79 | Good 79-89 | Avg 100-105 | Poor {'>'} 128<br />
              <strong>Norms (Females 20-29):</strong> Excellent {'<'}85 | Good 85-98 | Avg 109-117 | Poor {'>'} 140
            </InfoBox>
            <BulletList>
              <li>If resting HR {'>'} 100 BPM, investigate before proceeding</li>
              <li>Stop immediately if: dizziness, chest pain, nausea, can&apos;t maintain cadence</li>
              <li>Not valid for clients on beta-blockers (HR response is blunted)</li>
            </BulletList>
          </>
        ),
      },
      {
        title: 'Assessment Sequencing',
        icon: <Ruler size={16} />,
        content: (
          <InfoBox>
            <strong>NASM Recommended Order:</strong><br />
            1. Health History / PAR-Q (10-15 min)<br />
            2. Static Posture Assessment (5-10 min)<br />
            3. Overhead Squat Assessment (5-10 min)<br />
            4. Single-Leg Squat (5 min)<br />
            5. Push-Up Test (3-5 min)<br />
            6. Davies Test (5 min)<br />
            7. Shark Skill Test (5-10 min)<br />
            8. Cardio Test — last, produces most fatigue (10-20 min)<br /><br />
            <strong>Total initial assessment: ~60-90 minutes</strong>
          </InfoBox>
        ),
      },
    ],
  },
};

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// ─────────────────────────────────────────────────────────────

const NASMTeachMode: React.FC<NASMTeachModeProps> = ({ assessmentType }) => {
  const [openSections, setOpenSections] = useState<Record<number, boolean>>({});
  const data = TEACH_DATA[assessmentType];

  if (!data) return null;

  const toggle = (idx: number) => {
    setOpenSections(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const expandAll = () => {
    const all: Record<number, boolean> = {};
    data.sections.forEach((_, i) => { all[i] = true; });
    setOpenSections(all);
  };

  const collapseAll = () => setOpenSections({});

  return (
    <TeachContainer>
      <TeachHeader>
        <BookOpen size={20} />
        <TeachTitle>{data.title}</TeachTitle>
        <ExpandControls>
          <ExpandBtn onClick={expandAll}>Expand All</ExpandBtn>
          <ExpandBtn onClick={collapseAll}>Collapse All</ExpandBtn>
        </ExpandControls>
      </TeachHeader>
      {data.sections.map((section, idx) => (
        <AccordionItem key={idx}>
          <AccordionHeader type="button" onClick={() => toggle(idx)} aria-expanded={!!openSections[idx]}>
            <AccordionLeft>
              {section.icon}
              <span>{section.title}</span>
            </AccordionLeft>
            {openSections[idx] ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </AccordionHeader>
          {openSections[idx] && (
            <AccordionBody>{section.content}</AccordionBody>
          )}
        </AccordionItem>
      ))}
    </TeachContainer>
  );
};

export default NASMTeachMode;
