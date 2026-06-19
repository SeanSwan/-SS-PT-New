import { Ruler, Target } from 'lucide-react';
import { BulletList, CompensationTable, InfoBox, StepList } from './NASMTeachMode.styles';
import type { TeachModeData } from './NASMTeachMode.data.types';

export const performanceTeachData = {
  title: 'NASM Performance Assessments',
  sections: [
    {
      title: 'Push-Up Test (Muscular Endurance)',
      icon: <Target size={16} aria-hidden="true" />,
      content: (
        <>
          <StepList>
            <li><strong>Males:</strong> Standard push-up - hands wider than shoulders, full plank, feet together</li>
            <li><strong>Females:</strong> Modified - knees on ground, straight line from head to knees</li>
            <li>Start in up position (arms extended)</li>
            <li>Lower until chin/chest touches floor OR upper arms parallel to floor (90 degree elbows)</li>
            <li>Push back to full extension = 1 rep</li>
            <li>Perform max reps without stopping - no resting at top or bottom</li>
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
      icon: <Target size={16} aria-hidden="true" />,
      content: (
        <>
          <StepList>
            <li>Place two tape strips on floor <strong>36 inches apart</strong></li>
            <li>Client assumes push-up position with one hand on each line</li>
            <li>On &quot;Go&quot; - alternately reach across to touch opposite tape line, return, repeat</li>
            <li>Each hand crossing and touching = 1 touch</li>
            <li>Test lasts <strong>15 seconds</strong> - perform <strong>3 trials</strong> (30-60s rest between)</li>
            <li><strong>Score = average touches across 3 trials</strong></li>
          </StepList>
          <InfoBox>Excellent: 24+ | Good: 20-23 | Average: 15-19 | Below Average: {'<'}15</InfoBox>
          <BulletList>
            <li>Watch for: trunk rotation, hip hiking, loss of plank, asymmetry</li>
            <li>Client must hold stable plank - allow practice trial at half speed first</li>
          </BulletList>
        </>
      ),
    },
    {
      title: 'Shark Skill Test (Lower Body Agility)',
      icon: <Target size={16} aria-hidden="true" />,
      content: (
        <>
          <InfoBox>Create a plus-sign grid with 9 boxes (12&quot; x 12&quot; each). Number 1-8 clockwise from top. Center = start.</InfoBox>
          <StepList>
            <li>Client stands on one leg in center square, hands on hips</li>
            <li>Hop: Center to 1 to Center to 2 to Center to 3, continuing through all 8 squares</li>
            <li>Time the full cycle. <strong>Penalties: +0.10s</strong> for each: non-stance foot touches ground, hands leave hips, step outside grid</li>
            <li><strong>Test both legs</strong> - compare for asymmetry ({'>'} 0.5s difference = unilateral deficiency)</li>
          </StepList>
          <InfoBox>Excellent: {'<'}10s | Good: 10-14.9s | Average: 15-19.9s | Below Avg: {'>'} 20s</InfoBox>
        </>
      ),
    },
    {
      title: 'Single-Leg Squat',
      icon: <Target size={16} aria-hidden="true" />,
      content: (
        <>
          <StepList>
            <li>Client stands on one leg, arms out front for balance</li>
            <li>Squat down as low as comfortable - 5 reps per leg</li>
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
      icon: <Target size={16} aria-hidden="true" />,
      content: (
        <>
          <BulletList>
            <li><strong>Equipment:</strong> 12-inch step, metronome at 96 BPM, stopwatch, HR monitor</li>
            <li>Cadence: 24 steps/min - each step cycle = up-up-down-down (4 beats)</li>
          </BulletList>
          <StepList>
            <li>Practice cadence for 15-20 seconds</li>
            <li>Client steps for exactly <strong>3 minutes</strong> at 96 BPM metronome cadence</li>
            <li>Alternate leading leg every minute to avoid fatigue</li>
            <li>At 3 minutes: &quot;Stop&quot; - client immediately sits down</li>
            <li>Within 5 seconds, begin counting pulse for <strong>60 seconds</strong></li>
            <li>Record the 60-second recovery HR - this is the test score</li>
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
      icon: <Ruler size={16} aria-hidden="true" />,
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
          8. Cardio Test - last, produces most fatigue (10-20 min)<br /><br />
          <strong>Total initial assessment: ~60-90 minutes</strong>
        </InfoBox>
      ),
    },
  ],
} satisfies TeachModeData;
