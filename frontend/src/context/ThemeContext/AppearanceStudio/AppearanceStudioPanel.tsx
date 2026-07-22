/**
 * Appearance Studio: deliberate, synthetic preview for color and structure.
 * Nothing in this panel reads or renders client data.
 */
import React, { useMemo, useState } from 'react';
import type { Variants } from 'framer-motion';
import { Star } from 'lucide-react';
import type {
  AppearanceProfile,
  StyleLensRegistry,
} from '../../../core/style-lens-os';
import { themes, type ThemeId } from '../UniversalThemeContext';
import AppearanceStudioPreview, {
  type PreviewRole,
  type PreviewViewport,
} from './AppearanceStudioPreview';
import { useDialogFocusTrap } from './useDialogFocusTrap';
import { useRovingTablist } from './useRovingTablist';
import {
  ChoiceButton,
  ChoiceGrid,
  ColorChip,
  ColorCount,
  ColorGrid,
  FavoriteButton,
  Pane,
  PreviewColumn,
  PreviewControls,
  PrimaryButton,
  QuickStrip,
  SecondaryButton,
  StudioBody,
  StudioFooter,
  StudioHeader,
  StudioPanel,
  StudioTab,
  StudioTabs,
  StyleCard,
  StyleGrid,
  StyleSelect,
} from './AppearanceStudio.styles';

type TabId = 'style' | 'color' | 'motion' | 'density';
const TABS: Array<{ id: TabId; label: string }> = [
  { id: 'style', label: 'Style' },
  { id: 'color', label: 'Color' },
  { id: 'motion', label: 'Motion' },
  { id: 'density', label: 'Density' },
];
const TAB_IDS = TABS.map(({ id }) => id);
const ROLES: PreviewRole[] = ['user', 'client', 'trainer', 'admin'];
const VIEWPORTS: PreviewViewport[] = ['mobile', 'tablet', 'desktop'];

interface AppearanceStudioPanelProps {
  currentTheme: ThemeId;
  draftTheme: ThemeId;
  draftProfile: AppearanceProfile;
  registry: StyleLensRegistry;
  variants: Variants;
  onThemeChange: (themeId: ThemeId) => void;
  onProfileChange: (profile: AppearanceProfile) => void;
  onApply: () => void | Promise<void>;
  onCancel: () => void;
}

const AppearanceStudioPanel: React.FC<AppearanceStudioPanelProps> = ({
  currentTheme,
  draftTheme,
  draftProfile,
  registry,
  variants,
  onThemeChange,
  onProfileChange,
  onApply,
  onCancel,
}) => {
  const [tab, setTab] = useState<TabId>('style');
  const [role, setRole] = useState<PreviewRole>('client');
  const [viewport, setViewport] = useState<PreviewViewport>('desktop');
  const [favorites, setFavorites] = useState<string[]>([]);
  const lenses = registry.available();
  const lens = registry.resolve(draftProfile.styleLensId);
  // The FULL colorway catalog (all registered themes), current draft first so the active
  // pick is always visible without scrolling. Replaces the old 12-item featured cap
  // (buildFeaturedIds) that hid 26 colorways from the Swan Lens — the header picker had a
  // "Show all" toggle but this panel never did, which read as "my colors disappeared".
  const colorIds = useMemo(() => {
    const all = Object.keys(themes) as ThemeId[];
    return [draftTheme, ...all.filter((id) => id !== draftTheme)];
  }, [draftTheme]);
  const { dialogRef, onDialogKeyDown } = useDialogFocusTrap(onCancel);
  const { tabProps } = useRovingTablist(TAB_IDS, tab, setTab);

  const updateProfile = (changes: Partial<AppearanceProfile>) => {
    onProfileChange({
      ...draftProfile,
      ...changes,
      updatedAt: new Date().toISOString(),
    });
  };

  const toggleFavorite = (id: string) => {
    setFavorites((current) =>
      current.includes(id)
        ? current.filter((favorite) => favorite !== id)
        : [...current, id],
    );
  };

  return (
    <StudioPanel
      data-appearance-studio
      ref={dialogRef}
      onKeyDown={onDialogKeyDown}
      role='dialog'
      aria-modal='true'
      aria-label='Appearance Studio'
      variants={variants}
      initial='hidden'
      animate='visible'
      exit='hidden'
    >
      <StudioHeader role='presentation'>
        <div>
          <h2>Appearance Studio</h2>
          <p>Preview structure safely, then apply it everywhere.</p>
        </div>
        <small>{themes[currentTheme].name} saved</small>
      </StudioHeader>

      <StudioTabs role='tablist' aria-label='Appearance controls'>
        {TABS.map(({ id, label }, index) => (
          <StudioTab
            key={id}
            type='button'
            role='tab'
            aria-selected={tab === id}
            $active={tab === id}
            onClick={() => setTab(id)}
            {...tabProps(id, index)}
          >
            {label}
          </StudioTab>
        ))}
      </StudioTabs>

      <StudioBody>
        <Pane role='tabpanel'>
          {tab === 'style' && (
            <>
              <h3>Structural lenses</h3>
              <p>Routes and live state stay mounted while hierarchy changes.</p>
              <QuickStrip>
                <span>Quick path</span>
                <span>{favorites.length} favorites</span>
                <span>Current: {lens.name}</span>
              </QuickStrip>
              <StyleGrid>
                {lenses.map((item) => {
                  const favorite = favorites.includes(item.id);
                  const active = item.id === draftProfile.styleLensId;
                  return (
                    <StyleCard key={item.id} $active={active}>
                      <FavoriteButton
                        type='button'
                        $active={favorite}
                        aria-label={`${favorite ? 'Unfavorite' : 'Favorite'} ${item.name}`}
                        onClick={() => toggleFavorite(item.id)}
                      >
                        <Star size={18} fill={favorite ? 'currentColor' : 'none'} aria-hidden='true' />
                      </FavoriteButton>
                      <StyleSelect
                        type='button'
                        aria-pressed={active}
                        aria-label={`${item.name} style`}
                        onClick={() => updateProfile({ styleLensId: item.id })}
                      >
                        <strong>{item.name}</strong>
                        <span>{item.description}</span>
                        <em>{item.layoutSignature}</em>
                      </StyleSelect>
                    </StyleCard>
                  );
                })}
              </StyleGrid>
            </>
          )}

          {tab === 'color' && (
            <>
              <h3>Color identity</h3>
              <p>Color and structural style remain independent.</p>
              <ColorCount>Showing all {colorIds.length} colorways — scroll for more</ColorCount>
              <ColorGrid role='listbox' aria-label='Colorways'>
                {colorIds.map((id) => {
                  const theme = themes[id];
                  return (
                    <ChoiceButton
                      key={id}
                      type='button'
                      role='option'
                      $active={draftTheme === id}
                      aria-selected={draftTheme === id}
                      onClick={() => onThemeChange(id)}
                    >
                      <ColorChip
                        $bg={theme.background.primary}
                        $primary={theme.colors.primary}
                        $accent={theme.colors.accent}
                        aria-hidden='true'
                      />
                      {theme.name}
                    </ChoiceButton>
                  );
                })}
              </ColorGrid>
            </>
          )}

          {tab === 'motion' && (
            <>
              <h3>Motion capability</h3>
              <p>Layout stays selected even when motion is reduced or off.</p>
              <ChoiceGrid>
                {(['auto', 'reduced', 'off'] as const).map((mode) => (
                  <ChoiceButton
                    key={mode}
                    type='button'
                    $active={draftProfile.motionMode === mode}
                    aria-label={mode === 'auto' ? 'Automatic motion' : `${mode[0].toUpperCase()}${mode.slice(1)} motion`}
                    onClick={() => updateProfile({ motionMode: mode })}
                  >
                    {mode === 'auto' ? 'Automatic' : mode}
                  </ChoiceButton>
                ))}
              </ChoiceGrid>
            </>
          )}

          {tab === 'density' && (
            <>
              <h3>Information density</h3>
              <p>Compact preserves 44px controls and readable labels.</p>
              <ChoiceGrid>
                {(['comfortable', 'compact'] as const).map((density) => (
                  <ChoiceButton
                    key={density}
                    type='button'
                    $active={draftProfile.density === density}
                    aria-label={`${density[0].toUpperCase()}${density.slice(1)} density`}
                    onClick={() => updateProfile({ density })}
                  >
                    {density}
                  </ChoiceButton>
                ))}
              </ChoiceGrid>
            </>
          )}
        </Pane>

        <PreviewColumn>
          <PreviewControls aria-label='Synthetic preview role'>
            {ROLES.map((item) => (
              <button
                key={item}
                type='button'
                aria-label={`Preview ${item[0].toUpperCase()}${item.slice(1)}`}
                aria-pressed={role === item}
                onClick={() => setRole(item)}
              >{item}</button>
            ))}
          </PreviewControls>
          <PreviewControls aria-label='Synthetic preview viewport'>
            {VIEWPORTS.map((item) => (
              <button
                key={item}
                type='button'
                aria-label={`Preview ${item}`}
                aria-pressed={viewport === item}
                onClick={() => setViewport(item)}
              >{item}</button>
            ))}
          </PreviewControls>
          <AppearanceStudioPreview
            lens={lens}
            theme={themes[draftTheme]}
            role={role}
            viewport={viewport}
          />
        </PreviewColumn>
      </StudioBody>

      <StudioFooter>
        <SecondaryButton
          type='button'
          aria-label='Cancel appearance preview'
          onClick={onCancel}
        >Cancel</SecondaryButton>
        <PrimaryButton
          type='button'
          aria-label='Apply appearance'
          onClick={() => void onApply()}
        >Apply style</PrimaryButton>
      </StudioFooter>
    </StudioPanel>
  );
};

export default AppearanceStudioPanel;
