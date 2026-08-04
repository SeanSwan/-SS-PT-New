/**
 * CoachReferenceTab — the Coach drawer's read-mostly half.
 * Order is deliberate: the terms index comes FIRST, because the question
 * a trainer actually arrives with is "what does this number mean?"
 * (Sean, 2026-07-31 — PR/RPE were printed everywhere, explained nowhere).
 * Then verbosity (learning mode), then the OPT phase guide.
 * Extracted from WorkoutLogger.tsx to hold the shell's line ratchet.
 */
import React from 'react';
import SwanTermsIndex from './SwanTermsIndex';
import { LearningModeToggle } from './NASMLearningMode';
import NASMPhaseGuide from './NASMPhaseGuide';

export interface CoachReferenceTabProps {
  currentOPTPhase: number;
  /** Loads the phase template and closes the drawer so the result is visible. */
  onLoadTemplate: (phase: number) => void;
}

const CoachReferenceTab: React.FC<CoachReferenceTabProps> = ({ currentOPTPhase, onLoadTemplate }) => (
  <>
    <SwanTermsIndex />
    <LearningModeToggle />
    <NASMPhaseGuide phase={currentOPTPhase} onLoadTemplate={onLoadTemplate} />
  </>
);

export default CoachReferenceTab;
