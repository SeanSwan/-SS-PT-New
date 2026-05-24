/**
 * PANEL: Native Social Connection Controls
 * ========================================
 * Connects first-party provider accounts without paid scheduling platforms.
 */

import React, { useState } from 'react';
import styled from 'styled-components';
import { KeyRound, Link2, Unlink } from 'lucide-react';
import { hexAlpha } from '../../../../components/Charts/chartTheme';
import { PLATFORMS } from './SocialPostGenerator.config';
import type { ConnectedAccount } from './SocialPostGenerator.types';
import type { SocialPlatform } from './marketing.types';
import { StatusBanner } from './SocialPostGenerator.styles';
import apiService from '../../../../services/api.service';

const PROVIDER_READINESS_ORDER: SocialPlatform[] = [
  'instagram',
  'facebook',
  'youtube',
  'bluesky',
  'tiktok',
  'nextdoor',
];

const Grid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 20px;
  @media (max-width: 900px) { grid-template-columns: 1fr; }
`;

const AccountCard = styled.div<{ $color: string; $connected: boolean }>`
  padding: 16px;
  border-radius: 8px;
  background: var(--bg-elevated, #141419);
  border: 1px solid ${({ $connected, $color }) =>
    $connected ? hexAlpha($color, 0.3) : 'var(--border-subtle, rgba(96, 192, 240, 0.08))'};
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 64px;
  gap: 12px;
`;

const AccountInfo = styled.div`display: flex; align-items: center; gap: 10px;`;

const PlatformDot = styled.div<{ $color: string }>`
  width: 10px; height: 10px; border-radius: 50%; background: ${({ $color }) => $color};
`;

const AccountName = styled.span`
  font-family: 'Sora', sans-serif;
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary, #E0ECF4);
`;

const AccountStatus = styled.span<{ $connected: boolean }>`
  font-family: 'Fira Code', monospace;
  font-size: 11px;
  color: ${({ $connected }) => $connected ? 'var(--success, #10B981)' : 'var(--text-secondary, rgba(224, 236, 244, 0.85))'};
`;

const ConnectBtn = styled.button<{ $color: string }>`
  min-height: 44px;
  padding: 8px 14px;
  border-radius: 8px;
  border: 1px solid ${({ $color }) => hexAlpha($color, 0.3)};
  background: ${({ $color }) => hexAlpha($color, 0.08)};
  color: ${({ $color }) => $color};
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
`;

const Form = styled.form`
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: minmax(180px, 1fr) minmax(180px, 1fr) auto;
  gap: 10px;
  padding: 14px;
  border-radius: 8px;
  background: var(--info-surface, rgba(96, 192, 240, 0.08));
  border: 1px solid var(--info-border, rgba(96, 192, 240, 0.2));
  @media (max-width: 720px) { grid-template-columns: 1fr; }
`;

const Input = styled.input`
  min-height: 44px;
  border-radius: 8px;
  border: 1px solid var(--border-subtle, rgba(96, 192, 240, 0.12));
  background: var(--bg-base, #0A0A0F);
  color: var(--text-primary, #E0ECF4);
  padding: 8px 12px;
  font: 13px 'Sora', sans-serif;
`;

interface SocialConnectPanelProps {
  accounts: ConnectedAccount[];
  onConnected: (account: ConnectedAccount) => void;
  onDisconnected: (accountId: string) => void;
}

const SocialConnectPanel: React.FC<SocialConnectPanelProps> = ({ accounts, onConnected, onDisconnected }) => {
  const [identifier, setIdentifier] = useState('');
  const [appPassword, setAppPassword] = useState('');
  const [status, setStatus] = useState('Native social publishing is active. Bluesky can connect now; other providers show readiness gates.');

  const connectedPlatforms = new Set(accounts.map(account => account.platform));

  const connectBluesky = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!identifier.trim() || !appPassword.trim()) return;
    const response = await apiService.post('/api/admin/social-publishing/connect/bluesky', {
      identifier: identifier.trim(),
      appPassword,
    });
    const data = response.data;
    if (!data.success) {
      setStatus(data.message || 'Bluesky connection failed.');
      return;
    }
    onConnected(data.data);
    setAppPassword('');
    setStatus(`Connected ${data.data?.name || identifier} through native Bluesky publishing.`);
  };

  const showReadiness = async (platform: string) => {
    const response = await apiService.post(`/api/admin/social-publishing/connect/${platform}`);
    const data = response.data;
    setStatus(data.message || data.data?.message || 'Provider setup requirements loaded.');
  };

  return (
    <>
      <StatusBanner><KeyRound size={14} /> {status}</StatusBanner>
      <Grid>
        <Form onSubmit={connectBluesky}>
          <Input value={identifier} onChange={event => setIdentifier(event.target.value)} placeholder="Bluesky handle" />
          <Input value={appPassword} onChange={event => setAppPassword(event.target.value)} placeholder="Bluesky app password" type="password" />
          <ConnectBtn type="submit" $color={PLATFORMS.bluesky.color}><Link2 size={12} /> Connect Bluesky</ConnectBtn>
        </Form>

        {PROVIDER_READINESS_ORDER.map((id) => {
          const platform = PLATFORMS[id];
          const connected = connectedPlatforms.has(id);
          const account = accounts.find(item => item.platform === id);
          return (
            <AccountCard key={id} $color={platform.color} $connected={connected}>
              <AccountInfo>
                <PlatformDot $color={platform.color} />
                <div>
                  <AccountName>{platform.name}</AccountName><br />
                  <AccountStatus $connected={connected}>{connected ? `Connected: ${account?.name || 'Active'}` : 'Provider setup required'}</AccountStatus>
                </div>
              </AccountInfo>
              {connected ? (
                <ConnectBtn $color="var(--danger, #EF4444)" onClick={() => onDisconnected(account?.id || '')}><Unlink size={12} /> Disconnect</ConnectBtn>
              ) : (
                <ConnectBtn $color={platform.color} onClick={() => showReadiness(id)}><Link2 size={12} /> Setup</ConnectBtn>
              )}
            </AccountCard>
          );
        })}
      </Grid>
    </>
  );
};

export default SocialConnectPanel;
