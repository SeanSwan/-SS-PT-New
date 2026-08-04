/**
 * MyEquipmentInventory.styles — grouped inventory + cinematic empty state
 * =======================================================================
 * Movement-pattern group headers with tiny coverage dots; item rows carry a
 * Wing Purple pending dot. Empty state is the §10a #7 cinematic starfield:
 * faint Ice Wing points via CSS radial-gradients on Obsidian. Reduced-motion
 * disables the twinkle.
 */
import styled, { keyframes } from 'styled-components';

const twinkle = keyframes`
  0%, 100% { opacity: 0.55; }
  50% { opacity: 1; }
`;

export const InventorySection = styled.section`
  margin-top: 4px;
`;

export const InventoryHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 12px;
`;

export const InventoryTitle = styled.h2`
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary, #E0ECF4);
`;

export const CoverageRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`;

export const CoverageDot = styled.span<{ $covered?: boolean }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${({ $covered }) => ($covered
    ? 'var(--accent-primary, #60C0F0)'
    : 'rgba(96, 192, 240, 0.18)')};
  box-shadow: ${({ $covered }) => ($covered ? '0 0 6px rgba(96, 192, 240, 0.6)' : 'none')};
`;

export const PatternGroupBlock = styled.div`
  margin-bottom: 18px;
`;

export const PatternHeader = styled.h3`
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 8px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--accent-primary, #60C0F0);
`;

export const PatternDot = styled.span`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent-primary, #60C0F0);
  box-shadow: 0 0 6px rgba(96, 192, 240, 0.55);
`;

export const PatternCount = styled.span`
  font-weight: 500;
  color: var(--text-muted, rgba(224, 236, 244, 0.55));
  text-transform: none;
  letter-spacing: normal;
`;

export const ItemRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 44px;
  padding: 10px 14px;
  margin-bottom: 6px;
  border-radius: 10px;
  border: 1px solid rgba(96, 192, 240, 0.14);
  background: rgba(20, 20, 25, 0.85);
`;

export const ItemName = styled.span`
  flex: 1;
  min-width: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary, #E0ECF4);
  overflow-wrap: anywhere;
`;

export const ItemQuantity = styled.span`
  font-size: 12px;
  font-weight: 700;
  color: var(--text-muted, rgba(224, 236, 244, 0.6));
  font-variant-numeric: tabular-nums;
`;

export const PendingDot = styled.span`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  background: var(--glow-accent, #8B5CF6);
  box-shadow: 0 0 8px rgba(139, 92, 246, 0.7);
`;

export const StateMessage = styled.div`
  padding: 32px 16px;
  text-align: center;
  font-size: 14px;
  color: var(--text-muted, rgba(224, 236, 244, 0.65));
`;

export const EmptyStage = styled.div`
  position: relative;
  padding: 56px 24px;
  text-align: center;
  border-radius: 16px;
  border: 1px solid rgba(96, 192, 240, 0.18);
  overflow: hidden;
  background:
    radial-gradient(1.5px 1.5px at 18% 26%, rgba(96, 192, 240, 0.55), transparent 55%),
    radial-gradient(1px 1px at 34% 68%, rgba(96, 192, 240, 0.4), transparent 55%),
    radial-gradient(1.5px 1.5px at 55% 20%, rgba(224, 236, 244, 0.35), transparent 55%),
    radial-gradient(1px 1px at 68% 78%, rgba(96, 192, 240, 0.45), transparent 55%),
    radial-gradient(1.5px 1.5px at 82% 38%, rgba(139, 92, 246, 0.35), transparent 55%),
    radial-gradient(1px 1px at 12% 82%, rgba(96, 192, 240, 0.35), transparent 55%),
    radial-gradient(1px 1px at 90% 62%, rgba(224, 236, 244, 0.3), transparent 55%),
    radial-gradient(120% 90% at 50% 0%, rgba(0, 32, 96, 0.35), transparent 70%),
    var(--bg-deep, #0A0A0F);
  animation: ${twinkle} 5s ease-in-out infinite;

  @media (prefers-reduced-motion: reduce) { animation: none; }
`;

export const EmptyTitle = styled.h3`
  margin: 0 0 10px;
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary, #E0ECF4);
`;

export const EmptyCopy = styled.p`
  margin: 0 auto 6px;
  max-width: 320px;
  font-size: 14px;
  color: var(--text-muted, rgba(224, 236, 244, 0.75));
`;

export const EmptyFootnote = styled.p`
  margin: 0 auto 20px;
  font-size: 12px;
  color: var(--text-muted, rgba(224, 236, 244, 0.55));
`;
