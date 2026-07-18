/**
 * Store V4 — Skeleton. Loading state for the packages read; opacity-pulse only (reduced-motion safe via
 * the token theme's global guard). No layout shift: the skeleton mirrors the pedestal + 2-up drawer.
 */
import styled, { keyframes } from 'styled-components';

const pulse = keyframes`
  0%, 100% { opacity: 0.5; }
  50% { opacity: 0.9; }
`;
const Block = styled.div<{ $h: number }>`
  height: ${({ $h }) => $h}px;
  border-radius: var(--store-r-panel, 20px);
  background: var(--store-glass);
  border: 1px solid var(--store-line);
  animation: ${pulse} 1.4s ease-in-out infinite;
`;
const Row = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
  margin-top: 16px;
  @media (min-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

export function StoreV4Skeleton() {
  return (
    <div data-testid="store-skeleton" aria-hidden="true">
      <Block $h={200} />
      <Row>
        <Block $h={260} />
        <Block $h={260} />
      </Row>
    </div>
  );
}
