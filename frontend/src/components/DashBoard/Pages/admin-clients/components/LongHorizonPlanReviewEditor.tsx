/**
 * LongHorizonPlanReviewEditor
 *
 * Purpose: Renders and edits an AI-generated long-horizon plan while the
 * parent keeps ownership of generation, approval, and audit state.
 */

import React from 'react';
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Download,
} from 'lucide-react';
import type { LongHorizonPlan, MesocycleBlock } from '../../../../../services/aiWorkoutService';
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
  SWAN_CYAN,
  TextArea,
} from './copilot-shared-styles';
import {
  BlockCard,
  BlockContent,
  BlockDurationBar,
  BlockHeader,
  BlockTimeline,
  BlockWeeks,
  IconSlot,
  NasmBadge,
  ReadOnlyField,
  TightActionRow,
} from './LongHorizonContent.styles';

interface LongHorizonPlanReviewEditorProps {
  clientName: string;
  plan: LongHorizonPlan;
  warnings: string[];
  auditLogId: number | null;
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
      {plan.blocks.map((block, idx) => {
        const durationPct = Math.max(10, Math.min(100, (block.durationWeeks / 16) * 100));
        const isExpanded = expandedBlocks.has(idx);
        return (
          <BlockCard key={`${block.sequence}-${idx}`}>
            <BlockHeader onClick={() => onToggleBlock(idx)}>
              {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              <span>
                Block {block.sequence}: {block.phaseName}
              </span>
              <NasmBadge $color={block.nasmFramework === 'OPT' ? SWAN_CYAN : 'var(--accent-tertiary, #8B5CF6)'}>
                {block.nasmFramework}
                {block.optPhase ? ` P${block.optPhase}` : ''}
              </NasmBadge>
              <BlockDurationBar $pct={durationPct} />
              <BlockWeeks>{block.durationWeeks}w</BlockWeeks>
            </BlockHeader>

            {isExpanded && (
              <BlockContent>
                <FormGrid>
                  <FormGroup>
                    <Label htmlFor={`long-horizon-phase-${idx}`}>Phase Name</Label>
                    <Input
                      id={`long-horizon-phase-${idx}`}
                      value={block.phaseName}
                      onChange={(e) => onUpdateBlock(idx, 'phaseName', e.target.value)}
                      maxLength={100}
                    />
                  </FormGroup>
                  <FormGroup>
                    <Label htmlFor={`long-horizon-focus-${idx}`}>Focus</Label>
                    <Input
                      id={`long-horizon-focus-${idx}`}
                      value={block.focus || ''}
                      onChange={(e) => onUpdateBlock(idx, 'focus', e.target.value)}
                      maxLength={200}
                    />
                  </FormGroup>
                  <FormGroup>
                    <Label htmlFor={`long-horizon-duration-${idx}`}>Duration (weeks)</Label>
                    <Input
                      id={`long-horizon-duration-${idx}`}
                      type="number"
                      min={1}
                      max={16}
                      value={block.durationWeeks}
                      onChange={(e) => onUpdateBlock(idx, 'durationWeeks', parseInt(e.target.value, 10) || 1)}
                    />
                  </FormGroup>
                  <FormGroup>
                    <Label htmlFor={`long-horizon-sessions-${idx}`}>Sessions / week</Label>
                    <Input
                      id={`long-horizon-sessions-${idx}`}
                      type="number"
                      min={1}
                      max={7}
                      value={block.sessionsPerWeek ?? ''}
                      onChange={(e) => onUpdateBlock(
                        idx,
                        'sessionsPerWeek',
                        e.target.value ? parseInt(e.target.value, 10) : null,
                      )}
                    />
                  </FormGroup>
                  <FormGroup $fullWidth>
                    <Label htmlFor={`long-horizon-entry-${idx}`}>Entry Criteria</Label>
                    <TextArea
                      id={`long-horizon-entry-${idx}`}
                      value={block.entryCriteria || ''}
                      onChange={(e) => onUpdateBlock(idx, 'entryCriteria', e.target.value)}
                      rows={2}
                    />
                  </FormGroup>
                  <FormGroup $fullWidth>
                    <Label htmlFor={`long-horizon-exit-${idx}`}>Exit Criteria</Label>
                    <TextArea
                      id={`long-horizon-exit-${idx}`}
                      value={block.exitCriteria || ''}
                      onChange={(e) => onUpdateBlock(idx, 'exitCriteria', e.target.value)}
                      rows={2}
                    />
                  </FormGroup>
                  <FormGroup $fullWidth>
                    <Label htmlFor={`long-horizon-notes-${idx}`}>Block Notes</Label>
                    <TextArea
                      id={`long-horizon-notes-${idx}`}
                      value={block.notes || ''}
                      onChange={(e) => onUpdateBlock(idx, 'notes', e.target.value)}
                      rows={2}
                    />
                  </FormGroup>
                </FormGrid>
              </BlockContent>
            )}
          </BlockCard>
        );
      })}
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
