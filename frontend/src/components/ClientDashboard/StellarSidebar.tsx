/**
 * StellarSidebar.tsx
 * ==================
 *
 * Revolutionary Stellar Constellation Sidebar for the Galaxy Dashboard
 * Designed by Seraphina, The Digital Alchemist
 *
 * Features:
 * - Cosmic constellation navigation with particle effects
 * - Fluid gradient mastery with dynamic color transitions
 * - Advanced micro-interactions with stellar glow effects
 * - Mobile-first collapsible design with stellar animations
 * - WCAG AA accessibility with keyboard navigation
 * - Performance-optimized with GPU acceleration
 *
 * Master Prompt v28 Alignment:
 * - Sensational aesthetics with cosmic grandeur
 * - Award-winning gradient systems and particle physics
 * - Mobile-first ultra-responsive design
 * - Accessibility as art with inclusive design
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ThemeProvider } from 'styled-components';
import { Sparkles, Menu, X, ChevronLeft, ChevronRight } from 'lucide-react';

import {
  navigationItems,
  sectionTitles,
  navStatusMeta,
  NavItemData,
} from './StellarSidebar.config';
import {
  stellarTheme,
  SidebarContainer,
  SidebarHeader,
  LogoContainer,
  CollapseToggle,
  NavigationSection,
  SectionTitle,
  NavItem,
  NavStatusBadge,
  SidebarFooter,
  MobileBackdrop,
  MobileToggle,
} from './StellarSidebar.styles';

// === COMPONENT PROPS ===
interface StellarSidebarProps {
  activeSection: string;
  onSectionChange: (sectionId: string) => void;
  className?: string;
}

// === MAIN COMPONENT ===
const StellarSidebar: React.FC<StellarSidebarProps> = ({
  activeSection,
  onSectionChange,
  className,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

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
    onSectionChange(sectionId);
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
  const groupedItems = navigationItems.reduce((acc, item) => {
    if (!acc[item.section]) {
      acc[item.section] = [];
    }
    acc[item.section].push(item);
    return acc;
  }, {} as Record<string, NavItemData[]>);

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
    <ThemeProvider theme={stellarTheme}>
      {/* Mobile Toggle */}
      <MobileToggle
        onClick={handleToggle}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        aria-label="Toggle navigation menu"
      >
        {isMobileOpen ? <X size={24} /> : <Menu size={24} />}
      </MobileToggle>

      {/* Mobile Backdrop */}
      <AnimatePresence>
        {isMobile && isMobileOpen && (
          <MobileBackdrop
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar Container */}
      <SidebarContainer
        className={className}
        isCollapsed={isMobile ? !isMobileOpen : isCollapsed}
        isMobile={isMobile}
        variants={!isMobile ? sidebarVariants : undefined}
        animate={!isMobile ? (isCollapsed ? 'collapsed' : 'expanded') : undefined}
        initial={false}
      >
        {/* Header */}
        <SidebarHeader isCollapsed={isMobile ? !isMobileOpen : isCollapsed}>
          <LogoContainer
            isCollapsed={isMobile ? !isMobileOpen : isCollapsed}
            onClick={() => handleSectionChange('overview')}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <div className="logo-icon">
              <Sparkles size={20} color={stellarTheme.colors.deepSpace} />
            </div>
            <span className="logo-text">Galaxy</span>
          </LogoContainer>

          {!isMobile && (
            <CollapseToggle
              isCollapsed={isCollapsed}
              onClick={() => setIsCollapsed(!isCollapsed)}
              whileHover={{ rotate: 180 }}
              whileTap={{ scale: 0.9 }}
              aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </CollapseToggle>
          )}
        </SidebarHeader>

        {/* Navigation */}
        <NavigationSection>
          <motion.div variants={contentVariants} initial="hidden" animate="visible">
            {Object.entries(groupedItems).map(([section, items]) => (
              <div key={section}>
                <SectionTitle
                  isCollapsed={isMobile ? !isMobileOpen : isCollapsed}
                  variants={itemVariants}
                >
                  {sectionTitles[section as keyof typeof sectionTitles]}
                </SectionTitle>

                {items.map((item) => {
                  const IconComponent = item.icon;
                  const isActive = activeSection === item.id;
                  const statusConfig = item.status ? navStatusMeta[item.status] : null;
                  const StatusIcon = statusConfig?.Icon;
                  const tooltipLabel = statusConfig
                    ? `${item.label} (${statusConfig.label})`
                    : item.label;

                  return (
                    <NavItem
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
                    >
                      <div className="nav-icon">
                        <IconComponent size={20} />
                      </div>
                      <span className="nav-text">{item.label}</span>
                      <div className="nav-meta">
                        {item.status && statusConfig && StatusIcon && (
                          <NavStatusBadge
                            status={item.status}
                            isCollapsed={isMobile ? !isMobileOpen : isCollapsed}
                          >
                            <StatusIcon size={10} />
                            <span>{statusConfig.label}</span>
                          </NavStatusBadge>
                        )}
                      </div>
                      <div className="nav-tooltip">{tooltipLabel}</div>
                    </NavItem>
                  );
                })}
              </div>
            ))}
          </motion.div>
        </NavigationSection>

        {/* Footer */}
        <SidebarFooter isCollapsed={isMobile ? !isMobileOpen : isCollapsed}>
          <div className="version-info">Galaxy Dashboard v2.0</div>
          <div className="stellar-signature">Designed by Sean Swan</div>
        </SidebarFooter>
      </SidebarContainer>
    </ThemeProvider>
  );
};

export default StellarSidebar;
