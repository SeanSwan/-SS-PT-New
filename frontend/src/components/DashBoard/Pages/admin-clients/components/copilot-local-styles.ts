/**
 * ============================================================================
 * FILE: copilot-local-styles.ts
 * PURPOSE: Local styled components specific to CopilotPanel sub-components.
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-25
 * AI VILLAGE VALIDATED: 2026-03-25
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Houses styled components that are only used within the
 * WorkoutCopilotPanel sub-components (TabBar, TabButton, OverrideSection,
 * OverrideTextArea). Shared/reusable styles live in copilot-shared-styles.ts.
 *
 * HOW IT FITS IN THE APP: Imported by WorkoutCopilotPanel orchestrator and
 * CopilotIdleState sub-component.
 *
 * KEY DECISIONS: Separated from copilot-shared-styles.ts because these are
 * panel-specific layout components, not reusable primitives.
 */

import styled from 'styled-components';
import { SWAN_CYAN, TextArea } from './copilot-shared-styles';

// ─────────────────────────────────────────────────────────────
// SECTION: Tab navigation
// PURPOSE: Single/Long-Horizon tab bar within the copilot panel
// ─────────────────────────────────────────────────────────────

export const TabBar = styled.div`
  display: flex;
  gap: 8px;
  padding: 10px 24px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
`;

export const TabButton = styled.button<{ $active?: boolean }>`
  min-height: 40px;
  border: 1px solid ${({ $active }) => ($active ? SWAN_CYAN : 'rgba(255,255,255,0.15)')};
  border-bottom: none;
  border-radius: 10px 10px 0 0;
  padding: 8px 14px;
  color: ${({ $active }) => ($active ? SWAN_CYAN : '#cbd5e1')};
  background: ${({ $active }) => ($active ? 'rgba(139, 92, 246,0.08)' : 'rgba(255,255,255,0.02)')};
  font-weight: 700;
  letter-spacing: 0.02em;
  cursor: pointer;
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Admin override controls
// PURPOSE: Override reason entry for admin consent bypass
// ─────────────────────────────────────────────────────────────

export const OverrideSection = styled.div`
  border: 1px solid rgba(251, 191, 36, 0.4);
  border-radius: 10px;
  padding: 12px;
  background: rgba(120, 53, 15, 0.18);
`;

export const OverrideTextArea = styled(TextArea)<{ $required?: boolean }>`
  border-color: ${({ $required }) => ($required ? 'rgba(251, 191, 36, 0.7)' : 'rgba(255,255,255,0.15)')};
  box-shadow: ${({ $required }) => ($required ? '0 0 0 2px rgba(251,191,36,0.22)' : 'none')};
`;
