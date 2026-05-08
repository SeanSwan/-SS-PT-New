/**
 * Compliance feedback panel for reviewed social post copy.
 */

import React from 'react';
import { AlertTriangle, CheckCircle } from 'lucide-react';
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

  return (
    <ComplianceBox $type="warning">
      <FeedbackIcon>
        <AlertTriangle size={16} />
      </FeedbackIcon>
      <div>
        {result.warnings.map((warning, index) => (
          <WarningLine key={`${warning}-${index}`} $hasGap={index < result.warnings.length - 1}>
            {warning}
          </WarningLine>
        ))}
        {result.autoTags.length > 0 && <AutoTags>Auto-tags: {result.autoTags.join(' ')}</AutoTags>}
      </div>
    </ComplianceBox>
  );
};

export default SocialPostComplianceResult;
