import { useEffect, useState } from 'react';
import type { ExerciseSlim } from './useExerciseSearch';

export const ROW_HEIGHT = 56;
export const MAX_ROWS_MOBILE = 6;
export const MAX_ROWS_DESKTOP = 10;
export const DESKTOP_BREAKPOINT_MQ = '(min-width: 768px)';

export const EQUIPMENT_TYPES = ['All', 'Bodyweight', 'Dumbbell', 'Barbell', 'Machine', 'Cable', 'Band', 'Kettlebell', 'Ball', 'BOSU'];
export const EXERCISE_TYPES = ['All', 'Compound', 'Isolation', 'Calisthenics', 'Stability', 'Flexibility'];

export function useVisibleRowCount(): number {
  const [rows, setRows] = useState(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return MAX_ROWS_MOBILE;
    return window.matchMedia(DESKTOP_BREAKPOINT_MQ).matches ? MAX_ROWS_DESKTOP : MAX_ROWS_MOBILE;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia(DESKTOP_BREAKPOINT_MQ);
    const handler = (event: MediaQueryListEvent) => setRows(event.matches ? MAX_ROWS_DESKTOP : MAX_ROWS_MOBILE);
    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    }
    mq.addListener(handler);
    return () => mq.removeListener(handler);
  }, []);

  return rows;
}

export function parseEquipment(eq: unknown): string[] {
  if (!eq) return [];
  if (Array.isArray(eq)) return eq.filter(Boolean);
  if (typeof eq === 'string') {
    if (eq === '[]' || eq === '') return [];
    try {
      const parsed = JSON.parse(eq);
      if (Array.isArray(parsed)) return parsed.filter(Boolean);
    } catch {
      return [eq];
    }
  }
  return [];
}

export function getExerciseTips(ex: ExerciseSlim): string {
  if (ex.description && ex.description.length > 20) return ex.description;

  const name = ex.name.toLowerCase();
  if (name.includes('squat') && (name.includes('jump') || name.includes('box'))) return 'Explode upward from squat. Land softly with bent knees. Absorb impact immediately into next rep.';
  if (name.includes('goblet squat')) return 'Hold weight at chest, elbows down. Squat deep keeping torso upright, elbows inside knees. Drive through heels.';
  if (name.includes('squat')) return 'Feet shoulder-width, toes slightly out. Push hips back, bend knees. Chest up, knees track over toes. Drive through heels.';
  if (name.includes('bench press')) return 'Lie on bench, feet flat. Grip slightly wider than shoulders. Lower bar to mid-chest (3s down). Press up explosively. Keep shoulder blades retracted.';
  if (name.includes('overhead press') || name.includes('military') || name.includes('shoulder press')) return 'Stand hip-width. Hold at shoulder height. Brace core, squeeze glutes. Press straight overhead to full lockout. Lower with control.';
  if (name.includes('push up') || name.includes('pushup')) return 'Hands wider than shoulders. Straight line head to heels. Lower chest close to floor. Push up explosively. No hip sag.';
  if (name.includes('press') || name.includes('push')) return 'Stable base. Control the lowering phase. Press with intent. Core braced, natural spine throughout.';
  if (name.includes('pull up') || name.includes('pullup') || name.includes('chin up')) return 'Hang fully extended. Retract shoulder blades, pull until chin clears bar. Lower with control. No kipping.';
  if (name.includes('bent') && name.includes('row')) return 'Hinge to roughly 45 degrees. Pull bar to lower ribs, squeeze shoulder blades. Lower with control. Flat back throughout.';
  if (name.includes('row')) return 'Retract shoulder blades first. Drive elbows back past torso. Squeeze between shoulder blades at top. Control the return.';
  if (name.includes('deadlift') || name.includes('rdl') || name.includes('romanian')) return 'Feet hip-width, bar over mid-foot. Hinge at hips. Keep bar close to body, spine neutral. Lockout by squeezing glutes.';
  if (name.includes('reverse lunge')) return 'Step backward. Lower until both knees are roughly 90 degrees. Front knee behind toes. Drive through front heel to return.';
  if (name.includes('walking lunge')) return 'Step forward into lunge. Both knees roughly 90 degrees. Drive through front heel, then step the back foot forward.';
  if (name.includes('lateral lunge') || name.includes('side lunge')) return 'Step wide to one side, push hips back. Bend stepping leg, keep other leg straight. Push off to return. Toes forward.';
  if (name.includes('lunge')) return 'Step forward with control. Both knees roughly 90 degrees. Front knee tracks over toes. Push back through front heel.';
  if (name.includes('curl')) return 'Elbows pinned to sides. Curl up, squeeze hard at top, then lower slowly. No swinging or momentum.';
  if (name.includes('plank') || name.includes('dead bug') || name.includes('bird dog')) return 'Keep a straight line and draw the belly button toward the spine. Breathe steadily. No hip sag or pike.';
  if (name.includes('jump') || name.includes('hop') || name.includes('burpee') || name.includes('bound')) return 'Athletic stance, soft knees. Explode up with triple extension. Land softly with knees tracking over toes.';
  if (name.includes('stretch') || name.includes('foam roll') || name.includes('mobility')) return 'Move slowly into position. Hold static stretches 20-30 seconds. For foam rolling, use moderate pressure and move slowly.';
  if (name.includes('crunch') || name.includes('sit up') || name.includes('ab ')) return 'Knees bent, feet flat. Hands lightly behind head. Curl shoulder blades off floor and lower with control.';
  if (name.includes('fly') || name.includes('flye') || name.includes('crossover')) return 'Keep a slight elbow bend. Control the stretch phase. Squeeze at contraction. Use a slower lowering tempo.';
  if (name.includes('lateral raise') || name.includes('side raise')) return 'Slight forward lean. Lead with elbows. Raise to shoulder height only. Lower slowly. Do not shrug.';
  if (name.includes('step up') || name.includes('step-up')) return 'Full foot on box. Drive through the working-leg heel. Control the descent. Keep torso upright.';
  if (name.includes('sprint') || name.includes('run') || name.includes('shuttle')) return 'Drive knees high with powerful arm swing. Land on the balls of the feet. Lean forward from the ankles.';
  if (name.includes('rope') || name.includes('slam') || name.includes('throw')) return 'Generate power from hips and core. Keep an athletic stance, soft knees, and a braced core.';
  if (name.includes('kickback') || name.includes('extension') || name.includes('skull')) return 'Isolate the target joint. Fully extend, squeeze briefly, then control the return. Prioritize form.';
  if (name.includes('machine') || name.includes('leg press') || name.includes('lat pull')) return 'Adjust the machine to fit your body. Move through full range with control. Avoid locking joints.';
  return 'Controlled movement through full range of motion. Keep proper alignment, core engaged, and breathe out during exertion.';
}
