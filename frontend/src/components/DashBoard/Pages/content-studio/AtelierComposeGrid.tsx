/**
 * ============================================================================
 * FILE: AtelierComposeGrid.tsx
 * PURPOSE: The 4-up candidate grid — what the Still rung exists to show.
 * ============================================================================
 *
 * A short grid is NEVER shown as a whole one. When the server answers 207 the
 * failures render beside the stills, each with the code that names why — a
 * grid of three with no explanation reads as "the model only made three good
 * ones", which is the dishonest shape the backend refuses to emit and this
 * component refuses to hide.
 *
 * A local still lives on the render machine, not in the browser. It gets a
 * placeholder that says so and its hash, never a broken <img>.
 */

import React from 'react';
import type { ComposeResult, StillView } from './AtelierCompose.api';
import { stillSrc } from './AtelierCompose.api';
import {
  Grid, StillCard, StillImage, StillPlaceholder, StillMeta, SelectButton, FailureList, FailureRow, Caption,
} from './AtelierCompose.styles';

interface Props {
  result: ComposeResult;
  /** The aspect the operator asked for — the frame must match it, or the crop lies. */
  aspect: string;
  selectedIndex: number | null;
  onSelect: (index: number) => void;
}

function Still({ s, aspect, selected, onSelect }: { s: StillView; aspect: string; selected: boolean; onSelect: () => void }) {
  const { src, note } = stillSrc(s);
  return (
    <StillCard $selected={selected}>
      {src
        ? <StillImage $aspect={aspect} src={src} alt={`Candidate ${s.index + 1}, seed ${s.seed}`} loading="lazy" />
        : <StillPlaceholder $aspect={aspect} role="img" aria-label={note || 'Rendered on the local machine'}>{note}</StillPlaceholder>}
      <StillMeta>
        <span>#{s.index + 1}</span>
        <span>seed {s.seed}</span>
        <span>{s.lane}</span>
        <span title={s.provider}>{s.provider.split('/').pop()}</span>
        <span title="prompt hash">{s.promptHash}</span>
        {s.sha256 ? <span title="artifact sha256">{s.sha256.slice(0, 12)}</span> : null}
      </StillMeta>
      <SelectButton type="button" $on={selected} aria-pressed={selected} onClick={onSelect}>
        {selected ? 'Selected' : 'Select this frame'}
      </SelectButton>
    </StillCard>
  );
}

const AtelierComposeGrid: React.FC<Props> = ({ result, aspect, selectedIndex, onSelect }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
    <Caption>
      {result.stills.length} of {result.stills.length + result.failures.length} candidates
      {result.partial ? ' — some failed, listed below' : ''}
      {result.replayed ? ' · replayed from an identical request, nothing re-rendered' : ''}
      {typeof result.lawRejected === 'number' && result.lawRejected > 0
        ? ` · ${result.lawRejected} taste prompt${result.lawRejected === 1 ? '' : 's'} failed the law filter (${result.lawProfile})`
        : ''}
    </Caption>
    <Grid aria-label="Candidate stills">
      {result.stills.map((s) => (
        <Still key={s.index} s={s} aspect={aspect} selected={selectedIndex === s.index} onSelect={() => onSelect(s.index)} />
      ))}
    </Grid>
    {result.failures.length > 0 && (
      <FailureList aria-label="Failed candidates">
        {result.failures.map((f) => (
          <FailureRow key={f.index}>#{f.index + 1} · {f.code} — {f.message}</FailureRow>
        ))}
      </FailureList>
    )}
  </div>
);

export default AtelierComposeGrid;
