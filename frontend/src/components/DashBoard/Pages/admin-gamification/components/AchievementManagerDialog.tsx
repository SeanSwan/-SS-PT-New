/**
 * Create/edit dialog for achievement definitions.
 */
import React from 'react';
import { Image, Star } from 'lucide-react';
import { logger } from '@/utils/logger';
import { achievementIconOptions, achievementTiers, requirementTypes } from './AchievementManager.data';
import {
  BadgePreview,
  DialogActionsBar,
  DialogContentArea,
  DialogOverlay,
  DialogPanel,
  DialogTitleBar,
  DialogTitleText,
  FieldLabel,
  FileUploadButton,
  FormField,
  FormFieldFull,
  FormGrid,
  FormInput,
  FormInputWithIcon,
  FormSelect,
  FormTextarea,
  HiddenFileInput,
  SectionTitle,
  StyledDivider,
} from './AchievementManagerDialog.styles';
import {
  HiddenCheckbox,
  PrimaryButton,
  SecondaryButton,
  SwitchLabel,
  SwitchThumb,
  SwitchTrack,
} from './AchievementManagerControls.styles';
import type { Achievement, AchievementDraft, AchievementTier } from './AchievementManager.types';

interface AchievementManagerDialogProps {
  open: boolean;
  editingAchievement: Achievement | null;
  draftAchievement: AchievementDraft;
  onDraftChange: (achievement: AchievementDraft) => void;
  onClose: () => void;
  onSave: () => void;
}

export const AchievementManagerDialog: React.FC<AchievementManagerDialogProps> = ({
  open,
  editingAchievement,
  draftAchievement,
  onDraftChange,
  onClose,
  onSave,
}) => {
  const updateDraft = (patch: Partial<AchievementDraft>) => onDraftChange({ ...draftAchievement, ...patch });

  return (
    <DialogOverlay $open={open} onClick={onClose}>
      <DialogPanel onClick={event => event.stopPropagation()}>
        <DialogTitleBar>
          <DialogTitleText>
            {editingAchievement ? 'Edit Achievement' : 'Create New Achievement'}
          </DialogTitleText>
        </DialogTitleBar>
        <DialogContentArea>
          <FormGrid>
            <FormFieldFull>
              <FormField>
                <FieldLabel htmlFor="achievement-name">Achievement Name</FieldLabel>
                <FormInput
                  id="achievement-name"
                  value={draftAchievement.name}
                  onChange={event => updateDraft({ name: event.target.value })}
                  placeholder="Achievement Name"
                  required
                />
              </FormField>
            </FormFieldFull>

            <FormFieldFull>
              <FormField>
                <FieldLabel htmlFor="achievement-description">Description</FieldLabel>
                <FormTextarea
                  id="achievement-description"
                  value={draftAchievement.description}
                  onChange={event => updateDraft({ description: event.target.value })}
                  placeholder="Description"
                  rows={3}
                  required
                />
              </FormField>
            </FormFieldFull>

            <FormField>
              <FieldLabel htmlFor="achievement-icon">Icon</FieldLabel>
              <FormSelect
                id="achievement-icon"
                value={draftAchievement.icon}
                onChange={event => updateDraft({ icon: event.target.value })}
              >
                {achievementIconOptions.map(icon => (
                  <option key={icon.name} value={icon.name}>
                    {icon.name}
                  </option>
                ))}
              </FormSelect>
            </FormField>

            <FormField>
              <FieldLabel htmlFor="achievement-tier">Tier</FieldLabel>
              <FormSelect
                id="achievement-tier"
                value={draftAchievement.tier}
                onChange={event => updateDraft({ tier: event.target.value as AchievementTier })}
              >
                {achievementTiers.map(tier => (
                  <option key={tier.value} value={tier.value}>
                    {tier.label}
                  </option>
                ))}
              </FormSelect>
            </FormField>

            <FormField>
              <FieldLabel htmlFor="achievement-points">Point Value</FieldLabel>
              <FormInputWithIcon>
                <Star size={16} color="var(--achievement-star, #FFC107)" />
                <input
                  id="achievement-points"
                  type="number"
                  value={draftAchievement.pointValue}
                  onChange={event => updateDraft({ pointValue: parseInt(event.target.value) || 0 })}
                  required
                />
              </FormInputWithIcon>
            </FormField>

            <FormField>
              <FieldLabel>&nbsp;</FieldLabel>
              <SwitchLabel>
                <HiddenCheckbox
                  checked={draftAchievement.isActive}
                  onChange={event => updateDraft({ isActive: event.target.checked })}
                />
                <SwitchTrack $checked={draftAchievement.isActive}>
                  <SwitchThumb $checked={draftAchievement.isActive} />
                </SwitchTrack>
                Active
              </SwitchLabel>
            </FormField>

            <FormFieldFull>
              <StyledDivider />
              <SectionTitle>Achievement Requirements</SectionTitle>
            </FormFieldFull>

            <FormField>
              <FieldLabel htmlFor="achievement-requirement-type">Requirement Type</FieldLabel>
              <FormSelect
                id="achievement-requirement-type"
                value={draftAchievement.requirementType}
                onChange={event => updateDraft({ requirementType: event.target.value })}
              >
                {requirementTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </FormSelect>
            </FormField>

            <FormField>
              <FieldLabel htmlFor="achievement-requirement-value">Requirement Value</FieldLabel>
              <FormInput
                id="achievement-requirement-value"
                type="number"
                value={draftAchievement.requirementValue}
                onChange={event => updateDraft({ requirementValue: parseInt(event.target.value) || 0 })}
                required
              />
            </FormField>

            <FormFieldFull>
              <StyledDivider />
              <SectionTitle>Badge Image (Optional)</SectionTitle>
            </FormFieldFull>

            <FormFieldFull>
              <FileUploadButton>
                <Image size={18} />
                Upload Badge Image
                <HiddenFileInput
                  type="file"
                  accept="image/*"
                  onChange={() => {
                    logger.log('Badge image selected for achievement upload placeholder');
                  }}
                />
              </FileUploadButton>
              {draftAchievement.badgeImageUrl && (
                <BadgePreview>
                  <img src={draftAchievement.badgeImageUrl} alt="Badge" />
                </BadgePreview>
              )}
            </FormFieldFull>
          </FormGrid>
        </DialogContentArea>
        <DialogActionsBar>
          <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
          <PrimaryButton onClick={onSave} disabled={!draftAchievement.name || !draftAchievement.description}>
            {editingAchievement ? 'Update' : 'Create'}
          </PrimaryButton>
        </DialogActionsBar>
      </DialogPanel>
    </DialogOverlay>
  );
};
