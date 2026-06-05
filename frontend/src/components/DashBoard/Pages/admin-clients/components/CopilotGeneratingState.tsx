/**
 * CopilotGeneratingState
 *
 * Pure UI for the single-workout Swan Coach generation-in-progress state.
 */
import React from 'react';

import { GeneratingCopy, GeneratingTitle } from './copilot-local-styles';
import { CenterContent, Spinner, SWAN_CYAN } from './copilot-shared-styles';

const CopilotGeneratingState: React.FC = () => (
  <CenterContent>
    <Spinner size={48} color={SWAN_CYAN} />
    <GeneratingTitle>Generating Workout Plan...</GeneratingTitle>
    <GeneratingCopy>
      Analyzing client profile, training history, and NASM constraints.
      This may take 10-30 seconds.
    </GeneratingCopy>
  </CenterContent>
);

export default React.memo(CopilotGeneratingState);
