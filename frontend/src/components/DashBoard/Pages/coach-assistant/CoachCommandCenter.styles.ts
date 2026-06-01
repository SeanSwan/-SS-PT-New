/**
 * FILE: CoachCommandCenter.styles.ts
 * PURPOSE: Styled-components shell for the admin Swan Coach Command Center.
 */

import styled from 'styled-components';

import { coachCommandComposerStyles } from './CoachCommandCenter.composerStyles';
import { coachCommandFoundationStyles } from './CoachCommandCenter.foundationStyles';
import { coachCommandResponsiveStyles } from './CoachCommandCenter.responsiveStyles';
import { coachCommandShellStyles } from './CoachCommandCenter.shellStyles';
import { coachCommandWorkspaceStyles } from './CoachCommandCenter.workspaceStyles';

export const CommandCenterShell = styled.div`
  ${coachCommandShellStyles}
  ${coachCommandFoundationStyles}
  ${coachCommandWorkspaceStyles}
  ${coachCommandComposerStyles}
  ${coachCommandResponsiveStyles}
`;