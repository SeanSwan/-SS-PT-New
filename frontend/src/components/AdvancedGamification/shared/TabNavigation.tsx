/**
 * 🗂️ TAB NAVIGATION - GAMIFICATION TAB SWITCHING
 * ==============================================
 * Reusable tab navigation component with animations and Galaxy-Swan theming
 * for switching between gamification sections
 */

import React, { useState, useRef, useEffect } from 'react';
import styled, { css } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';

// ================================================================
// TYPES AND INTERFACES
// ================================================================

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
  isDisabled?: boolean;
  tooltip?: string;
}

export interface TabNavigationProps {
  // Tab configuration
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  
  // Visual options
  variant?: 'default' | 'pills' | 'underline' | 'cards' | 'premium';
  size?: 'small' | 'medium' | 'large';
  orientation?: 'horizontal' | 'vertical';
  fullWidth?: boolean;
  showIndicator?: boolean;
  
  // Behavior
  allowKeyboardNavigation?: boolean;
  scrollable?: boolean;
  centered?: boolean;
  
  // Styling
  className?: string;
  customColors?: {
    background?: string;
    activeBackground?: string;
    text?: string;
    activeText?: string;
    indicator?: string;
  };
}

// ================================================================
// STYLED COMPONENTS
// ================================================================

const TabContainer = styled.div<{
  orientation: 'horizontal' | 'vertical';
  $fullWidth: boolean;
  $scrollable: boolean;
  $centered: boolean;
}>`
  display: flex;
  position: relative;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 16px;
  padding: 6px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  
  ${({ orientation }) => orientation === 'vertical' ? css`
    flex-direction: column;
    width: fit-content;
    min-width: 200px;
  ` : css`
    flex-direction: row;
    width: ${props => props.$fullWidth ? '100%' : 'fit-content'};
  `}
  
  ${({ $scrollable, orientation }) => $scrollable && css`
    ${orientation === 'horizontal' ? css`
      overflow-x: auto;
      overflow-y: hidden;
      scrollbar-width: none;
      &::-webkit-scrollbar {
        display: none;
      }
    ` : css`
      overflow-y: auto;
      overflow-x: hidden;
      max-height: 400px;
      scrollbar-width: thin;
    `}
  `}
  
  ${({ $centered }) => $centered && css`
    justify-content: center;
  `}
  
  @media (max-width: 768px) {
    ${({ orientation }) => orientation === 'horizontal' && css`
      overflow-x: auto;
      scrollbar-width: none;
      &::-webkit-scrollbar {
        display: none;
      }
    `}
  }
`;

const TabsList = styled.div<{
  orientation: 'horizontal' | 'vertical';
  $fullWidth: boolean;
}>`
  display: flex;
  position: relative;
  gap: 4px;
  
  ${({ orientation }) => orientation === 'vertical' ? css`
    flex-direction: column;
    width: 100%;
  ` : css`
    flex-direction: row;
    width: ${props => props.$fullWidth ? '100%' : 'auto'};
  `}
`;

const TabButton = styled(motion.button)<{
  variant: 'default' | 'pills' | 'underline' | 'cards' | 'premium';
  size: 'small' | 'medium' | 'large';
  orientation: 'horizontal' | 'vertical';
  $isActive: boolean;
  $isDisabled: boolean;
  $fullWidth: boolean;
  $customColors?: TabNavigationProps['customColors'];
}>`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  border: none;
  background: transparent;
  cursor: pointer;
  font-family: inherit;
  font-weight: 500;
  border-radius: 12px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  white-space: nowrap;
  outline: none;
  user-select: none;

  /* P1-4: Mobile touch feedback */
  -webkit-tap-highlight-color: rgba(0, 255, 255, 0.15);
  touch-action: manipulation; /* Remove 300ms tap delay */
  
  /* Size variants - P1-2 Fix: 44px minimum touch targets */
  ${({ size }) => {
    switch (size) {
      case 'small':
        return css`
          padding: 0.625rem 1rem;
          font-size: 0.875rem;
          min-height: 44px; /* P1-2: WCAG minimum touch target */
        `;
      case 'large':
        return css`
          padding: 0.875rem 1.5rem;
          font-size: 1.125rem;
          min-height: 48px;
        `;
      default: // medium
        return css`
          padding: 0.75rem 1.25rem;
          font-size: 1rem;
          min-height: 44px; /* P1-2: WCAG minimum touch target */
        `;
    }
  }}
  
  ${({ $fullWidth, orientation }) => $fullWidth && orientation === 'horizontal' && css`
    flex: 1;
  `}
  
  /* Base colors */
  color: ${props => props.$customColors?.text || (props.$isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.7)')};
  
  /* Variant styles */
  ${({ variant, $isActive, $customColors }) => {
    switch (variant) {
      case 'pills':
        return css`
          background: ${$isActive 
            ? $customColors?.activeBackground || 'linear-gradient(135deg, #00ffff 0%, #0080ff 100%)'
            : $customColors?.background || 'transparent'};
          color: ${$isActive 
            ? $customColors?.activeText || '#000'
            : $customColors?.text || 'rgba(255, 255, 255, 0.7)'};
        `;
      
      case 'underline':
        return css`
          background: transparent;
          border-radius: 0;
          border-bottom: 2px solid ${$isActive 
            ? $customColors?.indicator || '#00ffff'
            : 'transparent'};
        `;
      
      case 'cards':
        return css`
          background: ${$isActive
            ? $customColors?.activeBackground || 'rgba(255, 255, 255, 0.1)'
            : $customColors?.background || 'transparent'};
          border: 1px solid ${$isActive
            ? $customColors?.indicator || 'rgba(0, 255, 255, 0.3)'
            : 'transparent'};
          backdrop-filter: ${$isActive ? 'blur(10px)' : 'none'};
        `;
      
      case 'premium':
        return css`
          background: ${$isActive
            ? $customColors?.activeBackground || 'linear-gradient(135deg, #ffd700 0%, #ff8f00 100%)'
            : $customColors?.background || 'transparent'};
          color: ${$isActive
            ? $customColors?.activeText || '#000'
            : $customColors?.text || 'rgba(255, 255, 255, 0.7)'};
          box-shadow: ${$isActive ? '0 0 20px rgba(255, 215, 0, 0.3)' : 'none'};
        `;
      
      default: // default
        return css`
          background: ${$isActive
            ? $customColors?.activeBackground || 'rgba(255, 255, 255, 0.1)'
            : $customColors?.background || 'transparent'};
        `;
    }
  }}
  
  /* Disabled state */
  ${({ $isDisabled }) => $isDisabled && css`
    opacity: 0.5;
    cursor: not-allowed;
    pointer-events: none;
  `}
  
  /* Hover effects */
  &:hover:not(:disabled) {
    ${({ variant, $isActive, $customColors }) => {
      if ($isActive) return '';
      
      switch (variant) {
        case 'pills':
          return css`
            background: ${$customColors?.background || 'rgba(255, 255, 255, 0.05)'};
          `;
        case 'underline':
          return css`
            border-bottom-color: ${$customColors?.indicator || 'rgba(0, 255, 255, 0.5)'};
          `;
        case 'cards':
          return css`
            background: ${$customColors?.background || 'rgba(255, 255, 255, 0.05)'};
            border-color: ${$customColors?.indicator || 'rgba(0, 255, 255, 0.2)'};
          `;
        case 'premium':
          return css`
            background: ${$customColors?.background || 'rgba(255, 215, 0, 0.1)'};
          `;
        default:
          return css`
            background: ${$customColors?.background || 'rgba(255, 255, 255, 0.05)'};
          `;
      }
    }}
    
    color: rgba(255, 255, 255, 0.9);
    transform: translateY(-1px);
  }
  
  /* Focus styles */
  &:focus-visible {
    outline: 2px solid #00ffff;
    outline-offset: 2px;
  }
  
  /* Active state - P1-4: Enhanced visual feedback on touch */
  &:active {
    transform: scale(0.98);
    background: rgba(0, 255, 255, 0.1);
  }

  /* Mobile optimizations */
  @media (max-width: 768px) {
    min-width: fit-content;

    /* P1-4: Immediate touch feedback on mobile */
    &:active {
      background: rgba(0, 255, 255, 0.15);
      transition: background 0.05s ease;
    }

    ${({ size }) => size === 'large' && css`
      padding: 0.75rem 1.25rem;
      font-size: 1rem;
    `}
  }
`;

const TabIcon = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  
  svg {
    width: 1.2em;
    height: 1.2em;
  }
`;

const TabLabel = styled.span<{ $showIcon: boolean }>`
  flex: 1;
  text-align: center;
  
  ${({ $showIcon }) => $showIcon && css`
    text-align: left;
  `}
  
  @media (max-width: 480px) {
    ${({ $showIcon }) => $showIcon && css`
      display: none; /* Hide labels on very small screens when icons are present */
    `}
  }
`;

const TabBadge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  background: #ff4757;
  color: white;
  font-size: 0.75rem;
  font-weight: 600;
  border-radius: 10px;
  margin-left: 0.25rem;
`;

const ActiveIndicator = styled(motion.div)<{
  variant: 'default' | 'pills' | 'underline' | 'cards' | 'premium';
  orientation: 'horizontal' | 'vertical';
  $customColors?: TabNavigationProps['customColors'];
}>`
  position: absolute;
  background: ${props => props.$customColors?.indicator || '#00ffff'};
  border-radius: 8px;
  z-index: 1;
  
  ${({ variant, orientation }) => {
    if (variant === 'underline') {
      return orientation === 'horizontal' ? css`
        bottom: 0;
        height: 2px;
        left: 0;
      ` : css`
        right: 0;
        width: 2px;
        top: 0;
      `;
    }
    
    return css`
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      opacity: 0.1;
    `;
  }}
`;

const TabTooltip = styled(motion.div)`
  position: absolute;
  top: -40px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.9);
  color: white;
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  font-size: 0.875rem;
  white-space: nowrap;
  pointer-events: none;
  z-index: 1000;
  
  &::after {
    content: '';
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    border: 6px solid transparent;
    border-top-color: rgba(0, 0, 0, 0.9);
  }
`;

// ================================================================
// ANIMATION VARIANTS
// ================================================================

const tabVariants = {
  initial: { scale: 1 },
  hover: { scale: 1.02 },
  tap: { scale: 0.98 },
  active: { scale: 1 }
};

const indicatorVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 }
};

const tooltipVariants = {
  initial: { opacity: 0, y: 5, scale: 0.9 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: 5, scale: 0.9 }
};

// ================================================================
// MAIN COMPONENT
// ================================================================

export const TabNavigation: React.FC<TabNavigationProps> = ({
  tabs,
  activeTab,
  onTabChange,
  variant = 'default',
  size = 'medium',
  orientation = 'horizontal',
  fullWidth = false,
  showIndicator = true,
  allowKeyboardNavigation = true,
  scrollable = false,
  centered = false,
  className,
  customColors
}) => {
  
  const [hoveredTab, setHoveredTab] = useState<string | null>(null);
  const [focusedTab, setFocusedTab] = useState<string | null>(null);
  const tabsListRef = useRef<HTMLDivElement>(null);
  const activeTabRef = useRef<HTMLButtonElement>(null);
  
  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!allowKeyboardNavigation) return;
    
    const currentIndex = tabs.findIndex(tab => tab.id === activeTab);
    let nextIndex = currentIndex;
    
    switch (e.key) {
      case 'ArrowLeft':
      case 'ArrowUp':
        e.preventDefault();
        nextIndex = currentIndex > 0 ? currentIndex - 1 : tabs.length - 1;
        break;
      case 'ArrowRight':
      case 'ArrowDown':
        e.preventDefault();
        nextIndex = currentIndex < tabs.length - 1 ? currentIndex + 1 : 0;
        break;
      case 'Home':
        e.preventDefault();
        nextIndex = 0;
        break;
      case 'End':
        e.preventDefault();
        nextIndex = tabs.length - 1;
        break;
      default:
        return;
    }
    
    const nextTab = tabs[nextIndex];
    if (nextTab && !nextTab.isDisabled) {
      onTabChange(nextTab.id);
    }
  };
  
  // Auto-scroll to active tab on mobile
  useEffect(() => {
    if (scrollable && activeTabRef.current && tabsListRef.current) {
      const container = tabsListRef.current;
      const activeTab = activeTabRef.current;
      
      const containerRect = container.getBoundingClientRect();
      const tabRect = activeTab.getBoundingClientRect();
      
      if (orientation === 'horizontal') {
        const scrollLeft = activeTab.offsetLeft - (containerRect.width - tabRect.width) / 2;
        container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
      } else {
        const scrollTop = activeTab.offsetTop - (containerRect.height - tabRect.height) / 2;
        container.scrollTo({ top: scrollTop, behavior: 'smooth' });
      }
    }
  }, [activeTab, scrollable, orientation]);
  
  return (
    <TabContainer
      orientation={orientation}
      $fullWidth={fullWidth}
      $scrollable={scrollable}
      $centered={centered}
      className={className}
      onKeyDown={handleKeyDown}
      role="tablist"
      aria-orientation={orientation}
    >
      <TabsList
        ref={tabsListRef}
        orientation={orientation}
        $fullWidth={fullWidth}
      >
        {tabs.map((tab, index) => {
          const isActive = tab.id === activeTab;
          
          return (
            <TabButton
              key={tab.id}
              ref={isActive ? activeTabRef : undefined}
              variant={variant}
              size={size}
              orientation={orientation}
              $isActive={isActive}
              $isDisabled={tab.isDisabled || false}
              $fullWidth={fullWidth}
              $customColors={customColors}
              variants={tabVariants}
              initial="initial"
              animate={isActive ? "active" : "initial"}
              whileHover={!tab.isDisabled ? "hover" : undefined}
              whileTap={!tab.isDisabled ? "tap" : undefined}
              onClick={() => !tab.isDisabled && onTabChange(tab.id)}
              onMouseEnter={() => setHoveredTab(tab.id)}
              onMouseLeave={() => setHoveredTab(null)}
              onFocus={() => setFocusedTab(tab.id)}
              onBlur={() => setFocusedTab(null)}
              role="tab"
              aria-selected={isActive}
              aria-controls={`panel-${tab.id}`}
              aria-disabled={tab.isDisabled}
              tabIndex={isActive ? 0 : -1}
              id={`tab-${tab.id}`}
            >
              {/* Tab content */}
              {tab.icon && (
                <TabIcon>
                  {tab.icon}
                </TabIcon>
              )}
              
              <TabLabel $showIcon={Boolean(tab.icon)}>
                {tab.label}
              </TabLabel>
              
              {tab.badge && (
                <TabBadge>
                  {tab.badge}
                </TabBadge>
              )}
              
              {/* Tooltip */}
              <AnimatePresence>
                {tab.tooltip && hoveredTab === tab.id && (
                  <TabTooltip
                    variants={tooltipVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    transition={{ duration: 0.2 }}
                  >
                    {tab.tooltip}
                  </TabTooltip>
                )}
              </AnimatePresence>
            </TabButton>
          );
        })}
        
        {/* Active indicator */}
        {showIndicator && variant !== 'underline' && (
          <AnimatePresence>
            <ActiveIndicator
              key={activeTab}
              variant={variant}
              orientation={orientation}
              $customColors={customColors}
              variants={indicatorVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.3, ease: "easeInOut" }}
              layoutId="activeIndicator"
            />
          </AnimatePresence>
        )}
      </TabsList>
    </TabContainer>
  );
};

export default TabNavigation;
