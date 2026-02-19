import React from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { Lock, Sparkles, LogIn } from 'lucide-react';

interface MembersGateBannerProps {
  reason: 'login_required' | 'not_member' | 'premium_required';
}

const COPY_MAP = {
  login_required: {
    icon: LogIn,
    heading: 'Sign in to watch this video',
    body: 'Create a free account or log in to access the SwanStudios video library.',
    cta: 'Sign In',
    href: '/login',
  },
  not_member: {
    icon: Sparkles,
    heading: 'Become a member to unlock this content',
    body: 'Join SwanStudios and gain full access to our expert training library.',
    cta: 'View Plans',
    href: '/store',
  },
  premium_required: {
    icon: Lock,
    heading: 'Upgrade for premium content',
    body: 'This video is available with a premium membership. Upgrade your plan to continue watching.',
    cta: 'Upgrade',
    href: '/store',
  },
} as const;

/**
 * MembersGateBanner -- displayed over locked content to prompt
 * authentication or subscription upgrade. Galaxy-Swan themed.
 */
const MembersGateBanner: React.FC<MembersGateBannerProps> = ({ reason }) => {
  const navigate = useNavigate();
  const copy = COPY_MAP[reason];
  const Icon = copy.icon;

  return (
    <Banner>
      <GlowOrb aria-hidden />
      <IconCircle>
        <Icon size={28} />
      </IconCircle>
      <Heading>{copy.heading}</Heading>
      <Body>{copy.body}</Body>
      <CTAButton onClick={() => navigate(copy.href)}>
        {copy.cta}
      </CTAButton>
    </Banner>
  );
};

/* ========== Styled Components ========== */

const Banner = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 48px 24px;
  border-radius: 16px;
  overflow: hidden;
  background: linear-gradient(
    135deg,
    rgba(120, 81, 169, 0.3),
    rgba(59, 130, 246, 0.2)
  );
  border: 1px solid rgba(120, 81, 169, 0.3);

  @media (max-width: 430px) {
    padding: 32px 16px;
  }
`;

const GlowOrb = styled.div`
  position: absolute;
  width: 300px;
  height: 300px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(0, 255, 255, 0.08), transparent 70%);
  top: -100px;
  right: -80px;
  pointer-events: none;
`;

const IconCircle = styled.div`
  width: 64px;
  height: 64px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 255, 255, 0.1);
  border: 1px solid rgba(0, 255, 255, 0.3);
  color: #00ffff;
  margin-bottom: 20px;
`;

const Heading = styled.h3`
  font-size: clamp(18px, 3vw, 24px);
  font-weight: 700;
  color: rgba(255, 255, 255, 0.95);
  margin: 0 0 12px;
`;

const Body = styled.p`
  font-size: 15px;
  color: rgba(255, 255, 255, 0.6);
  line-height: 1.6;
  max-width: 440px;
  margin: 0 0 24px;
`;

const CTAButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 12px 32px;
  min-height: 48px;
  min-width: 160px;
  border: none;
  border-radius: 12px;
  background: linear-gradient(45deg, #3b82f6, #00ffff);
  color: #0a0a1a;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.25s;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0, 255, 255, 0.25);
  }

  &:active {
    transform: translateY(0);
  }
`;

export default MembersGateBanner;
