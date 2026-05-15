/**
 * PlaudClipGroupRail.tsx
 * =======================
 * Compact suggested clip groups for one-click queue selection.
 */
import styled from 'styled-components';
import { Clock, Layers, Sparkles } from 'lucide-react';
import type { PlaudClipGroupCandidate } from '../../services/plaudClipGroupService';

const Wrap = styled.section`
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--text-primary, #E0ECF4);
  font-weight: 800;
  font-size: 0.9rem;
  letter-spacing: 0.02em;
`;

const Rail = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.625rem;

  @media (min-width: 760px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`;

const GroupButton = styled.button`
  min-height: 64px;
  display: grid;
  grid-template-columns: 34px 1fr auto;
  align-items: center;
  gap: 0.625rem;
  width: 100%;
  padding: 0.75rem;
  text-align: left;
  color: var(--text-primary, #E0ECF4);
  background:
    linear-gradient(135deg, rgba(96, 192, 240, 0.13), rgba(139, 92, 246, 0.12)),
    var(--surface-elevated, rgba(30,30,60,0.3));
  border: 1px solid rgba(96, 192, 240, 0.24);
  border-radius: 12px;
  cursor: pointer;
  transition: border-color 160ms ease, box-shadow 160ms ease, transform 120ms ease;

  &:hover {
    border-color: rgba(96, 192, 240, 0.5);
    box-shadow: 0 0 24px rgba(96, 192, 240, 0.16);
    transform: translateY(-1px);
  }

  &:focus-visible {
    outline: 2px solid var(--glow-accent, #8B5CF6);
    outline-offset: 2px;
  }
`;

const IconShell = styled.span`
  width: 34px;
  height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--accent-primary, #60C0F0);
  border: 1px solid rgba(96, 192, 240, 0.28);
  border-radius: 10px;
  background: rgba(96, 192, 240, 0.1);
`;

const Copy = styled.span`
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 0.25rem;
`;

const Title = styled.span`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 800;
  font-size: 0.9rem;
`;

const Meta = styled.span`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  color: var(--text-secondary, rgba(224,236,244,0.72));
  font-size: 0.76rem;
`;

const Confidence = styled.span<{ $confidence: string }>`
  padding: 0.2rem 0.45rem;
  border-radius: 999px;
  color: ${({ $confidence }) => ($confidence === 'high' ? 'var(--accent-gold, #C6A84B)' : 'var(--text-primary, #E0ECF4)')};
  background: rgba(96, 192, 240, 0.12);
  border: 1px solid rgba(96, 192, 240, 0.2);
  font-size: 0.72rem;
  font-weight: 800;
  text-transform: uppercase;
`;

function formatRange(group: PlaudClipGroupCandidate): string {
  const start = new Date(group.startedAt);
  if (Number.isNaN(start.getTime())) return '';
  return start.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export interface PlaudClipGroupRailProps {
  groups: PlaudClipGroupCandidate[];
  onSelectGroup: (group: PlaudClipGroupCandidate) => void;
}

export function PlaudClipGroupRail({ groups, onSelectGroup }: PlaudClipGroupRailProps): JSX.Element | null {
  if (groups.length === 0) return null;
  return (
    <Wrap aria-label="Suggested PLAUD clip groups">
      <Header><Sparkles size={16} aria-hidden="true" /> Suggested groups</Header>
      <Rail>
        {groups.map((group) => (
          <GroupButton key={group.groupId} type="button" onClick={() => onSelectGroup(group)}>
            <IconShell><Layers size={17} aria-hidden="true" /></IconShell>
            <Copy>
              <Title>{group.title}</Title>
              <Meta>
                <span>{group.clipCount} clips</span>
                {group.spanMinutes > 0 ? <span>{group.spanMinutes} min span</span> : null}
                <span><Clock size={12} aria-hidden="true" /> {formatRange(group)}</span>
              </Meta>
            </Copy>
            <Confidence $confidence={group.confidence}>{group.confidence}</Confidence>
          </GroupButton>
        ))}
      </Rail>
    </Wrap>
  );
}

export default PlaudClipGroupRail;
