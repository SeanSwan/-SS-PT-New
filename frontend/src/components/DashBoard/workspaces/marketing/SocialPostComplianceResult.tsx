/**
 * Compliance feedback panel for reviewed social post copy.
 */

import React from 'react';
import { AlertTriangle, Ban, CheckCircle } from 'lucide-react';
import type { ComplianceResult } from './SocialPostGenerator.types';
import {
  AutoTags,
  ComplianceBox,
  FeedbackIcon,
  WarningLine,
} from './SocialPostGenerator.styles';

interface SocialPostComplianceResultProps {
  result: ComplianceResult | null;
}

const SocialPostComplianceResult: React.FC<SocialPostComplianceResultProps> = ({ result }) => {
  if (!result) return null;

  if (result.compliant) {
    return (
      <ComplianceBox $type="pass">
        <FeedbackIcon>
          <CheckCircle size={16} />
        </FeedbackIcon>
        Content passes FTC/FDA compliance checks.
      </ComplianceBox>
    );
  }

  // A blocker and a remedied warning look identical in `warnings`, but they are
  // opposite outcomes: one means the route will answer 422 and the post never
  // goes out, the other means it publishes with #ad appended. Showing them as
  // one amber list is how Sean could read the panel, press Publish, and only
  // then find out the post was refused.
  const blockers = result.blockers ?? [];
  const advisories = result.warnings.filter(warning => !blockers.includes(warning));

  return (
    <ComplianceBox $type={blockers.length > 0 ? 'blocked' : 'warning'}>
      <FeedbackIcon>
        {blockers.length > 0 ? <Ban size={16} /> : <AlertTriangle size={16} />}
      </FeedbackIcon>
      <div>
        {blockers.length > 0 && (
          <WarningLine $hasGap>
            <strong>This will not be published.</strong> Fix the following before publishing:
          </WarningLine>
        )}
        {blockers.map((blocker, index) => (
          <WarningLine key={`blocker-${blocker}-${index}`} $hasGap={index < blockers.length - 1 || advisories.length > 0}>
            {blocker}
          </WarningLine>
        ))}
        {blockers.length > 0 && advisories.length > 0 && (
          <WarningLine $hasGap>Also noted (handled automatically, not blocking):</WarningLine>
        )}
        {advisories.map((advisory, index) => (
          <WarningLine key={`advisory-${advisory}-${index}`} $hasGap={index < advisories.length - 1}>
            {advisory}
          </WarningLine>
        ))}
        {result.autoTags.length > 0 && <AutoTags>Auto-tags: {result.autoTags.join(' ')}</AutoTags>}
      </div>
    </ComplianceBox>
  );
};

export default SocialPostComplianceResult;
