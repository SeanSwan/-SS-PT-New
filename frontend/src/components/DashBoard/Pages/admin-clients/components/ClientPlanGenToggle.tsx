/**
 * ClientPlanGenToggle
 * ====================
 *
 * L5 (2026-05-02) admin UI surface for flipping the per-client
 * `canGenerateWorkoutPlans` flag on/off. Self-contained component:
 *   - Reads `initialValue` and renders the current state.
 *   - On click, optimistically updates the toggle, calls the admin
 *     PUT endpoint, and reverts on failure.
 *   - Shows a subtle "Server-side env flag also required" caption so
 *     admins understand this is one of two switches gating client
 *     self-service plan generation (the other is the
 *     ENABLE_CLIENT_PLAN_SELFGEN env var on the backend, which Sean
 *     toggles manually on Render after rollout).
 *
 * Crystalline Swan styling. Dark-first. Uses var(--token, #fallback)
 * per Rule 6. 44px min touch target per Rule 2.
 */
import React, { useState } from 'react';
import styled from 'styled-components';
import { Sparkles, AlertCircle } from 'lucide-react';
import { adminClientService } from '../../../../../services/adminClientService';

interface Props {
  clientId: number | string;
  clientName?: string;
  initialValue: boolean;
  /** Optional callback fired on a successful toggle (after server confirms). */
  onUpdated?: (newValue: boolean) => void;
}

const ClientPlanGenToggleBase: React.FC<Props> = ({
  clientId, clientName, initialValue, onUpdated,
}) => {
  const [enabled, setEnabled] = useState<boolean>(!!initialValue);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleToggle = async () => {
    if (isSaving) return;
    const next = !enabled;
    // Optimistic UI - flip immediately, revert on failure.
    setEnabled(next);
    setIsSaving(true);
    setError(null);
    try {
      await adminClientService.updateClient(String(clientId), {
        canGenerateWorkoutPlans: next,
      });
      onUpdated?.(next);
    } catch (err: unknown) {
      // Revert + surface the error inline.
      setEnabled(!next);
      const msg = err instanceof Error ? err.message : 'Failed to update flag';
      setError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Wrapper>
      <Header>
        <Sparkles size={16} />
        <HeaderTitle>Self-service workout plan generation</HeaderTitle>
      </Header>

      <Body>
        <ToggleRow>
          <ToggleSwitch
            type="button"
            role="switch"
            aria-checked={enabled}
            aria-label={`Toggle workout plan self-service for ${clientName || `client ${clientId}`}`}
            $on={enabled}
            $disabled={isSaving}
            disabled={isSaving}
            onClick={handleToggle}
          >
            <ToggleKnob $on={enabled} />
          </ToggleSwitch>
          <StateLabel $on={enabled}>
            {enabled ? 'Enabled' : 'Disabled'}
            {isSaving ? <SavingPip>· saving…</SavingPip> : null}
          </StateLabel>
        </ToggleRow>

        <Caption>
          When on, this client can generate their own workout plans from the
          client dashboard. When off, only the trainer or admin can generate
          plans for them.
        </Caption>

        <ServerNote>
          <AlertCircle size={12} />
          Server-side env flag <code>ENABLE_CLIENT_PLAN_SELFGEN</code> must
          also be on for the route to honor this — both switches are required.
        </ServerNote>

        {error ? <ErrorRow>{error}</ErrorRow> : null}
      </Body>
    </Wrapper>
  );
};

export default React.memo(ClientPlanGenToggleBase);

// ─── Styled ────────────────────────────────────────────

const Wrapper = styled.div`
  margin-top: 12px;
  padding: 12px 14px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 6%, var(--bg-elevated, #141419));
  border: 1px solid color-mix(in srgb, var(--accent-secondary, #8B5CF6) 18%, transparent);
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  color: var(--accent-secondary, #8B5CF6);
`;

const HeaderTitle = styled.h5`
  margin: 0;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text-primary, #E0ECF4);
`;

const Body = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const ToggleRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const ToggleSwitch = styled.button<{ $on: boolean; $disabled: boolean }>`
  width: 56px;
  height: 30px;
  min-height: 44px;
  min-width: 44px;
  border: 1px solid ${({ $on }) =>
    $on
      ? 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 60%, transparent)'
      : 'color-mix(in srgb, var(--text-muted, rgba(224,236,244,0.3)) 40%, transparent)'};
  background: ${({ $on }) =>
    $on
      ? 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 32%, var(--bg-elevated, #141419))'
      : 'var(--bg-elevated, #141419)'};
  border-radius: 999px;
  position: relative;
  cursor: ${({ $disabled }) => ($disabled ? 'wait' : 'pointer')};
  opacity: ${({ $disabled }) => ($disabled ? 0.65 : 1)};
  padding: 0 4px;
  display: inline-flex;
  align-items: center;
  transition: background 0.18s ease, border-color 0.18s ease;
  &:focus-visible {
    outline: 2px solid var(--accent-secondary, #8B5CF6);
    outline-offset: 2px;
  }
`;

const ToggleKnob = styled.span<{ $on: boolean }>`
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: ${({ $on }) =>
    $on
      ? 'var(--accent-secondary, #8B5CF6)'
      : 'color-mix(in srgb, var(--text-muted, rgba(224,236,244,0.5)) 80%, transparent)'};
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.45);
  transform: translateX(${({ $on }) => ($on ? '24px' : '0')});
  transition: transform 0.18s ease, background 0.18s ease;
`;

const StateLabel = styled.div<{ $on: boolean }>`
  font-family: 'Sora', sans-serif;
  font-size: 0.85rem;
  font-weight: 700;
  color: ${({ $on }) =>
    $on ? 'var(--accent-secondary, #8B5CF6)' : 'var(--text-muted, rgba(224,236,244,0.55))'};
  letter-spacing: 0.05em;
  text-transform: uppercase;
`;

const SavingPip = styled.span`
  margin-left: 6px;
  font-size: 0.7rem;
  font-weight: 500;
  color: var(--text-muted, rgba(224, 236, 244, 0.55));
  letter-spacing: 0;
  text-transform: none;
`;

const Caption = styled.p`
  margin: 0;
  font-family: 'Sora', sans-serif;
  font-size: 0.75rem;
  color: var(--text-secondary, rgba(224, 236, 244, 0.7));
  line-height: 1.45;
`;

const ServerNote = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 6px;
  font-family: 'Fira Code', monospace;
  font-size: 0.65rem;
  color: var(--text-muted, rgba(224, 236, 244, 0.5));
  line-height: 1.4;
  & code {
    padding: 1px 4px;
    border-radius: 3px;
    background: color-mix(in srgb, var(--accent-primary, #60C0F0) 8%, transparent);
    color: var(--accent-primary, #60C0F0);
  }
`;

const ErrorRow = styled.div`
  font-family: 'Sora', sans-serif;
  font-size: 0.75rem;
  color: var(--accent-error, #F87171);
  background: color-mix(in srgb, var(--accent-error, #F87171) 10%, transparent);
  padding: 6px 8px;
  border-radius: 6px;
`;
