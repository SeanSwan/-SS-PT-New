import { Eye, Ruler, Target } from 'lucide-react';
import {
  BulletList,
  ClientScript,
  CompensationTable,
  InfoBox,
  StepList,
  SubLabel,
  TwoColumn,
} from './NASMTeachMode.styles';
import type { TeachModeData } from './NASMTeachMode.data.types';

export const postureTeachData = {
  title: 'NASM Static Posture Assessment',
  sections: [
    {
      title: 'Equipment & Setup',
      icon: <Ruler size={16} aria-hidden="true" />,
      content: (
        <>
          <BulletList>
            <li>Plumb line or vertical reference on wall (optional but ideal)</li>
            <li>Client wears minimal, form-fitting clothing</li>
            <li>Client removes shoes and socks</li>
            <li>Optional: posture grid chart, camera for documentation</li>
          </BulletList>
          <StepList>
            <li>Client stands in natural, relaxed posture - do NOT say &quot;stand up straight&quot;</li>
            <li>Feet hip-width apart, arms hanging naturally</li>
            <li>Client looks straight ahead at fixed point (not at trainer)</li>
            <li>Allow 10-15 seconds to settle into natural stance before observing</li>
          </StepList>
          <ClientScript>
            &quot;Just stand how you normally would. Look straight ahead at the wall.
            Try to relax - I&apos;m just going to observe your posture.&quot;
          </ClientScript>
        </>
      ),
    },
    {
      title: 'Anterior View (Front)',
      icon: <Eye size={16} aria-hidden="true" />,
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
            <tr><td>Hands</td><td>Palms face backward (knuckles forward)</td><td>Internal rotation - pec/lat/subscap tightness</td></tr>
          </tbody>
        </CompensationTable>
      ),
    },
    {
      title: 'Lateral View (Side)',
      icon: <Eye size={16} aria-hidden="true" />,
      content: (
        <CompensationTable>
          <thead>
            <tr><th>Checkpoint</th><th>What to Look For</th><th>Indicates</th></tr>
          </thead>
          <tbody>
            <tr><td>Head</td><td>Ear anterior to shoulder</td><td>Forward head - Upper Crossed</td></tr>
            <tr><td>Shoulders</td><td>Rounded forward past plumb line</td><td>Pec major/minor tightness - Upper Crossed</td></tr>
            <tr><td>Thoracic</td><td>Excessive kyphosis</td><td>Pec tightness, weak mid/lower trap</td></tr>
            <tr><td>Lumbar</td><td>Excessive lordosis (sway back)</td><td>Hip flexor tightness - Lower Crossed</td></tr>
            <tr><td>Pelvis</td><td>Anterior tilt (belt line angles down)</td><td>Lower Crossed Syndrome</td></tr>
            <tr><td>Knee</td><td>Hyperextension (locked back)</td><td>Soleus/gastroc overactivity</td></tr>
          </tbody>
        </CompensationTable>
      ),
    },
    {
      title: 'Upper Crossed Syndrome',
      icon: <Target size={16} aria-hidden="true" />,
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
      icon: <Target size={16} aria-hidden="true" />,
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
} satisfies TeachModeData;
