/**
 * LongHorizonBlockEditor
 *
 * Purpose: Renders one editable mesocycle block for the long-horizon plan
 * review editor.
 */

import React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { MesocycleBlock } from '../../../../../services/aiWorkoutService';
import {
  FormGroup,
  FormGrid,
  Input,
  Label,
  SWAN_CYAN,
  TextArea,
} from './copilot-shared-styles';
import {
  BlockCard,
  BlockContent,
  BlockDurationBar,
  BlockHeader,
  BlockWeeks,
  NasmBadge,
} from './LongHorizonContent.styles';

interface LongHorizonBlockEditorProps {
  block: MesocycleBlock;
  blockIdx: number;
  isExpanded: boolean;
  onToggleBlock: (blockIdx: number) => void;
  onUpdateBlock: <K extends keyof MesocycleBlock>(
    blockIdx: number,
    field: K,
    value: MesocycleBlock[K],
  ) => void;
}

const LongHorizonBlockEditor: React.FC<LongHorizonBlockEditorProps> = ({
  block,
  blockIdx,
  isExpanded,
  onToggleBlock,
  onUpdateBlock,
}) => {
  const durationPct = Math.max(10, Math.min(100, (block.durationWeeks / 16) * 100));

  return (
    <BlockCard>
      <BlockHeader onClick={() => onToggleBlock(blockIdx)}>
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
              <Label htmlFor={`long-horizon-phase-${blockIdx}`}>Phase Name</Label>
              <Input
                id={`long-horizon-phase-${blockIdx}`}
                value={block.phaseName}
                onChange={(e) => onUpdateBlock(blockIdx, 'phaseName', e.target.value)}
                maxLength={100}
              />
            </FormGroup>
            <FormGroup>
              <Label htmlFor={`long-horizon-focus-${blockIdx}`}>Focus</Label>
              <Input
                id={`long-horizon-focus-${blockIdx}`}
                value={block.focus || ''}
                onChange={(e) => onUpdateBlock(blockIdx, 'focus', e.target.value)}
                maxLength={200}
              />
            </FormGroup>
            <FormGroup>
              <Label htmlFor={`long-horizon-duration-${blockIdx}`}>Duration (weeks)</Label>
              <Input
                id={`long-horizon-duration-${blockIdx}`}
                type="number"
                min={1}
                max={16}
                value={block.durationWeeks}
                onChange={(e) => onUpdateBlock(blockIdx, 'durationWeeks', parseInt(e.target.value, 10) || 1)}
              />
            </FormGroup>
            <FormGroup>
              <Label htmlFor={`long-horizon-sessions-${blockIdx}`}>Sessions / week</Label>
              <Input
                id={`long-horizon-sessions-${blockIdx}`}
                type="number"
                min={1}
                max={7}
                value={block.sessionsPerWeek ?? ''}
                onChange={(e) => onUpdateBlock(
                  blockIdx,
                  'sessionsPerWeek',
                  e.target.value ? parseInt(e.target.value, 10) : null,
                )}
              />
            </FormGroup>
            <FormGroup $fullWidth>
              <Label htmlFor={`long-horizon-entry-${blockIdx}`}>Entry Criteria</Label>
              <TextArea
                id={`long-horizon-entry-${blockIdx}`}
                value={block.entryCriteria || ''}
                onChange={(e) => onUpdateBlock(blockIdx, 'entryCriteria', e.target.value)}
                rows={2}
              />
            </FormGroup>
            <FormGroup $fullWidth>
              <Label htmlFor={`long-horizon-exit-${blockIdx}`}>Exit Criteria</Label>
              <TextArea
                id={`long-horizon-exit-${blockIdx}`}
                value={block.exitCriteria || ''}
                onChange={(e) => onUpdateBlock(blockIdx, 'exitCriteria', e.target.value)}
                rows={2}
              />
            </FormGroup>
            <FormGroup $fullWidth>
              <Label htmlFor={`long-horizon-notes-${blockIdx}`}>Block Notes</Label>
              <TextArea
                id={`long-horizon-notes-${blockIdx}`}
                value={block.notes || ''}
                onChange={(e) => onUpdateBlock(blockIdx, 'notes', e.target.value)}
                rows={2}
              />
            </FormGroup>
          </FormGrid>
        </BlockContent>
      )}
    </BlockCard>
  );
};

export default React.memo(LongHorizonBlockEditor);
