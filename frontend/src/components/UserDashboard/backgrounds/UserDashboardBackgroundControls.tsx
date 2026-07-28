import React from 'react';
import { Check, Clock3, ImagePlus, Pin, Shuffle } from 'lucide-react';
import {
  CUSTOM_USER_DASHBOARD_BACKGROUND_ID,
  USER_DASHBOARD_BACKGROUNDS,
  USER_DASHBOARD_BACKGROUND_ROTATION_INTERVALS,
  type UserDashboardBackgroundMode,
  type UserDashboardBackgroundPreference,
  type UserDashboardBackgroundRecipe,
} from './UserDashboardBackgrounds';
import {
  ActiveBackgroundPill,
  BackgroundCard,
  BackgroundCheck,
  BackgroundError,
  BackgroundGrid,
  BackgroundHeader,
  BackgroundMeta,
  BackgroundModeButton,
  BackgroundModeRow,
  BackgroundMood,
  BackgroundName,
  BackgroundPreview,
  BackgroundStudioSection,
  BackgroundTitle,
  RotationSelectRow,
  UploadPhotoButton,
} from './UserDashboardBackgroundControls.styles';

export interface UserDashboardBackgroundControlsProps {
  preference: UserDashboardBackgroundPreference;
  activeBackground: UserDashboardBackgroundRecipe;
  customUploadError: string | null;
  onModeChange: (mode: UserDashboardBackgroundMode) => void;
  onBackgroundSelect: (backgroundId: string) => void;
  onIntervalChange: (minutes: number) => void;
  onCustomImageFile: (file: File) => void;
}

const customPreviewFallback = `radial-gradient(circle at 28% 22%, color-mix(in srgb, var(--accent-primary, #60C0F0) 20%, transparent), transparent 42%),
  linear-gradient(135deg, var(--bg-base, #030712), color-mix(in srgb, var(--brand-primary, #002060) 34%, var(--bg-base, #030712)))`;

function recipePreviewStyle(background: UserDashboardBackgroundRecipe): React.CSSProperties {
  return { background: `${background.preview}, ${background.base}`, backgroundSize: 'cover' };
}

function customPreviewStyle(customImageUrl: string | null): React.CSSProperties {
  if (!customImageUrl) return { background: customPreviewFallback };
  return {
    background: `linear-gradient(180deg, color-mix(in srgb, var(--bg-base, #030712) 45%, transparent), var(--bg-base, #030712)), url("${customImageUrl}")`,
    backgroundSize: 'auto, cover',
    backgroundPosition: 'center, center',
  };
}

const UserDashboardBackgroundControls: React.FC<UserDashboardBackgroundControlsProps> = ({
  preference,
  activeBackground,
  customUploadError,
  onModeChange,
  onBackgroundSelect,
  onIntervalChange,
  onCustomImageFile,
}) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const customActive = preference.selectedId === CUSTOM_USER_DASHBOARD_BACKGROUND_ID;
  const activeName = customActive ? 'Custom Photo' : activeBackground.name;

  const handleCustomSelected = () => {
    if (preference.customImageUrl) {
      onBackgroundSelect(CUSTOM_USER_DASHBOARD_BACKGROUND_ID);
      return;
    }
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) onCustomImageFile(file);
    event.currentTarget.value = '';
  };

  return (
    <BackgroundStudioSection aria-label="App background">
      <BackgroundHeader>
        <BackgroundTitle>
          <span>App background</span>
          <strong>Dashboard atmosphere</strong>
        </BackgroundTitle>
        <ActiveBackgroundPill aria-live="polite">{activeName}</ActiveBackgroundPill>
      </BackgroundHeader>

      <BackgroundModeRow role="group" aria-label="Background change mode">
        <BackgroundModeButton
          type="button"
          $active={preference.mode === 'fixed'}
          aria-pressed={preference.mode === 'fixed'}
          onClick={() => onModeChange('fixed')}
        >
          <Pin size={15} aria-hidden="true" />
          Fixed
        </BackgroundModeButton>
        <BackgroundModeButton
          type="button"
          $active={preference.mode === 'rotate'}
          aria-pressed={preference.mode === 'rotate'}
          onClick={() => onModeChange('rotate')}
        >
          <Shuffle size={15} aria-hidden="true" />
          Rotate
        </BackgroundModeButton>
      </BackgroundModeRow>

      {preference.mode === 'rotate' && (
        <RotationSelectRow>
          <Clock3 size={15} aria-hidden="true" />
          <span>Every</span>
          <select
            aria-label="Background rotation interval"
            value={preference.intervalMinutes}
            onChange={(event) => onIntervalChange(Number(event.target.value))}
          >
            {USER_DASHBOARD_BACKGROUND_ROTATION_INTERVALS.map((interval) => (
              <option key={interval.minutes} value={interval.minutes}>{interval.label}</option>
            ))}
          </select>
        </RotationSelectRow>
      )}

      <BackgroundGrid>
        <BackgroundCard
          type="button"
          $active={customActive}
          aria-pressed={customActive}
          onClick={handleCustomSelected}
        >
          <BackgroundPreview style={customPreviewStyle(preference.customImageUrl)} />
          <BackgroundMeta>
            <BackgroundName>Custom Photo</BackgroundName>
            <BackgroundMood>{preference.customImageUrl ? 'your uploaded dashboard image' : 'upload your own image'}</BackgroundMood>
          </BackgroundMeta>
          <BackgroundCheck $active={customActive}><Check size={13} aria-hidden="true" /></BackgroundCheck>
        </BackgroundCard>

        <UploadPhotoButton type="button" onClick={() => fileInputRef.current?.click()}>
          <ImagePlus size={15} aria-hidden="true" />
          Upload photo
        </UploadPhotoButton>
      </BackgroundGrid>

      {customUploadError && <BackgroundError role="alert">{customUploadError}</BackgroundError>}

      <BackgroundGrid>
        {USER_DASHBOARD_BACKGROUNDS.map((background) => (
          <BackgroundCard
            key={background.id}
            type="button"
            $active={preference.selectedId === background.id}
            aria-pressed={preference.selectedId === background.id}
            onClick={() => onBackgroundSelect(background.id)}
          >
            <BackgroundPreview style={recipePreviewStyle(background)} />
            <BackgroundMeta>
              <BackgroundName>{background.name}</BackgroundName>
              <BackgroundMood>{background.mood}</BackgroundMood>
            </BackgroundMeta>
            <BackgroundCheck $active={preference.selectedId === background.id}>
              <Check size={13} aria-hidden="true" />
            </BackgroundCheck>
          </BackgroundCard>
        ))}
      </BackgroundGrid>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        style={{ display: 'none' }}
        aria-label="Upload custom dashboard background"
        onChange={handleFileChange}
      />
    </BackgroundStudioSection>
  );
};

export default React.memo(UserDashboardBackgroundControls);
