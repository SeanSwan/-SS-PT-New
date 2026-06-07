/**
 * LongHorizonPlanReviewEditor
 *
 * Purpose: Renders and edits an AI-generated long-horizon plan while the
 * parent keeps ownership of generation, approval, and audit state.
 */

import React from 'react';
import {
  AlertTriangle,
  Download,
} from 'lucide-react';
import type {
  LongHorizonPlan,
  MesocycleBlock,
  SwanCoachPlanningFingerprint,
} from '../../../../../services/aiWorkoutService';
import {
  Divider,
  FormGroup,
  FormGrid,
  InfoContent,
  InfoPanel,
  Input,
  Label,
  PrimaryButton,
  SecondaryButton,
  SectionTitle,
  TextArea,
} from './copilot-shared-styles';
import {
  BlockTimeline,
  IconSlot,
  ReadOnlyField,
  TightActionRow,
} from './LongHorizonContent.styles';
import LongHorizonBlockEditor from './LongHorizonBlockEditor';
import SwanCoachPlanningReviewPanel from './SwanCoachPlanningReviewPanel';

interface LongHorizonPlanReviewEditorProps {
  clientName: string;
  plan: LongHorizonPlan;
  warnings: string[];
  auditLogId: number | null;
  swanCoachPlanning: SwanCoachPlanningFingerprint | null;
  planningReviewAcknowledged: boolean;
  setPlanningReviewAcknowledged: (value: boolean) => void;
  trainerNotes: string;
  setTrainerNotes: (value: string) => void;
  expandedBlocks: Set<number>;
  onToggleBlock: (blockIdx: number) => void;
  onUpdatePlanField: <K extends keyof LongHorizonPlan>(field: K, value: LongHorizonPlan[K]) => void;
  onUpdateBlock: <K extends keyof MesocycleBlock>(
    blockIdx: number,
    field: K,
    value: MesocycleBlock[K],
  ) => void;
  onExportPdf: (plan: LongHorizonPlan, clientName: string) => void;
  onRegenerate: () => void;
  isSubmitting: boolean;
}

const LongHorizonPlanReviewEditor: React.FC<LongHorizonPlanReviewEditorProps> = ({
  clientName,
  plan,
  warnings,
  auditLogId,
  swanCoachPlanning,
  planningReviewAcknowledged,
  setPlanningReviewAcknowledged,
  trainerNotes,
  setTrainerNotes,
  expandedBlocks,
  onToggleBlock,
  onUpdatePlanField,
  onUpdateBlock,
  onExportPdf,
  onRegenerate,
  isSubmitting,
}) => (
  <>
    {warnings.length > 0 && (
      <InfoPanel $variant="warning">
        <IconSlot><AlertTriangle size={16} /></IconSlot>
        <InfoContent>
          {warnings.map((warning, idx) => (
            <div key={`${warning}-${idx}`}>{warning}</div>
          ))}
        </InfoContent>
      </InfoPanel>
    )}

    {auditLogId == null && (
      <InfoPanel $variant="warning">
        <IconSlot><AlertTriangle size={16} /></IconSlot>
        <InfoContent>
          Generation incomplete &mdash; regenerate to create a valid audit link before approval.
        </InfoContent>
      </InfoPanel>
    )}

    <SwanCoachPlanningReviewPanel
      planning={swanCoachPlanning}
      acknowledged={planningReviewAcknowledged}
      onAcknowledgedChange={setPlanningReviewAcknowledged}
    />

    <FormGrid>
      <FormGroup $fullWidth>
        <Label htmlFor="long-horizon-plan-name">Plan Name</Label>
        <Input
          id="long-horizon-plan-name"
          value={plan.planName}
          onChange={(e) => onUpdatePlanField('planName', e.target.value)}
          maxLength={200}
        />
      </FormGroup>
      <FormGroup>
        <Label>Horizon</Label>
        <ReadOnlyField>{plan.horizonMonths} months</ReadOnlyField>
      </FormGroup>
      <FormGroup $fullWidth>
        <Label htmlFor="long-horizon-summary">Summary</Label>
        <TextArea
          id="long-horizon-summary"
          value={plan.summary || ''}
          onChange={(e) => onUpdatePlanField('summary', e.target.value)}
          maxLength={2000}
        />
      </FormGroup>
    </FormGrid>

    <Divider />
    <SectionTitle>Mesocycle Blocks ({plan.blocks.length})</SectionTitle>
    <BlockTimeline>
      {plan.blocks.map((block, idx) => (
        <LongHorizonBlockEditor
          key={`${block.sequence}-${idx}`}
          block={block}
          blockIdx={idx}
          isExpanded={expandedBlocks.has(idx)}
          onToggleBlock={onToggleBlock}
          onUpdateBlock={onUpdateBlock}
        />
      ))}
    </BlockTimeline>

    <Divider />
    <FormGroup $fullWidth>
      <Label htmlFor="long-horizon-trainer-notes">Trainer Notes (included in approval audit)</Label>
      <TextArea
        id="long-horizon-trainer-notes"
        value={trainerNotes}
        onChange={(e) => setTrainerNotes(e.target.value)}
        rows={3}
      />
    </FormGroup>

    <TightActionRow $justify="flex-end">
      <SecondaryButton onClick={() => onExportPdf(plan, clientName)}>
        <Download size={16} /> Export PDF
      </SecondaryButton>
      {auditLogId == null && (
        <PrimaryButton
          onClick={onRegenerate}
          disabled={isSubmitting}
        >
          Regenerate
        </PrimaryButton>
      )}
    </TightActionRow>
  </>
);

export default LongHorizonPlanReviewEditor;
