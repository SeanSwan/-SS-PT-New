import React, { useState } from 'react';
import { BookOpen, ChevronDown, ChevronUp } from 'lucide-react';
import styled from 'styled-components';
import { formatMuscle } from './BootcampBuilderConstants';
import type { BootcampExercise } from '../../hooks/useBootcampAPI';

interface ExerciseDetailTeachMeProps {
  selectedExercise: BootcampExercise;
}

const bootcampTeachMeTipKey = (tip: string): string => `tip|${tip}`;

export function isMeaningfulVariation(
  variation: string | null | undefined,
  exerciseName: string,
): variation is string {
  const v = (variation ?? '').trim();
  return v.length > 0 && v.toLowerCase() !== exerciseName.trim().toLowerCase();
}

const TeachMeWrap = styled.div`
  margin: 8px 0;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.1));
  border-radius: 8px;
  overflow: hidden;
`;

const TeachMeHeader = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  padding: 10px 12px;
  min-height: 44px;
  border: none;
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 5%, transparent);
  color: var(--accent-primary, #60C0F0);
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  text-align: left;
  &:hover { background: color-mix(in srgb, var(--accent-primary, #60C0F0) 8%, transparent); }
`;

const TeachMeBody = styled.div`
  padding: 10px 12px;
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  line-height: 1.6;
  color: var(--text-secondary, rgba(224, 236, 244, 0.7));
`;

const TeachMeRow = styled.div`
  margin-bottom: 8px;
`;

const TeachMeLabel = styled.span`
  font-weight: 700;
  color: var(--accent-primary, #60C0F0);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.3px;
`;

export function getExerciseTeachMe(ex: BootcampExercise) {
  const muscles = ex.muscleTargets?.split(',').map(m => m.trim()).filter(Boolean) || [];
  const equipment = ex.equipmentRequired || 'Bodyweight';
  const description = (ex as any).description || '';

  if (description && description.length > 20) {
    return { muscles, equipment, tips: [description], isGeneric: false };
  }

  const name = ex.exerciseName.toLowerCase();
  const tips: string[] = [];

  if (name.includes('squat')) {
    if (name.includes('jump') || name.includes('box jump')) tips.push('Start in squat position. Explode upward, fully extending hips and knees. Land softly with bent knees, absorbing impact. Immediately descend into next rep.');
    else if (name.includes('goblet')) tips.push('Hold a dumbbell/kettlebell at chest height with both hands, elbows pointing down. Feet shoulder-width, toes slightly out. Squat deep, keeping torso upright and elbows inside knees. Drive through heels to stand.');
    else if (name.includes('sumo')) tips.push('Wide stance, toes pointed outward 45 degrees. Push hips back and bend knees, tracking over toes. Keep chest tall and core braced. Drive through heels to return to standing.');
    else if (name.includes('split') || name.includes('bulgarian')) tips.push('Rear foot elevated on bench. Lower until front thigh is parallel to floor. Keep front knee over ankle, torso upright. Drive through front heel to stand.');
    else if (name.includes('overhead')) tips.push('Hold weight overhead with locked arms. Perform a full squat while keeping arms vertical. Requires significant shoulder and thoracic mobility. Start light.');
    else tips.push('Stand with feet shoulder-width apart, toes slightly out. Push hips back and bend knees. Keep chest up and knees tracking over toes. Drive through heels to stand.');
  } else if (name.includes('bench press')) tips.push('Lie on bench with feet flat on floor. Grip bar slightly wider than shoulders. Lower bar to mid-chest with control (3 seconds down). Press up explosively to full lockout. Keep shoulder blades retracted and core braced.');
  else if (name.includes('overhead press') || name.includes('military press') || name.includes('shoulder press')) tips.push('Stand with feet hip-width. Hold weight at shoulder height, palms forward. Brace core and squeeze glutes. Press straight overhead until arms are fully extended. Lower with control to starting position.');
  else if (name.includes('push up') || name.includes('pushup') || name.includes('push-up')) tips.push('Hands slightly wider than shoulders. Body straight from head to heels. Lower chest to 1-2 inches from floor (3 seconds down). Push up explosively. Keep core tight - no hip sag or pike.');
  else if (name.includes('press')) tips.push('Set up with stable base. Control the lowering (eccentric) phase for 2-3 seconds. Press with intent through the concentric phase. Maintain core brace and natural spine throughout.');
  else if (name.includes('pull up') || name.includes('pullup') || name.includes('chin up') || name.includes('chinup')) tips.push('Hang from bar with arms fully extended. Retract shoulder blades, then pull until chin clears bar. Lower with control (3 seconds). Avoid kipping or swinging. If needed, use a band for assistance.');
  else if (name.includes('row')) {
    if (name.includes('bent') || name.includes('barbell')) tips.push('Hinge forward to ~45 degrees, slight knee bend. Pull bar to lower ribcage, squeezing shoulder blades together. Lower with control. Keep back flat and core engaged throughout.');
    else if (name.includes('cable') || name.includes('seated')) tips.push('Sit with feet on pads, slight knee bend. Pull handle to lower chest/upper abdomen. Squeeze shoulder blades together at contraction. Return slowly, maintaining upright posture.');
    else if (name.includes('dumbbell') || name.includes('one arm') || name.includes('single')) tips.push('Place one hand and knee on bench. Pull dumbbell to hip, elbow driving past torso. Squeeze lat at top. Lower slowly. Keep hips square - no rotation.');
    else tips.push('Retract shoulder blades before pulling. Drive elbows back, squeezing between shoulder blades. Keep core tight and avoid momentum. Control both the pull and the return.');
  } else if (name.includes('deadlift') || name.includes('rdl') || name.includes('romanian')) tips.push('Stand with feet hip-width, bar over mid-foot. Hinge at hips, pushing butt back. Grip bar and drive through floor. Keep bar close to body, spine neutral. Lockout by squeezing glutes at top. Return with controlled hip hinge.');
  else if (name.includes('lunge')) {
    if (name.includes('reverse')) tips.push('Stand tall. Step backward, lowering until both knees are at ~90 degrees. Keep front knee behind toes. Push through front heel to return to start. Alternate legs or complete one side first.');
    else if (name.includes('walking')) tips.push('Step forward into a lunge. Lower until both knees are at ~90 degrees. Drive through front heel and step the back foot forward into the next lunge. Maintain upright torso throughout.');
    else if (name.includes('lateral') || name.includes('side')) tips.push('Step wide to one side, pushing hips back. Bend the stepping leg while keeping the other straight. Push off the bent leg to return. Keep toes pointed forward throughout.');
    else tips.push('Step forward with control. Lower until both knees are at ~90 degrees. Keep front knee tracking over toes. Push back to start through front heel.');
  } else if (name.includes('curl')) tips.push('Keep elbows pinned to your sides throughout the movement. Curl the weight up with a controlled 2-second concentric. Squeeze the bicep hard at the peak contraction. Lower slowly for 3-4 seconds (eccentric control). Avoid swinging or using momentum.');
  else if (name.includes('plank') || name.includes('hold') || name.includes('dead bug') || name.includes('bird dog')) tips.push('Maintain a rigid, straight line from head to heels. Engage core by drawing belly button toward spine. Breathe steadily - do not hold your breath. Keep hips level - no sagging or piking. Hold for prescribed time with perfect form.');
  else if (name.includes('jump') || name.includes('hop') || name.includes('bound') || name.includes('plyometric') || name.includes('burpee')) tips.push('Start in athletic stance with soft knees. Explode upward using triple extension (ankles, knees, hips). Swing arms to generate momentum. Land softly on balls of feet, immediately absorbing into the next rep. Keep knees tracking over toes on landing.');
  else if (name.includes('stretch') || name.includes('foam roll') || name.includes('mobility')) tips.push('Move into the stretch slowly until you feel mild tension (never pain). Hold for 20-30 seconds for static stretches. Breathe deeply and relax into the stretch. For foam rolling: apply moderate pressure and roll slowly (1 inch per second) over the target area.');
  else if (name.includes('crunch') || name.includes('sit up') || name.includes('situp') || name.includes('ab ')) tips.push('Lie on back with knees bent, feet flat. Place hands lightly behind head without pulling on the neck. Curl shoulder blades off the floor by contracting abs. Lower slowly with control. Focus on the squeeze, not the range of motion.');
  else if (name.includes('fly') || name.includes('flye') || name.includes('crossover')) tips.push('Maintain a slight bend in elbows throughout. Control the stretch phase - do not let the weight pull you. Squeeze the target muscle at peak contraction. Use a 2-second up, 3-second down tempo.');
  else if (name.includes('lateral raise') || name.includes('side raise')) tips.push('Stand tall with slight forward lean. Lead the movement with your elbows, not your hands. Raise to shoulder height - no higher. Lower slowly for 3 seconds. Do not shrug your shoulders during the lift.');
  else if (name.includes('kickback') || name.includes('extension') || name.includes('skull')) tips.push('Isolate the target joint - minimize other movement. Fully extend through the concentric phase. Squeeze at full contraction for 1 second. Control the return (eccentric) for 3 seconds. Use lighter weight and prioritize form.');
  else if (name.includes('step up') || name.includes('step-up') || name.includes('box step')) tips.push('Place foot fully on the box/step. Drive through the heel of the working leg to stand. Control the descent - do not drop down. Keep torso upright throughout. Lead with the same leg for prescribed reps, then switch.');
  else if (name.includes('sprint') || name.includes('run') || name.includes('jog') || name.includes('shuttle')) tips.push('Drive knees high with powerful arm swing. Land on the balls of your feet. Maintain forward lean from ankles, not waist. For sprints: maximum effort for the prescribed distance/time. For jogging: maintain conversational pace.');
  else if (name.includes('machine') || name.includes('leg press') || name.includes('lat pull')) tips.push('Adjust the machine to fit your body (seat height, pad position). Start with a controlled concentric movement. Squeeze the target muscle at peak contraction. Return slowly through the full range of motion. Do not lock out joints at the end range.');
  else if (name.includes('rope') || name.includes('slam') || name.includes('throw') || name.includes('toss')) tips.push('Generate power from your hips and core, not just your arms. Maintain athletic stance with soft knees. Create full waves/movements with maximum amplitude. Keep core braced throughout. Breathe in rhythm with the movements.');
  else {
    const bp = (ex.muscleTargets || '').toLowerCase();
    if (bp.includes('chest') || bp.includes('pec')) tips.push('Set up with shoulders retracted and depressed. Control the stretch phase to a full range of motion. Squeeze the chest muscles at peak contraction. Maintain core engagement throughout. Breathe out during the exertion phase.');
    else if (bp.includes('back') || bp.includes('lat')) tips.push('Initiate the movement by retracting shoulder blades. Pull through the elbows, driving them behind your torso. Squeeze your back muscles at peak contraction. Control the return for 2-3 seconds. Avoid rounding the spine.');
    else if (bp.includes('shoulder') || bp.includes('delt')) tips.push('Maintain stable shoulder joint - avoid shrugging traps. Control the movement through full range of motion. Avoid excessive momentum. Keep core braced for overhead movements. Start light and prioritize form over load.');
    else if (bp.includes('quad') || bp.includes('glute') || bp.includes('hamstring') || bp.includes('leg')) tips.push('Drive through the heels for hip-dominant exercises. Keep knees tracking over toes. Maintain neutral spine and upright torso. Control the descent phase for 2-3 seconds. Full range of motion on every rep.');
    else if (bp.includes('core') || bp.includes('ab')) tips.push('Engage the transverse abdominis first by drawing the belly button in. Move with control - momentum defeats the purpose. Breathe steadily throughout. Focus on the quality of the contraction, not speed. Keep lower back pressed into the floor on supine exercises.');
    else if (bp.includes('arm') || bp.includes('bicep') || bp.includes('tricep')) tips.push('Isolate the target muscle - minimize shoulder and body movement. Control through the full range of motion. Squeeze at peak contraction for 1 second. Lower slowly for 3 seconds (eccentric emphasis). Avoid using momentum to swing the weight.');
    else tips.push('Set up with proper posture and alignment. Perform each rep with controlled tempo. Focus on the target muscle contraction. Breathe out during exertion, in during the return. Maintain core engagement throughout the movement.');
  }

  return { muscles, equipment, tips, isGeneric: true };
}

const ExerciseDetailTeachMe: React.FC<ExerciseDetailTeachMeProps> = ({ selectedExercise }) => {
  const [teachMeOpen, setTeachMeOpen] = useState(true);
  const info = getExerciseTeachMe(selectedExercise);

  return (
    <TeachMeWrap>
      <TeachMeHeader onClick={() => setTeachMeOpen(!teachMeOpen)}>
        <BookOpen size={14} />
        How to Perform
        {teachMeOpen ? <ChevronUp size={14} style={{ marginLeft: 'auto' }} /> : <ChevronDown size={14} style={{ marginLeft: 'auto' }} />}
      </TeachMeHeader>
      {teachMeOpen && (
        <TeachMeBody>
          <TeachMeRow>
            <TeachMeLabel>Target Muscles: </TeachMeLabel>
            {info.muscles.length > 0 ? info.muscles.map(m => formatMuscle(m)).join(', ') : 'Full Body'}
          </TeachMeRow>
          <TeachMeRow>
            <TeachMeLabel>Equipment: </TeachMeLabel>
            {info.equipment}
          </TeachMeRow>
          <TeachMeRow>
            <TeachMeLabel>{info.isGeneric ? 'General Form Cues: ' : 'Instructions: '}</TeachMeLabel>
            {info.tips.map((t) => <div key={bootcampTeachMeTipKey(t)} style={{ marginTop: 4 }}>{t}</div>)}
            {info.isGeneric && (
              <div style={{ marginTop: 6, fontSize: 11, opacity: 0.6, fontStyle: 'italic' }}>
                General guidance based on the exercise name - not yet specific to this exercise.
              </div>
            )}
          </TeachMeRow>
          {selectedExercise.easyVariation && (
            <TeachMeRow>
              <TeachMeLabel>Easier Option: </TeachMeLabel>
              {selectedExercise.easyVariation}
            </TeachMeRow>
          )}
          {selectedExercise.hardVariation && (
            <TeachMeRow>
              <TeachMeLabel>Harder Option: </TeachMeLabel>
              {selectedExercise.hardVariation}
            </TeachMeRow>
          )}
        </TeachMeBody>
      )}
    </TeachMeWrap>
  );
};

export default ExerciseDetailTeachMe;
