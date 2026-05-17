/**
 * Account picker for native social publishing targets.
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
  PublisherWarningText,
  StatusBanner,
} from './SocialPostGenerator.styles';

interface SocialPostAccountsProps {
  nativeConfigured: boolean | null;
  connectedAccounts: ConnectedAccount[];
  selectedAccountIds: string[];
  onToggleAccount: (accountId: string) => void;
}

const SocialPostAccounts: React.FC<SocialPostAccountsProps> = ({
  nativeConfigured,
  connectedAccounts,
  selectedAccountIds,
  onToggleAccount,
}) => (
  <>
    <CatLabel>Publish to:</CatLabel>
    {nativeConfigured === false && (
      <StatusBanner $tone="warning">
        <Link2 size={14} />
        <PublisherWarningText>
          Native social publishing needs account setup before publishing is enabled.
        </PublisherWarningText>
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
        No social accounts connected yet. Connect Bluesky from Analytics to start publishing.
      </StatusBanner>
    )}
  </>
);

export default SocialPostAccounts;
