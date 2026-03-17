/**
 * NASMProtocolSection — Collapsible NASM checklist section
 * Extracted from WorkoutLogger monolith for maintainability
 */
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styled from 'styled-components';
import { ChevronDown } from 'lucide-react';
import { CS } from './WorkoutLoggerCS';

export interface NASMItem {
  id: string;
  name: string;
  notes?: string;
  completed: boolean;
}

interface NASMProtocolSectionProps {
  title: string;
  icon: React.ReactNode;
  items: NASMItem[];
  isOpen: boolean;
  onToggleOpen: () => void;
  onToggleItem: (index: number) => void;
}

const NASMProtocolSection: React.FC<NASMProtocolSectionProps> = React.memo(({
  title,
  icon,
  items,
  isOpen,
  onToggleOpen,
  onToggleItem,
}) => {
  const completedCount = items.filter(i => i.completed).length;

  return (
    <SectionCard>
      <SectionHeader $open={isOpen} onClick={onToggleOpen} aria-expanded={isOpen}>
        {icon}
        {title}
        <Badge>{completedCount}/{items.length}</Badge>
        <ChevronDown size={18} />
      </SectionHeader>
      <AnimatePresence>
        {isOpen && (
          <SectionBody
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          >
            {items.map((item, idx) => (
              <ItemRow key={item.id} $done={item.completed}>
                <Checkbox
                  checked={item.completed}
                  onChange={() => onToggleItem(idx)}
                />
                {item.name}
              </ItemRow>
            ))}
          </SectionBody>
        )}
      </AnimatePresence>
    </SectionCard>
  );
});

NASMProtocolSection.displayName = 'NASMProtocolSection';
export default NASMProtocolSection;

// ── Styled Components ──

const SectionCard = styled.div`
  background: rgba(0, 48, 128, 0.92);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(96, 192, 240, 0.25);
  box-shadow: inset 0 1px 0 0 rgba(224, 236, 244, 0.1);
  border-radius: 16px;
  margin-bottom: 1rem;
  overflow: hidden;
`;

const SectionHeader = styled.button<{ $open: boolean }>`
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 16px 20px;
  border: none;
  background: transparent;
  color: ${CS.text};
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  min-height: 56px;
  transition: background 0.2s cubic-bezier(0.4, 0, 0.2, 1);

  &:hover { background: rgba(96, 192, 240, 0.05); }

  &:focus-visible {
    outline: 2px solid ${CS.gaming};
    outline-offset: -2px;
    border-radius: 16px;
  }

  svg:last-child {
    margin-left: auto;
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    transform: rotate(${p => p.$open ? '180deg' : '0deg'});
  }
`;

const SectionBody = styled(motion.div)`
  padding: 0 20px 16px;
`;

const ItemRow = styled.label<{ $done: boolean }>`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 0;
  cursor: pointer;
  border-bottom: 1px solid rgba(96, 192, 240, 0.08);
  min-height: 44px;
  opacity: ${p => p.$done ? 0.5 : 1};
  text-decoration: ${p => p.$done ? 'line-through' : 'none'};
  transition: opacity 0.2s;
  font-size: 0.9rem;
  color: ${CS.text};

  &:last-child { border-bottom: none; }
`;

const Checkbox = styled.input.attrs({ type: 'checkbox' })`
  width: 20px;
  height: 20px;
  accent-color: ${CS.gaming};
  cursor: pointer;
  flex-shrink: 0;
`;

const Badge = styled.span`
  font-size: 0.75rem;
  padding: 2px 8px;
  border-radius: 10px;
  background: rgba(139, 92, 246, 0.15);
  color: #A78BFA;
  font-weight: 600;
`;
