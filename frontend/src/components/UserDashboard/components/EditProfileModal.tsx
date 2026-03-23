/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  COMPONENT: EditProfileModal                                  ║
 * ║  PURPOSE: Full-featured profile edit dialog with all fields   ║
 * ║  OWNER: Claude Opus 4.6                                       ║
 * ║  LAST VALIDATED: 2026-03-22                                   ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * WIREFRAME:
 * ┌──────────────────────────────────────────────────────────┐
 * │  Edit Profile                                       [X] │
 * │  ─────────────── Basic Info ──────────────────────────── │
 * │  First Name  [_______________]  Last Name [___________]  │
 * │  Bio         [___________________________________]       │
 * │  ─────────── Location & Goals ────────────────────────── │
 * │  City [___________]  State [___________]                 │
 * │  Fitness Goals [________________________________]        │
 * │  Phone [_______________]                                 │
 * │  ─────────── Social Links ────────────────────────────── │
 * │  [@] Instagram  [_______________]                        │
 * │  [f] Facebook   [_______________]                        │
 * │  [+] Custom: Label [____] URL [____]                    │
 * │  [♪] TikTok     [_______________]                        │
 * │  ─────────── Chart Visibility ────────────────────────── │
 * │  [x] Weight Progression  [x] Workout Heatmap            │
 * │  [x] Muscle Group Radar  [x] Goal Progress              │
 * │  [ ] Body Fat Trend      [ ] Strength 1RM               │
 * │  [ ] Calorie Burn        [ ] Session Frequency           │
 * │  ────────────────────────────────────────────────────────│
 * │              [ Save Changes ]                            │
 * └──────────────────────────────────────────────────────────┘
 *
 * MERMAID ARCHITECTURE:
 * graph TD
 *   A[EditProfileModal] --> B[EditProfileSocialFields]
 *   A --> C[EditProfileChartToggles]
 *   A --> C2[EditProfileTransformationSettings]
 *   A --> D[useEditProfileForm hook]
 *   A --> E[EditProfileModalStyles]
 *
 * CLICK-OUTCOME FLOWCHART:
 * [X] / Escape / Overlay -> onClose() -> returns focus to trigger
 * [Input change] -> setField(key, value) -> local state
 * [Social link change] -> setSocialLink(platform, value) -> local state
 * [Chart toggle] -> toggleChart(chartKey) -> flips boolean
 * [Save Changes] -> handleSubmit() -> onSave(data) -> PUT /api/profile
 *
 * DATA FLOW:
 * Props In:  { profile, onClose, onSave }
 * State:     useEditProfileForm hook (all fields + isSaving)
 * API Calls: onSave triggers PUT /api/profile in parent
 * Children:  EditProfileSocialFields, EditProfileChartToggles
 */
import React, { useEffect, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import { X, Save } from 'lucide-react';
import { useEditProfileForm } from '../hooks/useEditProfileForm';
import EditProfileSocialFields from './EditProfileSocialFields';
import EditProfileChartToggles from './EditProfileChartToggles';
import EditProfileTransformationSettings from './EditProfileTransformationSettings';
import {
  Overlay,
  ModalContainer,
  Header,
  Title,
  CloseButton,
  FormGroup,
  Label,
  Input,
  TextArea,
  CharCount,
  RowGroup,
  SectionHeading,
  SaveButton,
} from './EditProfileModalStyles';

// ─────────────────────────────────────────────────────────────
// SECTION: Types
// ─────────────────────────────────────────────────────────────

interface EditProfileModalProps {
  profile: Record<string, unknown> | null;
  onClose: () => void;
  onSave: (data: Record<string, unknown>) => Promise<void>;
}

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// PURPOSE: Orchestrates form sections with a11y focus management
// WHY: role="dialog" + aria-modal per CLAUDE.md, Escape to close,
//      focus returns to trigger on unmount
// ─────────────────────────────────────────────────────────────

const EditProfileModal: React.FC<EditProfileModalProps> = ({
  profile,
  onClose,
  onSave,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const {
    form,
    isSaving,
    setField,
    setSocialLink,
    setCustomLink,
    toggleChart,
    setTransformationSetting,
    handleSubmit,
  } = useEditProfileForm(profile, onSave);

  // Focus management: capture on mount, restore on unmount
  useEffect(() => {
    previousFocusRef.current = document.activeElement as HTMLElement;
    dialogRef.current?.focus();
    return () => {
      previousFocusRef.current?.focus();
    };
  }, []);

  // Escape key closes the modal
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  // Prevent background scroll
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  return (
    <AnimatePresence>
      <Overlay
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <ModalContainer
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label="Edit profile"
          tabIndex={-1}
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          onClick={(e) => e.stopPropagation()}
        >
          <Header>
            <Title>Edit Profile</Title>
            <CloseButton onClick={onClose} aria-label="Close">
              <X size={18} />
            </CloseButton>
          </Header>

          <form onSubmit={handleSubmit}>
            {/* ── Basic Info ── */}
            <SectionHeading>Basic Info</SectionHeading>
            <RowGroup>
              <FormGroup>
                <Label htmlFor="edit-firstName">First Name</Label>
                <Input
                  id="edit-firstName"
                  value={form.firstName}
                  onChange={(e) => setField('firstName', e.target.value)}
                  placeholder="First name"
                />
              </FormGroup>
              <FormGroup>
                <Label htmlFor="edit-lastName">Last Name</Label>
                <Input
                  id="edit-lastName"
                  value={form.lastName}
                  onChange={(e) => setField('lastName', e.target.value)}
                  placeholder="Last name"
                />
              </FormGroup>
            </RowGroup>

            <FormGroup>
              <Label htmlFor="edit-bio">Bio</Label>
              <TextArea
                id="edit-bio"
                value={form.bio}
                onChange={(e) => setField('bio', e.target.value)}
                placeholder="Tell the community about yourself..."
                maxLength={280}
                rows={3}
              />
              <CharCount $near={form.bio.length > 240}>
                {form.bio.length}/280
              </CharCount>
            </FormGroup>

            {/* ── Location & Goals ── */}
            <SectionHeading>Location &amp; Goals</SectionHeading>
            <RowGroup>
              <FormGroup>
                <Label htmlFor="edit-city">City</Label>
                <Input
                  id="edit-city"
                  value={form.city}
                  onChange={(e) => setField('city', e.target.value)}
                  placeholder="City"
                />
              </FormGroup>
              <FormGroup>
                <Label htmlFor="edit-state">State</Label>
                <Input
                  id="edit-state"
                  value={form.state}
                  onChange={(e) => setField('state', e.target.value)}
                  placeholder="State"
                />
              </FormGroup>
            </RowGroup>

            <FormGroup>
              <Label htmlFor="edit-goals">Fitness Goals</Label>
              <TextArea
                id="edit-goals"
                value={form.fitnessGoals}
                onChange={(e) => setField('fitnessGoals', e.target.value)}
                placeholder="What are you working toward? e.g., Build muscle, improve golf swing..."
                maxLength={500}
                rows={3}
              />
              <CharCount $near={form.fitnessGoals.length > 420}>
                {form.fitnessGoals.length}/500
              </CharCount>
            </FormGroup>

            <FormGroup>
              <Label htmlFor="edit-phone">Phone</Label>
              <Input
                id="edit-phone"
                type="tel"
                value={form.phone}
                onChange={(e) => setField('phone', e.target.value)}
                placeholder="(555) 123-4567"
              />
            </FormGroup>

            {/* ── Social Links (sub-component) ── */}
            <EditProfileSocialFields
              socialLinks={form.socialLinks}
              onChange={setSocialLink}
              onCustomChange={setCustomLink}
            />

            {/* ── Chart Visibility (sub-component) ── */}
            <EditProfileChartToggles
              chartVisibility={form.chartVisibility}
              onToggle={toggleChart}
            />

            {/* ── Transformation Photo Settings (sub-component) ── */}
            <EditProfileTransformationSettings
              settings={form.transformationSettings}
              onChange={setTransformationSetting}
            />

            {/* ── Submit ── */}
            <SaveButton
              type="submit"
              disabled={isSaving}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Save size={18} />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </SaveButton>
          </form>
        </ModalContainer>
      </Overlay>
    </AnimatePresence>
  );
};

export default EditProfileModal;
