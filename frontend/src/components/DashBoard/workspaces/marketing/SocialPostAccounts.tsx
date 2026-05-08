/**
 * Account picker for Postiz-connected social publishing targets.
 */

import React from 'react';
import { Link2 } from 'lucide-react';
import { PLATFORMS } from './SocialPostGenerator.config';
import type { SocialPlatform } from './marketing.types';
import type { ConnectedAccount } from './SocialPostGenerator.types';
import {
  CatLabel,
  PlatformCheck,
  PlatformCheckboxes,
  PostizWarningText,
  StatusBanner,
} from './SocialPostGenerator.styles';

interface SocialPostAccountsProps {
  postizConfigured: boolean | null;
  connectedAccounts: ConnectedAccount[];
  selectedAccountIds: string[];
  onToggleAccount: (accountId: string) => void;
}

const SocialPostAccounts: React.FC<SocialPostAccountsProps> = ({
  postizConfigured,
  connectedAccounts,
  selectedAccountIds,
  onToggleAccount,
}) => (
  <>
    <CatLabel>Publish to:</CatLabel>
    {postizConfigured === false && (
      <StatusBanner $tone="warning">
        <Link2 size={14} />
        <PostizWarningText>
          Postiz not configured. Set POSTIZ_API_URL and POSTIZ_API_KEY in .env to enable publishing.
        </PostizWarningText>
      </StatusBanner>
    )}

    {connectedAccounts.length > 0 ? (
      <PlatformCheckboxes>
        {connectedAccounts.map(account => {
          const platformKey = account.platform as SocialPlatform;
          const platformConfig = PLATFORMS[platformKey];
          const color = platformConfig?.color || '#60C0F0';
          const checked = selectedAccountIds.includes(account.id);

          return (
            <PlatformCheck key={account.id} $color={color} $checked={checked}>
              <input type="checkbox" checked={checked} onChange={() => onToggleAccount(account.id)} />
              {checked ? 'Selected' : 'Select'} {account.name || platformConfig?.name || account.platform}
            </PlatformCheck>
          );
        })}
      </PlatformCheckboxes>
    ) : (
      <StatusBanner>
        <Link2 size={14} />
        No social accounts connected yet. Connect accounts via Postiz to start publishing.
      </StatusBanner>
    )}
  </>
);

export default SocialPostAccounts;
