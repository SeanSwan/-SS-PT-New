import React, { useCallback, useEffect, useRef } from 'react';
import { motion, PanInfo, useAnimation, useMotionValue } from 'framer-motion';
import {
  ColumnContainer,
  ColumnMask,
  HighlightBar,
  ITEM_HEIGHT,
  LiveRegion,
  VISIBLE_ITEMS,
  WheelItem,
} from './TimeWheel.styles';
import { motionStyleProps } from '@/components/ui/motionStyleProps';

interface WheelColumnProps {
  items: (string | number)[];
  selectedIndex: number;
  onChange: (index: number) => void;
  testId: string;
  label: string;
}

const WheelColumn: React.FC<WheelColumnProps> = ({
  items,
  selectedIndex,
  onChange,
  testId,
  label,
}) => {
  const controls = useAnimation();
  const y = useMotionValue(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const centerOffset = Math.floor(VISIBLE_ITEMS / 2) * ITEM_HEIGHT;
  const activeDescendant = `${testId}-option-${selectedIndex}`;

  useEffect(() => {
    const targetY = centerOffset - selectedIndex * ITEM_HEIGHT;
    controls.start({ y: targetY, transition: { type: 'spring', stiffness: 300, damping: 30 } });
  }, [selectedIndex, centerOffset, controls]);

  const handleDragEnd = useCallback((_: unknown, info: PanInfo) => {
    const currentY = y.get();
    const velocityBoost = info.velocity.y * 0.15;
    const projected = currentY + velocityBoost;
    const newIndex = Math.round((centerOffset - projected) / ITEM_HEIGHT);
    const clampedIndex = Math.max(0, Math.min(items.length - 1, newIndex));

    navigator.vibrate?.(10);
    onChange(clampedIndex);
  }, [centerOffset, items.length, onChange, y]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      onChange(Math.max(0, selectedIndex - 1));
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      onChange(Math.min(items.length - 1, selectedIndex + 1));
    }
  }, [selectedIndex, items.length, onChange]);

  return (
    <ColumnContainer
      role="listbox"
      aria-label={label}
      aria-activedescendant={activeDescendant}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      data-testid={testId}
    >
      <HighlightBar />
      <ColumnMask />
      <motion.div
        ref={containerRef}
        drag="y"
        dragConstraints={{
          top: centerOffset - (items.length - 1) * ITEM_HEIGHT,
          bottom: centerOffset,
        }}
        dragElastic={0.2}
        dragMomentum={false}
        onDragEnd={handleDragEnd}
        animate={controls}
        {...motionStyleProps({ y })}
      >
        {items.map((item, idx) => (
          <WheelItem
            key={`${item}-${idx}`}
            id={`${testId}-option-${idx}`}
            role="option"
            aria-selected={idx === selectedIndex}
            $isActive={idx === selectedIndex}
            data-testid={`wheel-option-${item}`}
            onClick={() => {
              navigator.vibrate?.(10);
              onChange(idx);
            }}
          >
            {typeof item === 'number' ? item.toString().padStart(2, '0') : item}
          </WheelItem>
        ))}
      </motion.div>
      <LiveRegion aria-live="polite" aria-atomic="true">
        {items[selectedIndex]}
      </LiveRegion>
    </ColumnContainer>
  );
};

export default WheelColumn;
