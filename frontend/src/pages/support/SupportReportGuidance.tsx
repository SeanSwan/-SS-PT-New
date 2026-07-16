/**
 * FILE: SupportReportGuidance.tsx
 * PURPOSE: Guide a member through the next useful issue detail and show the
 *          deterministic structure Swan Coach will send to the support queue.
 */
import React from 'react';

import type { GuidedField, SupportDraft } from './supportReportDraft';
import {
  buildSupportReportPreview,
  completedGuidedFields,
  nextGuidedField,
} from './supportReportDraft';
import {
  Guide,
  GuideCopy,
  GuideHeader,
  GuideTitle,
  Preview,
  PreviewText,
  ProgressText,
  PromptButton,
} from './SupportReportGuidance.styles';

interface Props {
  draft: SupportDraft;
  onFocusField: (field: GuidedField) => void;
}

const prompts: Record<GuidedField, string> = {
  description: 'Tell Swan Coach what happened',
  expectedBehavior: 'What should have happened?',
  impact: 'How did this affect you?',
  steps: 'Can you repeat the problem?',
};

const SupportReportGuidance: React.FC<Props> = ({ draft, onFocusField }) => {
  const complete = completedGuidedFields(draft);
  const next = nextGuidedField(draft);

  return (
    <Guide aria-labelledby="support-guide-title">
      <GuideHeader>
        <div>
          <GuideTitle id="support-guide-title">Swan Coach is organizing the report with you</GuideTitle>
          <GuideCopy>Answer in your own words. The preview stays editable and nothing is sent until you choose Send report.</GuideCopy>
        </div>
        <ProgressText aria-live="polite">{complete} of 4 key details ready</ProgressText>
      </GuideHeader>
      {next ? (
        <PromptButton type="button" onClick={() => onFocusField(next)}>
          {prompts[next]}
        </PromptButton>
      ) : (
        <GuideCopy role="status">The key details are ready. Review the report below before sending.</GuideCopy>
      )}
      <Preview>
        <summary>Preview the agent-ready report</summary>
        <PreviewText>{buildSupportReportPreview(draft)}</PreviewText>
      </Preview>
    </Guide>
  );
};

export default SupportReportGuidance;
