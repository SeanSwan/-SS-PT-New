/**
 * ┌─── SUB-COMPONENT: EditProfileSocialFields ─────────────────┐
 * │ PARENT: EditProfileModal                                     │
 * │ PURPOSE: Social link inputs (Instagram, Facebook, TikTok    │
 * │          + custom user-defined link)                          │
 * │ WIREFRAME:                                                   │
 * │ ┌──────────────────────────────────────────┐                 │
 * │ │ Social Links                             │                 │
 * │ │ [@] Instagram URL  ________________      │                 │
 * │ │ [f] Facebook URL   ________________      │                 │
 * │ │ [♪] TikTok URL     ________________      │                 │
 * │ │ [+] Custom Link                         │                 │
 * │ │     Label [________] URL [_________]     │                 │
 * │ └──────────────────────────────────────────┘                 │
 * │ Props: { socialLinks, onChange, onCustomChange }              │
 * │ CLICK-OUTCOMES:                                              │
 * │ [Input change] -> onChange(platform, value)                   │
 * │ [Custom input] -> onCustomChange(field, value)               │
 * └──────────────────────────────────────────────────────────────┘
 */
import React from 'react';
import styled from 'styled-components';
import { Instagram, Facebook, Link2, Plus } from 'lucide-react';
import {
  FormGroup,
  Label,
  Input,
  SectionHeading,
  RowGroup,
} from './EditProfileModalStyles';

// ─────────────────────────────────────────────────────────────
// SECTION: Types
// ─────────────────────────────────────────────────────────────

export interface CustomSocialLink {
  label: string;
  url: string;
}

export interface SocialLinks {
  instagram: string;
  facebook: string;
  tiktok: string;
  custom: CustomSocialLink;
}

interface EditProfileSocialFieldsProps {
  socialLinks: SocialLinks;
  onChange: (platform: keyof Omit<SocialLinks, 'custom'>, value: string) => void;
  onCustomChange: (field: keyof CustomSocialLink, value: string) => void;
}

// ─────────────────────────────────────────────────────────────
// SECTION: Styled Components
// ─────────────────────────────────────────────────────────────

const SocialInputWrapper = styled.div`
  position: relative;
`;

const SocialIcon = styled.span`
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-muted, rgba(224, 236, 244, 0.4));
  display: flex;
  align-items: center;
  font-size: 0.875rem;
  pointer-events: none;
`;

const SocialInput = styled(Input)`
  padding-left: 2.25rem;
`;

const CustomLinkSection = styled.div`
  margin-top: 0.5rem;
  padding: 0.75rem;
  background: var(--bg-surface, rgba(10, 10, 15, 0.5));
  border: 1px dashed var(--border-soft, rgba(96, 192, 240, 0.12));
  border-radius: 10px;
`;

const CustomLinkHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  color: var(--text-secondary, rgba(224, 236, 244, 0.6));
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
`;

// Simple SVG icon for TikTok (no Lucide equivalent)
const TikTokIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V8.87a8.16 8.16 0 003.76.92V6.35a4.82 4.82 0 01-3.76-.66z" />
  </svg>
);

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// ─────────────────────────────────────────────────────────────

const EditProfileSocialFields: React.FC<EditProfileSocialFieldsProps> = ({
  socialLinks,
  onChange,
  onCustomChange,
}) => {
  return (
    <>
      <SectionHeading>Social Links</SectionHeading>

      <FormGroup>
        <Label htmlFor="social-instagram">Instagram</Label>
        <SocialInputWrapper>
          <SocialIcon><Instagram size={14} /></SocialIcon>
          <SocialInput
            id="social-instagram"
            type="url"
            value={socialLinks.instagram}
            onChange={(e) => onChange('instagram', e.target.value)}
            placeholder="https://instagram.com/username"
          />
        </SocialInputWrapper>
      </FormGroup>

      <FormGroup>
        <Label htmlFor="social-facebook">Facebook</Label>
        <SocialInputWrapper>
          <SocialIcon><Facebook size={14} /></SocialIcon>
          <SocialInput
            id="social-facebook"
            type="url"
            value={socialLinks.facebook}
            onChange={(e) => onChange('facebook', e.target.value)}
            placeholder="https://facebook.com/username"
          />
        </SocialInputWrapper>
      </FormGroup>

      <FormGroup>
        <Label htmlFor="social-tiktok">TikTok</Label>
        <SocialInputWrapper>
          <SocialIcon><TikTokIcon /></SocialIcon>
          <SocialInput
            id="social-tiktok"
            type="url"
            value={socialLinks.tiktok}
            onChange={(e) => onChange('tiktok', e.target.value)}
            placeholder="https://tiktok.com/@username"
          />
        </SocialInputWrapper>
      </FormGroup>

      <FormGroup>
        <CustomLinkSection>
          <CustomLinkHeader>
            <Plus size={12} />
            Custom Link
          </CustomLinkHeader>
          <RowGroup>
            <FormGroup style={{ marginBottom: 0 }}>
              <Label htmlFor="social-custom-label">Label</Label>
              <SocialInputWrapper>
                <SocialIcon><Link2 size={14} /></SocialIcon>
                <SocialInput
                  id="social-custom-label"
                  type="text"
                  value={socialLinks.custom.label}
                  onChange={(e) => onCustomChange('label', e.target.value)}
                  placeholder="e.g. Twitter, YouTube, Website"
                />
              </SocialInputWrapper>
            </FormGroup>
            <FormGroup style={{ marginBottom: 0 }}>
              <Label htmlFor="social-custom-url">URL</Label>
              <Input
                id="social-custom-url"
                type="url"
                value={socialLinks.custom.url}
                onChange={(e) => onCustomChange('url', e.target.value)}
                placeholder="https://..."
              />
            </FormGroup>
          </RowGroup>
        </CustomLinkSection>
      </FormGroup>
    </>
  );
};

export default React.memo(EditProfileSocialFields);
