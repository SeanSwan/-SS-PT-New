/**
 * ============================================================================
 * FILE: MeasurementEntryFormPanel.tsx
 * PURPOSE: Measurement input, progress photo upload, and save controls.
 * ============================================================================
 *
 * WHAT THIS FILE DOES:
 * Renders the active biometrics entry form while the parent owns API state,
 * save behavior, and measurement history loading.
 *
 * HOW IT FITS IN THE APP:
 * MeasurementEntry passes the selected client, current draft values, and
 * handlers here to keep the active biometrics shell focused on orchestration.
 */

import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Copy, Save, UploadCloud, X } from 'lucide-react';
import GlowButton from '../../../ui/buttons/GlowButton';
import { itemVariants, measurementFields } from './MeasurementEntry.config';
import type { BodyMeasurement, Client } from './MeasurementEntry.types';
import {
  ChangeCenter,
  DarkPanel,
  FieldLabel,
  FlexStack,
  GlassPanel,
  HeaderRow,
  MeasurementGrid,
  PhotoGrid,
  SaveWrapper,
  SubsectionTitle,
} from './MeasurementEntry.baseStyles';
import {
  InputAdornmentSpan,
  InputWrapper,
  OutlinedButton,
  RemovePhotoButton,
  StyledInput,
  StyledLabel,
  TightSubsectionTitle,
  UploadZone,
} from './MeasurementEntry.formStyles';
import { PhotoPreviewWrapper } from './MeasurementEntry.modalStyles';

interface MeasurementEntryFormPanelProps {
  selectedClient: Client;
  latestMeasurement: BodyMeasurement | null;
  newMeasurement: Partial<BodyMeasurement>;
  savedPhotoUrls: string[];
  photoPreviews: string[];
  isSaving: boolean;
  onCopyLast: () => void;
  onInputChange: (field: keyof BodyMeasurement, value: string) => void;
  onPhotoChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onRemovePhoto: (index: number) => void;
  onRemoveSavedPhoto: (index: number) => void;
  onSave: () => void;
  renderChange: (field: keyof BodyMeasurement) => ReactNode;
}

const getMeasurementUnit = (
  field: keyof BodyMeasurement,
  measurement: Partial<BodyMeasurement>,
) => {
  if (field === 'weight') return measurement.weightUnit;
  if (field === 'bodyFatPercentage' || field === 'muscleMassPercentage') return '%';
  return measurement.circumferenceUnit;
};

const MeasurementEntryFormPanel = ({
  selectedClient,
  latestMeasurement,
  newMeasurement,
  savedPhotoUrls,
  photoPreviews,
  isSaving,
  onCopyLast,
  onInputChange,
  onPhotoChange,
  onRemovePhoto,
  onRemoveSavedPhoto,
  onSave,
  renderChange,
}: MeasurementEntryFormPanelProps) => (
  <motion.div variants={itemVariants}>
    <GlassPanel>
      <HeaderRow>
        <TightSubsectionTitle>
          New Measurements for {selectedClient.name}
        </TightSubsectionTitle>
        <OutlinedButton
          onClick={onCopyLast}
          disabled={!latestMeasurement}
        >
          <Copy size={16} />
          Copy from Last
        </OutlinedButton>
      </HeaderRow>

      <MeasurementGrid>
        {measurementFields.map(({ key, label }) => (
          <DarkPanel key={key}>
            <FieldLabel>{label}</FieldLabel>
            <FlexStack $gap={12} $field>
              <InputWrapper>
                <StyledLabel>Previous</StyledLabel>
                <StyledInput
                  type="text"
                  value={latestMeasurement?.[key] ?? 'N/A'}
                  disabled
                />
              </InputWrapper>

              <InputWrapper>
                <StyledLabel>New</StyledLabel>
                <StyledInput
                  type="number"
                  value={newMeasurement[key] ?? ''}
                  onChange={(event) => onInputChange(key, event.target.value)}
                  $hasAdornment
                />
                <InputAdornmentSpan>
                  {getMeasurementUnit(key, newMeasurement)}
                </InputAdornmentSpan>
              </InputWrapper>

              <ChangeCenter>{renderChange(key)}</ChangeCenter>
            </FlexStack>
          </DarkPanel>
        ))}
      </MeasurementGrid>
    </GlassPanel>

    <GlassPanel>
      <SubsectionTitle>Progress Photos</SubsectionTitle>
      <PhotoGrid>
        {savedPhotoUrls.map((url, index) => (
          <PhotoPreviewWrapper key={`saved-${index}`}>
            <img src={url} alt={`Saved ${index + 1}`} />
            <RemovePhotoButton onClick={() => onRemoveSavedPhoto(index)}>
              <X size={16} color="white" />
            </RemovePhotoButton>
          </PhotoPreviewWrapper>
        ))}
        {photoPreviews.map((previewUrl, index) => (
          <PhotoPreviewWrapper key={`new-${index}`}>
            <img src={previewUrl} alt={`Preview ${index + 1}`} />
            <RemovePhotoButton onClick={() => onRemovePhoto(index)}>
              <X size={16} color="white" />
            </RemovePhotoButton>
          </PhotoPreviewWrapper>
        ))}
        <UploadZone>
          <UploadCloud size={24} />
          Upload JPEG
          <input
            type="file"
            hidden
            multiple
            accept="image/jpeg,.jpg,.jpeg"
            onChange={onPhotoChange}
          />
        </UploadZone>
      </PhotoGrid>
    </GlassPanel>

    <SaveWrapper>
      <GlowButton
        text="Save Measurements"
        theme="emerald"
        leftIcon={<Save />}
        onClick={onSave}
        isLoading={isSaving}
      />
    </SaveWrapper>
  </motion.div>
);

export default MeasurementEntryFormPanel;
