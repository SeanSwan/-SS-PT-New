/**
 * ChartExpandTrigger
 * ==================
 * Self-contained expand affordance for chart cards (Phase 2.2a): a ≥44px
 * icon button that lazy-loads ChartExpandModal on first open. Extracted so
 * per-card wiring stays ~4 lines inside the at-cap grid card files (the
 * ChartWeekDrillTrigger pattern).
 */
import React, { Suspense, lazy, useState } from 'react';
import styled from 'styled-components';
import { Maximize2 } from 'lucide-react';
import type { ChartExpandModalProps } from './ChartExpandModal';

const ChartExpandModal = lazy(() => import('./ChartExpandModal'));

const ExpandButton = styled.button`
  min-width: 44px;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 25%, transparent);
  background: transparent;
  color: var(--text-secondary, #9FB6C8);
  cursor: pointer;

  &:hover { color: var(--text-primary, #E0ECF4); }
  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;

export type ChartExpandTriggerProps = Omit<ChartExpandModalProps, 'onClose'>;

const ChartExpandTrigger: React.FC<ChartExpandTriggerProps> = (modalProps) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <ExpandButton
        type="button"
        aria-haspopup="dialog"
        aria-label={`Expand ${modalProps.title}`}
        onClick={() => setIsOpen(true)}
      >
        <Maximize2 size={16} aria-hidden="true" />
      </ExpandButton>
      {isOpen && (
        <Suspense fallback={null}>
          <ChartExpandModal {...modalProps} onClose={() => setIsOpen(false)} />
        </Suspense>
      )}
    </>
  );
};

export default ChartExpandTrigger;
