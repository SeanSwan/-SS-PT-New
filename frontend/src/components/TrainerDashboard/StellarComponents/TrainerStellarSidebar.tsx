/**
 * TrainerStellarSidebar.tsx
 * =========================
 *
 * Cosmic Training Command Center Sidebar for Trainer Dashboard
 * Adapted from Client Dashboard's stellar design with trainer-specific sections
 * Designed by Seraphina, The Digital Alchemist
 *
 * Features:
 * - Stellar constellation navigation with trainer command center theme
 * - Enhanced cosmic gradients with professional gold/cyan accents
 * - Advanced micro-interactions with training-focused glow effects
 * - Mobile-first collapsible design with stellar animations
 * - WCAG AA accessibility with keyboard navigation
 * - Performance-optimized with GPU acceleration
 *
 * Master Prompt v28 Alignment:
 * - Professional aesthetics with cosmic training center grandeur
 * - Award-winning gradient systems with blue/purple/gold palette
 * - Mobile-first ultra-responsive design
 * - Accessibility as art with inclusive design
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dumbbell, Menu, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useUniversalTheme } from '../../../context/ThemeContext';

import {
  trainerNavigationItems,
  trainerSectionTitles,
  navStatusMeta,
  TrainerNavItemData,
} from './TrainerStellarSidebar.config';
import {
  TrainerSidebarContainer,
  TrainerSidebarHeader,
  TrainerLogoContainer,
  TrainerCollapseToggle,
  TrainerNavigationSection,
  TrainerSectionTitle,
  TrainerNavItem,
  TrainerNavStatusBadge,
  TrainerSidebarFooter,
  TrainerMobileBackdrop,
  TrainerMobileToggle,
} from './TrainerStellarSidebar.styles';

// === COMPONENT PROPS ===
interface TrainerStellarSidebarProps {
  activeSection?: string;
  onSectionChange?: (sectionId: string) => void;
  className?: string;
}

// === MAIN COMPONENT ===
const TrainerStellarSidebar: React.FC<TrainerStellarSidebarProps> = ({
  activeSection = 'overview',
  onSectionChange,
  className,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const { theme } = useUniversalTheme();

  // Check for mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
      if (window.innerWidth <= 768) {
        setIsCollapsed(true);
        setIsMobileOpen(false);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Handle section change
  const handleSectionChange = (sectionId: string) => {
    if (onSectionChange) {
      onSectionChange(sectionId);
    }

    if (isMobile) {
      setIsMobileOpen(false);
    }
  };

  // Handle toggle
  const handleToggle = () => {
    if (isMobile) {
      setIsMobileOpen(!isMobileOpen);
    } else {
      setIsCollapsed(!isCollapsed);
    }
  };

  // Group navigation items by section
  const groupedItems = trainerNavigationItems.reduce((acc, item) => {
    if (!acc[item.section]) {
      acc[item.section] = [];
    }
    acc[item.section].push(item);
    return acc;
  }, {} as Record<string, TrainerNavItemData[]>);

  // Animation variants
  const sidebarVariants = {
    expanded: { width: 280 },
    collapsed: { width: 80 },
  };

  const contentVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { staggerChildren: 0.05 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 },
  };

  return (
    <>
      {/* Mobile Toggle */}
      <TrainerMobileToggle
        onClick={handleToggle}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        aria-label="Toggle trainer navigation menu"
        theme={theme}
      >
        {isMobileOpen ? <X size={24} /> : <Menu size={24} />}
      </TrainerMobileToggle>

      {/* Mobile Backdrop */}
      <AnimatePresence>
        {isMobile && isMobileOpen && (
          <TrainerMobileBackdrop
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileOpen(false)}
            theme={theme}
          />
        )}
      </AnimatePresence>

      {/* Trainer Sidebar Container */}
      <TrainerSidebarContainer
        className={className}
        isCollapsed={isMobile ? !isMobileOpen : isCollapsed}
        isMobile={isMobile}
        variants={!isMobile ? sidebarVariants : undefined}
        animate={!isMobile ? (isCollapsed ? 'collapsed' : 'expanded') : undefined}
        initial={false}
        theme={theme}
      >
        {/* Header */}
        <TrainerSidebarHeader isCollapsed={isMobile ? !isMobileOpen : isCollapsed} theme={theme}>
          <TrainerLogoContainer
            isCollapsed={isMobile ? !isMobileOpen : isCollapsed}
            onClick={() => handleSectionChange('overview')}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            theme={theme}
          >
            <div className="trainer-logo-icon">
              <Dumbbell size={20} />
            </div>
            <span className="trainer-logo-text">Training Hub</span>
          </TrainerLogoContainer>

          {!isMobile && (
            <TrainerCollapseToggle
              isCollapsed={isCollapsed}
              onClick={() => setIsCollapsed(!isCollapsed)}
              whileHover={{ rotate: 180 }}
              whileTap={{ scale: 0.9 }}
              aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              theme={theme}
            >
              {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </TrainerCollapseToggle>
          )}
        </TrainerSidebarHeader>

        {/* Navigation */}
        <TrainerNavigationSection theme={theme}>
          <motion.div variants={contentVariants} initial="hidden" animate="visible">
            {Object.entries(groupedItems).map(([section, items]) => (
              <div key={section}>
                <TrainerSectionTitle
                  isCollapsed={isMobile ? !isMobileOpen : isCollapsed}
                  variants={itemVariants}
                  theme={theme}
                >
                  {trainerSectionTitles[section as keyof typeof trainerSectionTitles]}
                </TrainerSectionTitle>

                {items.map((item) => {
                  const IconComponent = item.icon;
                  const isActive = activeSection === item.id;
                  const statusConfig = item.status ? navStatusMeta[item.status] : null;
                  const StatusIcon = statusConfig?.Icon;
                  const tooltipLabel = statusConfig
                    ? `${item.label} (${statusConfig.label})`
                    : item.label;

                  return (
                    <TrainerNavItem
                      key={item.id}
                      isActive={isActive}
                      isCollapsed={isMobile ? !isMobileOpen : isCollapsed}
                      onClick={() => handleSectionChange(item.id)}
                      variants={itemVariants}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      aria-label={`Navigate to ${item.label}`}
                      role="button"
                      tabIndex={0}
                      theme={theme}
                    >
                      <div className="nav-icon">
                        <IconComponent size={20} />
                      </div>
                      <span className="nav-text">{item.label}</span>
                      <div className="nav-meta">
                        {item.status && statusConfig && StatusIcon && (
                          <TrainerNavStatusBadge
                            status={item.status}
                            isCollapsed={isMobile ? !isMobileOpen : isCollapsed}
                          >
                            <StatusIcon size={10} />
                            <span>{statusConfig.label}</span>
                          </TrainerNavStatusBadge>
                        )}
                        {item.badge && item.badge > 0 && (
                          <span style={{ fontSize: '0.75rem', color: '#FFD700' }}>{item.badge}</span>
                        )}
                      </div>
                      <div className="nav-tooltip">{tooltipLabel}</div>
                    </TrainerNavItem>
                  );
                })}
              </div>
            ))}
          </motion.div>
        </TrainerNavigationSection>

        {/* Footer */}
        <TrainerSidebarFooter isCollapsed={isMobile ? !isMobileOpen : isCollapsed} theme={theme}>
          <div className="version-info">Trainer Dashboard v2.0</div>
          <div className="stellar-signature">Designed by Sean Swan</div>
        </TrainerSidebarFooter>
      </TrainerSidebarContainer>
    </>
  );
};

export default TrainerStellarSidebar;
