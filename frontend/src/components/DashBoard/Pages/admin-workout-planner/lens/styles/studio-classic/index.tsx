/**
 * LENS: studio-classic (S19 — JARVIS blueprint §5.2 #1) — THE DEFAULT.
 * Wraps today's ThreePanel verbatim: Rolodex ‖ Builder ‖ Teach, coach dock
 * after the grid. No new styles, no density change, no motion change — this
 * lens exists so the registry has a no-regression floor that renders
 * byte-identically to the pre-lens production layout (L9).
 */
import React from 'react';
import { ThreePanel } from '../../../WorkoutPlannerStyles';
import type { PlannerLensComponent } from '../../slots';

const StudioClassic: PlannerLensComponent = ({ rolodex, builder, teach, coachDock, teachModeOpen }) => (
  <>
    <ThreePanel $teachModeOpen={teachModeOpen}>
      {rolodex}
      {builder}
      {teach}
    </ThreePanel>
    {coachDock}
  </>
);

export default StudioClassic;
