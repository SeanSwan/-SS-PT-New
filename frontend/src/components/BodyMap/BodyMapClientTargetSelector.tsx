/**
 * BodyMapClientTargetSelector
 * ===========================
 * PURPOSE: Staff-only client target picker for the standalone Pain Charts route.
 * HOW IT FITS: BodyMap renders this when admin/trainer routes mount without an explicit userId.
 * DATA FLOW: GlobalClientContext clients in, selected client id out through onChange.
 * KEY DECISION: The body-map editor stays client-scoped; region clicks prompt for a target instead of falling back to the staff account.
 */import React from 'react';
import styled from 'styled-components';
import type { ActiveClient } from '../../context/GlobalClientContext';

type ClientOption = Pick<ActiveClient, 'id' | 'firstName' | 'lastName' | 'email'>;

export function formatPainChartClientName(client: ClientOption): string {
  const fullName = `${client.firstName ?? ''} ${client.lastName ?? ''}`.trim();
  return fullName || client.email || `Client #${client.id}`;
}

interface BodyMapClientTargetSelectorProps {
  clients: ActiveClient[];
  selectedClientId: number | null;
  loading: boolean;
  notice?: string | null;
  onChange: (clientId: number | null) => void;
}

const TargetPanel = styled.div`
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  margin: 0 0 16px;
  padding: 12px;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.18));
  border-radius: 8px;
  background: rgba(10, 10, 15, 0.34);
`;

const TargetCopy = styled.div`
  display: grid;
  gap: 4px;
  min-width: min(100%, 220px);
`;

const TargetLabel = styled.label`
  color: var(--text-primary, #E0ECF4);
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0;
`;

const HelperText = styled.p`
  margin: 0;
  color: var(--text-secondary, rgba(224, 236, 244, 0.68));
  font-size: 12px;
  line-height: 1.4;
`;

const Select = styled.select`
  min-height: 44px;
  min-width: min(100%, 260px);
  border-radius: 8px;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.2));
  background: var(--bg-surface, rgba(10, 10, 15, 0.82));
  color: var(--text-primary, #E0ECF4);
  padding: 0 12px;
  font-size: 14px;
  font-weight: 700;

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;

const NoticeText = styled.p`
  flex-basis: 100%;
  margin: 0;
  color: var(--accent-gold, #C6A84B);
  font-size: 12px;
  font-weight: 700;
`;

const BodyMapClientTargetSelector: React.FC<BodyMapClientTargetSelectorProps> = ({
  clients,
  selectedClientId,
  loading,
  notice,
  onChange,
}) => {
  const selectedClient = clients.find((client) => client.id === selectedClientId) ?? null;

  return (
    <TargetPanel>
      <TargetCopy>
        <TargetLabel htmlFor="pain-chart-client-target">Pain chart client</TargetLabel>
        <HelperText>
          {selectedClient ? `Editing ${formatPainChartClientName(selectedClient)}` : 'Select a client to enable region editing.'}
        </HelperText>
      </TargetCopy>
      <Select
        id="pain-chart-client-target"
        aria-label="Select a client for Pain Charts"
        value={selectedClientId ?? ''}
        disabled={loading && clients.length === 0}
        onChange={(event) => {
          const nextId = Number(event.target.value);
          onChange(Number.isFinite(nextId) && nextId > 0 ? nextId : null);
        }}
      >
        <option value="">{loading ? 'Loading clients...' : 'Select a client'}</option>
        {clients.map((client) => (
          <option key={client.id} value={client.id}>
            {formatPainChartClientName(client)}
          </option>
        ))}
      </Select>
      {notice && <NoticeText role="status">{notice}</NoticeText>}
    </TargetPanel>
  );
};

export default BodyMapClientTargetSelector;
