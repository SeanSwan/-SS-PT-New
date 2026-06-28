/**
 * COMPONENT: ClientCreationHandoffPanel
 * PURPOSE: Show the immediate post-create login or claim-link next step.
 * OWNER: Codex
 * LAST VALIDATED: 2026-06-08
 *
 * WIREFRAME:
 * +--------------------------------------------------------------+
 * | icon | source + credential state + client + message | close  |
 * |      | optional copy buttons for reset/claim paths           |
 * +--------------------------------------------------------------+
 *
 * DATA FLOW:
 * Props In:  { handoff, onDismiss, onCopy }
 * State:     none
 * API Calls: none
 * Events:    dismiss panel, copy claim/reset values
 * Children:  none
 *
 * ARCHITECTURE:
 * graph TD
 *   ClientsWorkspaceView --> ClientCreationHandoffPanel
 *   ClientCreationHandoffPanel --> SanitizedHandoffCopy
 */

import React from 'react';
import styled from 'styled-components';
import { AlertTriangle, Copy, Link2, MailCheck, X } from 'lucide-react';
import { CLIENT_SOURCE_LABELS } from '../../../../services/adminClientService';
import { swanClientActionButton, swanDataCardShell, swanMetricTile, swanPill } from './clientCardSystem';
import type {
  ManualClientCreationCredentialMode,
  ManualClientCreationHandoff,
} from './manualClientCreationHandoff';

interface ClientCreationHandoffPanelProps {
  handoff: ManualClientCreationHandoff | null;
  onDismiss: () => void;
  onCopy: (value: string, label: string) => void;
}

const Panel = styled.section`
  --swan-card-padding: 16px;
  --swan-card-radius: 12px;
  ${swanDataCardShell}
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 14px;
  align-items: start;
  margin: 14px 0;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const IconWrap = styled.div<{ $warning: boolean }>`
  ${swanMetricTile}
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 8px;
  color: ${({ $warning }) =>
    $warning ? 'var(--status-warning, #C6A84B)' : 'var(--accent-primary, #60C0F0)'};
`;

const Content = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
`;

const HeaderRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
`;

const Title = styled.h3`
  margin: 0;
  font: 700 0.98rem 'Plus Jakarta Sans', sans-serif;
  color: var(--text-primary, #E0ECF4);
`;

const Badge = styled.span`
  ${swanPill}
  display: inline-flex;
  align-items: center;
  color: var(--accent-luxury, #C6A84B);
  font: 700 0.72rem 'Sora', sans-serif;
`;

const Text = styled.p`
  margin: 0;
  color: var(--text-secondary, rgba(224, 236, 244, 0.82));
  font: 500 0.9rem/1.55 'Sora', sans-serif;
`;

const TokenRow = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
  align-items: center;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const TokenText = styled.code`
  ${swanMetricTile}
  min-height: 44px;
  min-width: 0;
  display: flex;
  align-items: center;
  overflow-wrap: anywhere;
  padding: 10px 12px;
  font: 600 0.84rem/1.45 'Fira Code', monospace;
`;

const IconButton = styled.button`
  ${swanClientActionButton}
  --swan-action-border: var(--handoff-button-border, rgba(96, 192, 240, 0.34));
  --swan-action-bg: var(--handoff-button-bg, rgba(255, 255, 255, 0.06));
  min-width: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 8px 12px;
  white-space: normal;
`;

const STATUS_COPY: Record<ManualClientCreationCredentialMode, { title: string; warning: boolean }> = {
  claim_link_ready: { title: 'Claim link ready', warning: false },
  claim_link_needed: { title: 'Login handoff needs review', warning: true },
  reset_link_sent: { title: 'Secure login link sent', warning: false },
  reset_link_ready: { title: 'Reset link ready to copy', warning: false },
  reset_link_needed: { title: 'Login handoff needs review', warning: true },
};

const STATUS_ICONS: Record<ManualClientCreationCredentialMode, typeof AlertTriangle> = {
  claim_link_ready: Link2,
  claim_link_needed: AlertTriangle,
  reset_link_sent: MailCheck,
  reset_link_ready: Link2,
  reset_link_needed: AlertTriangle,
};

const clientEmailSuffix = (handoff: ManualClientCreationHandoff): string => (
  handoff.clientEmail ? ` (${handoff.clientEmail})` : ''
);

interface HandoffToken {
  value: string;
  label: string;
}

const handoffTokens = (handoff: ManualClientCreationHandoff): HandoffToken[] => [
  { value: handoff.resetUrl || '', label: 'Reset link' },
  { value: handoff.claimUrl || '', label: 'Claim link' },
  { value: handoff.claimCode || '', label: 'Claim code' },
].filter((token) => token.value.length > 0);

const HandoffTokenRow: React.FC<{
  token: HandoffToken;
  onCopy: (value: string, label: string) => void;
}> = ({ token, onCopy }) => (
  <TokenRow>
    <TokenText>{token.value}</TokenText>
    <IconButton type="button" onClick={() => onCopy(token.value, token.label)} aria-label={`Copy ${token.label.toLowerCase()}`}>
      <Copy size={17} aria-hidden="true" /> Copy
    </IconButton>
  </TokenRow>
);

const HandoffPanelContent: React.FC<{
  handoff: ManualClientCreationHandoff;
  onDismiss: () => void;
  onCopy: (value: string, label: string) => void;
}> = ({
  handoff,
  onDismiss,
  onCopy,
}) => {
  const status = STATUS_COPY[handoff.credentialMode];
  const StatusIcon = STATUS_ICONS[handoff.credentialMode];

  return (
    <Panel aria-label="Client access handoff">
      <IconWrap $warning={status.warning}>
        <StatusIcon size={22} aria-hidden="true" />
      </IconWrap>
      <Content>
        <HeaderRow>
          <Title>{status.title}</Title>
          <Badge>{CLIENT_SOURCE_LABELS[handoff.clientSource]}</Badge>
        </HeaderRow>
        <Text>
          {handoff.clientName}{clientEmailSuffix(handoff)}: {handoff.message}
        </Text>
        {handoffTokens(handoff).map((token) => (
          <HandoffTokenRow key={token.label} token={token} onCopy={onCopy} />
        ))}
      </Content>
      <IconButton type="button" onClick={onDismiss} aria-label="Dismiss client access handoff">
        <X size={18} aria-hidden="true" />
      </IconButton>
    </Panel>
  );
};

const ClientCreationHandoffPanel: React.FC<ClientCreationHandoffPanelProps> = (props) => (
  props.handoff
    ? <HandoffPanelContent handoff={props.handoff} onDismiss={props.onDismiss} onCopy={props.onCopy} />
    : null
);

export default ClientCreationHandoffPanel;
