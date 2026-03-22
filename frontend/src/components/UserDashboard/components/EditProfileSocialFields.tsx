/**
 * ┌─── SUB-COMPONENT: EditProfileSocialFields ─────────────────┐
 * │ PARENT: EditProfileModal                                     │
 * │ PURPOSE: Social link inputs (Instagram, Twitter/X, TikTok)   │
 * │ WIREFRAME:                                                   │
 * │ ┌──────────────────────────────────────────┐                 │
 * │ │ Social Links                             │                 │
 * │ │ [@] Instagram URL  ________________      │                 │
 * │ │ [X] Twitter/X URL  ________________      │                 │
 * │ │ [♪] TikTok URL     ________________      │                 │
 * │ └──────────────────────────────────────────┘                 │
 * │ Props: { socialLinks, onChange }                              │
 * │ CLICK-OUTCOMES:                                              │
 * │ [Input change] -> onChange(platform, value)                   │
 * └──────────────────────────────────────────────────────────────┘
 */
import React from 'react';
import styled from 'styled-components';
import { Instagram } from 'lucide-react';
import {
  FormGroup,
  Label,
  Input,
  SectionHeading,
} from './EditProfileModalStyles';

// ─────────────────────────────────────────────────────────────
// SECTION: Types
// ─────────────────────────────────────────────────────────────

export interface SocialLinks {
  instagram: string;
  twitter: string;
  tiktok: string;
}

interface EditProfileSocialFieldsProps {
  socialLinks: SocialLinks;
  onChange: (platform: keyof SocialLinks, value: string) => void;
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
  color: rgba(224, 236, 244, 0.4);
  display: flex;
  align-items: center;
  font-size: 0.875rem;
  pointer-events: none;
`;

const SocialInput = styled(Input)`
  padding-left: 2.25rem;
`;

// Simple SVG icon components for platforms without Lucide icons
const XIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

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
        <Label htmlFor="social-twitter">Twitter / X</Label>
        <SocialInputWrapper>
          <SocialIcon><XIcon /></SocialIcon>
          <SocialInput
            id="social-twitter"
            type="url"
            value={socialLinks.twitter}
            onChange={(e) => onChange('twitter', e.target.value)}
            placeholder="https://x.com/username"
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
    </>
  );
};

export default React.memo(EditProfileSocialFields);
