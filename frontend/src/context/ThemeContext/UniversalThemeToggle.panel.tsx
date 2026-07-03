/**
 * UniversalThemeToggle.panel.tsx — grouped theme picker + animations switch
 * ==========================================================================
 * Popover for the header theme changer: every registered theme rendered as a
 * data-driven swatch (background/primary/accent pulled from the theme object),
 * organized into named collections, with the site-wide animations switch.
 * Any theme not in a named group lands in "More" automatically — future
 * themes can never silently vanish from the picker.
 */
import React from 'react';
import { type Variants } from 'framer-motion';
import { Check } from 'lucide-react';
import { themes, type ThemeId } from './UniversalThemeContext';
import {
  Panel,
  PanelHeader,
  MotionSwitch,
  GroupLabel,
  SwatchGrid,
  SwatchItem,
  SwatchChip
} from './UniversalThemeToggle.styles';

const NAMED_GROUPS: Array<{ label: string; ids: ThemeId[] }> = [
  {
    label: 'Signature',
    ids: [
      'crystalline-default', 'crystalline-dark', 'crystalline-light', 'crystalline-mono',
      'void-crystal', 'obsidian-black', 'carbon-fiber'
    ] as ThemeId[]
  },
  {
    label: 'Worlds',
    ids: [
      'cinematic-ember', 'frozen-aurora', 'cyberpunk-edgerunners', 'obsidian-bloom',
      'frozen-canopy', 'ember-realm', 'twilight-lagoon', 'nebula-crown',
      'enchanted-forest', 'deep-ocean', 'obsidian-aurora'
    ] as ThemeId[]
  },
  {
    label: 'Jewels',
    ids: [
      'ruby-forge', 'emerald-vault', 'solar-gold', 'amethyst-night', 'rose-quartz',
      'copper-patina', 'aqua-abyss', 'graphite-luxe', 'pearl-noir', 'circuit-lime'
    ] as ThemeId[]
  },
  {
    label: 'New Wave',
    ids: [
      'sakura-midnight', 'indigo-pulse', 'sunset-mirage', 'steel-tempest', 'vapor-dream',
      'burgundy-noir', 'tron-grid', 'orchid-veil', 'deep-jade', 'midnight-mango'
    ] as ThemeId[]
  }
];

/** Grouped ids + a computed "More" bucket so unlisted themes always show. */
export const buildThemeGroups = (): Array<{ label: string; ids: ThemeId[] }> => {
  const allIds = Object.keys(themes) as ThemeId[];
  const named = NAMED_GROUPS.map((group) => ({
    label: group.label,
    ids: group.ids.filter((id) => id in themes)
  }));
  const covered = new Set(named.flatMap((group) => group.ids));
  const rest = allIds.filter((id) => !covered.has(id));
  return rest.length ? [...named, { label: 'More', ids: rest }] : named;
};

interface ThemePickerPanelProps {
  currentTheme: ThemeId;
  motionEnabled: boolean;
  variants: Variants;
  panelBg: string;
  panelLine: string;
  panelText: string;
  panelMuted: string;
  onPick: (id: ThemeId) => void;
  onToggleMotion: () => void;
}

const ThemePickerPanel: React.FC<ThemePickerPanelProps> = ({
  currentTheme, motionEnabled, variants,
  panelBg, panelLine, panelText, panelMuted,
  onPick, onToggleMotion
}) => {
  const groups = buildThemeGroups();
  const accent = themes[currentTheme].colors.primary;

  return (
    <Panel
      role="menu"
      aria-label="Choose a theme"
      $bg={panelBg}
      $line={panelLine}
      variants={variants}
      initial="hidden"
      animate="visible"
      exit="hidden"
    >
      <PanelHeader $line={panelLine} $text={panelText}>
        <h3>Themes</h3>
        <MotionSwitch
          type="button"
          $on={motionEnabled}
          $accent={accent}
          $text={panelText}
          onClick={onToggleMotion}
          aria-pressed={motionEnabled}
          aria-label={`Animations ${motionEnabled ? 'on' : 'off'}`}
        >
          <span className="dot" aria-hidden="true" />
          Animations {motionEnabled ? 'On' : 'Off'}
        </MotionSwitch>
      </PanelHeader>

      {groups.map((group) => (
        <div key={group.label}>
          <GroupLabel $muted={panelMuted}>{group.label}</GroupLabel>
          <SwatchGrid>
            {group.ids.map((id) => {
              const theme = themes[id];
              const active = id === currentTheme;
              return (
                <SwatchItem
                  key={id}
                  type="button"
                  role="menuitemradio"
                  aria-checked={active}
                  $active={active}
                  $accent={theme.colors.primary}
                  $text={panelText}
                  onClick={() => onPick(id)}
                >
                  <SwatchChip
                    aria-hidden="true"
                    $bg={theme.background.primary}
                    $primary={theme.colors.primary}
                    $accent={theme.colors.accent}
                  />
                  <span className="name">{theme.name}</span>
                  {active && <Check size={14} aria-hidden="true" />}
                </SwatchItem>
              );
            })}
          </SwatchGrid>
        </div>
      ))}
    </Panel>
  );
};

export default ThemePickerPanel;
