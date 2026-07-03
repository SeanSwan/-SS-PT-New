/**
 * UniversalThemeToggle.tsx — Crystalline Swan theme changer control
 * ==================================================================
 * Header-mounted control (Header/components/ActionIcons.tsx + client home
 * rail). The swatch button previews the ACTIVE theme (data-driven — every
 * registered theme styles it automatically) and opens a grouped picker with
 * all themes plus the site-wide animations switch.
 *
 * Architecture:
 * - UniversalThemeToggle.styles.ts — data-driven styled components
 * - UniversalThemeToggle.panel.tsx — grouped picker + animations switch
 * - themeToggleMetadata (exported here) — per-theme icon + accessible name,
 *   contract-locked against the theme registry.
 */
import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, useReducedMotion, type Variants } from 'framer-motion';
import {
  Sparkles, Sun, Zap, Moon, Flame, Snowflake, Contrast, Swords,
  Flower2, TreePine, Waves, Crown, Leaf, Gem, Orbit, Layers
} from 'lucide-react';
import { useUniversalTheme, type ThemeId } from './UniversalThemeContext';
import ThemePickerPanel from './UniversalThemeToggle.panel';
import { ToggleRoot, SwatchButton, IconHalo } from './UniversalThemeToggle.styles';

type ThemeToggleIconKey =
  | 'sparkles' | 'sun' | 'zap' | 'moon' | 'flame' | 'snowflake' | 'contrast'
  | 'swords' | 'flower' | 'tree' | 'waves' | 'crown' | 'leaf' | 'gem'
  | 'orbit' | 'layers';

export const themeToggleMetadata: Record<ThemeId, {
  description: string;
  icon: ThemeToggleIconKey;
}> = {
  'crystalline-default': { description: 'Crystalline Swan', icon: 'sparkles' },
  'crystalline-light': { description: 'Arctic Dawn', icon: 'sun' },
  'crystalline-dark': { description: 'Crystalline Dark', icon: 'zap' },
  'crystalline-mono': { description: 'Monochrome', icon: 'moon' },
  'cinematic-ember': { description: 'Obsidian Ember', icon: 'flame' },
  'frozen-aurora': { description: 'Frozen Aurora', icon: 'snowflake' },
  'obsidian-black': { description: 'Obsidian Black', icon: 'contrast' },
  'cyberpunk-edgerunners': { description: 'Cyberpunk Cyan', icon: 'swords' },
  'obsidian-bloom': { description: 'Obsidian Bloom', icon: 'flower' },
  'frozen-canopy': { description: 'Frozen Canopy', icon: 'tree' },
  'ember-realm': { description: 'Ember Realm', icon: 'flame' },
  'twilight-lagoon': { description: 'Twilight Lagoon', icon: 'waves' },
  'nebula-crown': { description: 'Nebula Crown', icon: 'crown' },
  'enchanted-forest': { description: 'Enchanted Forest', icon: 'leaf' },
  'void-crystal': { description: 'Void Crystal', icon: 'gem' },
  'deep-ocean': { description: 'Deep Ocean', icon: 'waves' },
  'obsidian-aurora': { description: 'Obsidian Aurora', icon: 'orbit' },
  'carbon-fiber': { description: 'Carbon Fiber', icon: 'layers' },
  'ruby-forge': { description: 'Ruby Forge', icon: 'flame' },
  'emerald-vault': { description: 'Emerald Vault', icon: 'leaf' },
  'solar-gold': { description: 'Solar Gold', icon: 'sun' },
  'amethyst-night': { description: 'Amethyst Night', icon: 'gem' },
  'rose-quartz': { description: 'Rose Quartz', icon: 'flower' },
  'copper-patina': { description: 'Copper Patina', icon: 'contrast' },
  'aqua-abyss': { description: 'Aqua Abyss', icon: 'waves' },
  'graphite-luxe': { description: 'Graphite Luxe', icon: 'layers' },
  'pearl-noir': { description: 'Pearl Noir', icon: 'moon' },
  'circuit-lime': { description: 'Circuit Lime', icon: 'zap' },
  'sakura-midnight': { description: 'Sakura Midnight', icon: 'flower' },
  'indigo-pulse': { description: 'Indigo Pulse', icon: 'zap' },
  'sunset-mirage': { description: 'Sunset Mirage', icon: 'sun' },
  'steel-tempest': { description: 'Steel Tempest', icon: 'layers' },
  'vapor-dream': { description: 'Vapor Dream', icon: 'orbit' },
  'burgundy-noir': { description: 'Burgundy Noir', icon: 'gem' },
  'tron-grid': { description: 'Tron Grid', icon: 'swords' },
  'orchid-veil': { description: 'Orchid Veil', icon: 'flower' },
  'deep-jade': { description: 'Deep Jade', icon: 'leaf' },
  'midnight-mango': { description: 'Midnight Mango', icon: 'sparkles' },
};

const getThemeIcon = (themeId: ThemeId, size = 20) => {
  switch (themeToggleMetadata[themeId].icon) {
    case 'sun': return <Sun size={size} />;
    case 'zap': return <Zap size={size} />;
    case 'moon': return <Moon size={size} />;
    case 'flame': return <Flame size={size} />;
    case 'snowflake': return <Snowflake size={size} />;
    case 'contrast': return <Contrast size={size} />;
    case 'swords': return <Swords size={size} />;
    case 'flower': return <Flower2 size={size} />;
    case 'tree': return <TreePine size={size} />;
    case 'waves': return <Waves size={size} />;
    case 'crown': return <Crown size={size} />;
    case 'leaf': return <Leaf size={size} />;
    case 'gem': return <Gem size={size} />;
    case 'orbit': return <Orbit size={size} />;
    case 'layers': return <Layers size={size} />;
    case 'sparkles':
    default: return <Sparkles size={size} />;
  }
};

interface UniversalThemeToggleProps {
  showTooltip?: boolean;
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

const UniversalThemeToggle: React.FC<UniversalThemeToggleProps> = ({
  size = 'medium',
  className
}) => {
  const { currentTheme, theme, setTheme, motionEnabled, setMotionEnabled } = useUniversalTheme();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  // Close on outside click / Escape
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const collapse = prefersReducedMotion || !motionEnabled;
  const panelVariants: Variants = collapse
    ? {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { duration: 0.12 } }
      }
    : {
        hidden: { opacity: 0, y: -8, scale: 0.96 },
        visible: {
          opacity: 1, y: 0, scale: 1,
          transition: { type: 'spring', stiffness: 380, damping: 28 }
        }
      };

  const iconSize = size === 'small' ? 16 : size === 'large' ? 24 : 20;

  return (
    <ToggleRoot ref={rootRef} className={className}>
      <SwatchButton
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Theme: ${theme.name}. Open theme picker`}
        title={`Theme: ${theme.name}`}
        $bg={theme.background.primary}
        $accent={theme.colors.primary}
        $secondary={theme.colors.accent}
        $text={theme.text.accent}
      >
        <IconHalo>{getThemeIcon(currentTheme, iconSize)}</IconHalo>
      </SwatchButton>

      <AnimatePresence>
        {open && (
          <ThemePickerPanel
            currentTheme={currentTheme}
            motionEnabled={motionEnabled}
            variants={panelVariants}
            panelBg={theme.background.primary}
            panelLine={theme.colors.primary}
            panelText={theme.text.primary}
            panelMuted={theme.text.muted}
            onPick={(id) => {
              setTheme(id);
            }}
            onToggleMotion={() => setMotionEnabled(!motionEnabled)}
          />
        )}
      </AnimatePresence>
    </ToggleRoot>
  );
};

export default UniversalThemeToggle;
