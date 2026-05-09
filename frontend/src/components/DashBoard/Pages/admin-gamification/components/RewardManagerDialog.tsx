/**
 * SUB-COMPONENT: RewardManagerDialog
 * PARENT: RewardManager
 * PURPOSE: Edits reward draft fields before parent-owned create/update persistence.
 * WIREFRAME: [title] [name/description] [icon/tier/cost/stock] [active/date/image] [cancel/save]
 * Props: { open, editingReward, draftReward, onDraftChange, onClose, onSave }
 * CLICK-OUTCOMES:
 * Field edits -> update parent-owned draft.
 * Upload placeholder -> records generic placeholder event only.
 * Cancel -> closes without saving.
 * Create/Update -> delegates persistence to parent callback.
 * GAMIFICATION: Admin economy configuration only; no member XP is awarded here.
 */
import React from 'react';
import { Image, Star } from 'lucide-react';
import { logger } from '@/utils/logger';
import { rewardIconOptions, rewardTiers } from './RewardManager.data';
import {
  DialogBody,
  DialogFooter,
  DialogOverlay,
  DialogPanel,
  DialogTitleBar,
  Divider,
  FieldInput,
  FieldInputWithIcon,
  FieldLabel,
  FieldSelect,
  FieldTextarea,
  FormFieldFull,
  FormGrid,
  HiddenFileInput,
  ImagePreview,
  InputIconLeft,
  InputWithPadding,
  SectionLabel,
  UploadButton,
} from './RewardManagerDialog.styles';
import {
  GhostButton,
  HiddenCheckbox,
  PrimaryButton,
  SwitchContainer,
  SwitchThumb,
  SwitchTrack,
} from './RewardManagerControls.styles';
import type { Reward, RewardDraft, RewardTier } from './RewardManager.types';

interface RewardManagerDialogProps {
  open: boolean;
  editingReward: Reward | null;
  draftReward: RewardDraft;
  onDraftChange: (reward: RewardDraft) => void;
  onClose: () => void;
  onSave: () => void;
}

const formatDateInputValue = (value?: string) => {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().split('T')[0];
};

export const RewardManagerDialog: React.FC<RewardManagerDialogProps> = ({
  open,
  editingReward,
  draftReward,
  onDraftChange,
  onClose,
  onSave,
}) => {
  const updateDraft = (patch: Partial<RewardDraft>) => onDraftChange({ ...draftReward, ...patch });

  return (
    <DialogOverlay $open={open} onClick={onClose}>
      <DialogPanel $maxWidth="720px" onClick={event => event.stopPropagation()}>
        <DialogTitleBar>{editingReward ? 'Edit Reward' : 'Create New Reward'}</DialogTitleBar>
        <DialogBody>
          <FormGrid>
            <FormFieldFull>
              <FieldLabel htmlFor="reward-name">Reward Name *</FieldLabel>
              <FieldInput
                id="reward-name"
                value={draftReward.name}
                onChange={event => updateDraft({ name: event.target.value })}
                placeholder="Enter reward name"
              />
            </FormFieldFull>

            <FormFieldFull>
              <FieldLabel htmlFor="reward-description">Description *</FieldLabel>
              <FieldTextarea
                id="reward-description"
                value={draftReward.description}
                onChange={event => updateDraft({ description: event.target.value })}
                placeholder="Enter reward description"
                rows={3}
              />
            </FormFieldFull>

            <div>
              <FieldLabel htmlFor="reward-icon">Icon</FieldLabel>
              <FieldSelect id="reward-icon" value={draftReward.icon} onChange={event => updateDraft({ icon: event.target.value })}>
                {rewardIconOptions.map(icon => (
                  <option key={icon.name} value={icon.name}>
                    {icon.name}
                  </option>
                ))}
              </FieldSelect>
            </div>

            <div>
              <FieldLabel htmlFor="reward-tier">Tier</FieldLabel>
              <FieldSelect
                id="reward-tier"
                value={draftReward.tier}
                onChange={event => updateDraft({ tier: event.target.value as RewardTier })}
              >
                {rewardTiers.map(tier => (
                  <option key={tier.value} value={tier.value}>
                    {tier.label}
                  </option>
                ))}
              </FieldSelect>
            </div>

            <div>
              <FieldLabel htmlFor="reward-point-cost">Point Cost *</FieldLabel>
              <FieldInputWithIcon>
                <InputIconLeft>
                  <Star size={16} color="var(--reward-star, #FFC107)" />
                </InputIconLeft>
                <InputWithPadding
                  id="reward-point-cost"
                  type="number"
                  value={draftReward.pointCost}
                  onChange={event => updateDraft({ pointCost: parseInt(event.target.value) || 0 })}
                />
              </FieldInputWithIcon>
            </div>

            <div>
              <FieldLabel htmlFor="reward-stock">Stock *</FieldLabel>
              <FieldInput
                id="reward-stock"
                type="number"
                value={draftReward.stock}
                onChange={event => updateDraft({ stock: parseInt(event.target.value) || 0 })}
              />
            </div>

            <div>
              <FieldLabel>&nbsp;</FieldLabel>
              <SwitchContainer>
                <HiddenCheckbox checked={draftReward.isActive} onChange={event => updateDraft({ isActive: event.target.checked })} />
                <SwitchTrack $checked={draftReward.isActive}>
                  <SwitchThumb $checked={draftReward.isActive} />
                </SwitchTrack>
                Active
              </SwitchContainer>
            </div>

            <div>
              <FieldLabel htmlFor="reward-expiration">Expiration Date (Optional)</FieldLabel>
              <FieldInput
                id="reward-expiration"
                type="date"
                value={formatDateInputValue(draftReward.expiresAt)}
                onChange={event => updateDraft({ expiresAt: event.target.value ? new Date(event.target.value).toISOString() : undefined })}
              />
            </div>

            <FormFieldFull>
              <Divider />
              <SectionLabel>Reward Image (Optional)</SectionLabel>
            </FormFieldFull>

            <FormFieldFull>
              <UploadButton>
                <Image size={18} />
                Upload Reward Image
                <HiddenFileInput
                  type="file"
                  accept="image/*"
                  onChange={() => {
                    logger.log('Reward image selected for upload placeholder');
                  }}
                />
              </UploadButton>
              {draftReward.imageUrl && (
                <ImagePreview>
                  <img src={draftReward.imageUrl} alt="Reward" />
                </ImagePreview>
              )}
            </FormFieldFull>
          </FormGrid>
        </DialogBody>
        <DialogFooter>
          <GhostButton onClick={onClose}>Cancel</GhostButton>
          <PrimaryButton onClick={onSave} disabled={!draftReward.name || !draftReward.description}>
            {editingReward ? 'Update' : 'Create'}
          </PrimaryButton>
        </DialogFooter>
      </DialogPanel>
    </DialogOverlay>
  );
};
