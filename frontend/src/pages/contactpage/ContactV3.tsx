import React, { useState } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { MapPin, Mail, Phone, Clock, Facebook, Instagram, Youtube, ChevronDown, CheckCircle, AlertCircle, X } from 'lucide-react';
import ScrollReveal from '../../components/ui-kit/cinematic/ScrollReveal';
import TypewriterText from '../../components/ui-kit/cinematic/TypewriterText';
import ParallaxHero from '../../components/ui-kit/cinematic/ParallaxHero';
import SectionDivider from '../../components/ui-kit/cinematic/SectionDivider';
import logoImg from '../../assets/Logo.png';

/* ================================================================
 * ContactV3 — Cinematic Upgrade of ContactV2
 * ================================================================
 * Enhancements over V2:
 *  1. ParallaxHero uses imageSrc for contact hero background
 *  2. Fixed noise overlay (inline SVG, opacity 0.04)
 *  3. Extended breakpoints: 2560px, 3840px, and 320px
 *  4. Enhanced glassmorphism with cyan glow on input focus
 *  5. Enhanced FAQ accordion with glass panels & smoother animation
 *  6. Main content sits above noise via position: relative; z-index: 2
 *
 * All existing functionality (form submission, FAQ, social links,
 * toast notifications) remains identical to V2.
 * ================================================================ */

// --------------- Animations ---------------

const reducedMotion = css`
  @media (prefers-reduced-motion: reduce) {
    animation: none !important;
    transition: none !important;
  }
`;

const shimmer = keyframes`
  0%   { background-position: -200% center; }
  100% { background-position:  200% center; }
`;

const slideUp = keyframes`
  from { transform: translateY(12px); opacity: 0; }
  to   { transform: translateY(0);    opacity: 1; }
`;

const pulseGlow = keyframes`
  0%, 100% { box-shadow: 0 0 0 2px rgba(0, 255, 255, 0.2), 0 0 15px rgba(0, 255, 255, 0.05); }
  50%      { box-shadow: 0 0 0 2px rgba(0, 255, 255, 0.35), 0 0 25px rgba(0, 255, 255, 0.1); }
`;

// --------------- Noise Overlay ---------------

const NoiseOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0.04;
  pointer-events: none;
  z-index: 1;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
  background-repeat: repeat;
  background-size: 256px 256px;
`;

// --------------- Layout ---------------

const PageWrapper = styled.div`
  min-height: 100vh;
  width: 100%;
  background: ${({ theme }) => theme.background.primary};
  color: ${({ theme }) => theme.text.primary};
  font-family: ${({ theme }) => theme.fonts.ui};
  overflow-x: hidden;
  position: relative;
`;

const ContentLayer = styled.div`
  position: relative;
  z-index: 2;
`;

const Section = styled.section`
  max-width: 1200px;
  width: 90%;
  margin: 0 auto;
  padding: 4rem 0;
  position: relative;
  z-index: 2;

  @media (max-width: 768px) {
    width: 94%;
    padding: 3rem 0;
  }
  @media (max-width: 430px) {
    width: 96%;
    padding: 2rem 0;
  }
  @media (max-width: 320px) {
    width: 98%;
    padding: 1.5rem 0;
  }
  @media (min-width: 1920px) {
    max-width: 1400px;
  }
  @media (min-width: 2560px) {
    max-width: 1600px;
    padding: 5rem 0;
  }
  @media (min-width: 3840px) {
    max-width: 2200px;
    padding: 6rem 0;
  }
`;

// --------------- Hero ---------------

const HeroLogo = styled.img`
  width: 110px;
  height: 110px;
  object-fit: contain;
  margin-bottom: 1.5rem;
  filter: drop-shadow(0 0 20px ${({ theme }) =>
    theme.effects.glowIntensity !== 'none'
      ? `${theme.colors.primary}40`
      : 'transparent'});
  animation: heroFloat 4s ease-in-out infinite;

  @keyframes heroFloat {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-8px); }
  }

  @media (min-width: 2560px) {
    width: 140px;
    height: 140px;
  }
  @media (min-width: 3840px) {
    width: 180px;
    height: 180px;
  }
`;

const HeroTitle = styled(TypewriterText)`
  font-family: ${({ theme }) => theme.fonts.drama};
  font-size: clamp(2.4rem, 6vw, 4rem);
  font-weight: 300;
  letter-spacing: 2px;
  background: ${({ theme }) => theme.gradients.primary};
  background-size: 200% auto;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  color: transparent;
  animation: ${shimmer} 6s linear infinite;
  ${reducedMotion}

  @media (min-width: 2560px) {
    font-size: 4.5rem;
  }
  @media (min-width: 3840px) {
    font-size: 6rem;
  }
  @media (max-width: 320px) {
    font-size: 1.8rem;
    letter-spacing: 1px;
  }
`;

const HeroSubtitle = styled.p`
  font-size: clamp(1rem, 2vw, 1.25rem);
  color: ${({ theme }) => theme.text.secondary};
  margin-top: 1rem;
  max-width: 600px;
  line-height: 1.7;
  text-align: center;

  @media (min-width: 2560px) {
    font-size: 1.4rem;
    max-width: 750px;
  }
  @media (min-width: 3840px) {
    font-size: 1.75rem;
    max-width: 900px;
  }
  @media (max-width: 320px) {
    font-size: 0.9rem;
    line-height: 1.5;
  }
`;

// --------------- Two-column grid ---------------

const ContactGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2.5rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 2rem;
  }
  @media (max-width: 320px) {
    gap: 1.5rem;
  }
  @media (min-width: 2560px) {
    gap: 3.5rem;
  }
  @media (min-width: 3840px) {
    gap: 4.5rem;
  }
`;

// --------------- Form ---------------

const FormCard = styled.div`
  background: ${({ theme }) => theme.background.surface};
  border: ${({ theme }) => theme.borders.card};
  border-radius: 20px;
  padding: 2.5rem;
  box-shadow: ${({ theme }) => theme.shadows.elevation};
  ${({ theme }) => theme.effects.glassmorphism && css`
    backdrop-filter: blur(16px);
  `}

  @media (max-width: 430px) {
    padding: 1.5rem 1rem;
    border-radius: 14px;
  }
  @media (max-width: 320px) {
    padding: 1.25rem 0.75rem;
    border-radius: 12px;
  }
  @media (min-width: 2560px) {
    padding: 3rem;
    border-radius: 24px;
  }
  @media (min-width: 3840px) {
    padding: 4rem;
    border-radius: 28px;
  }
`;

const FormTitle = styled.h2`
  font-family: ${({ theme }) => theme.fonts.heading};
  font-size: 1.75rem;
  font-weight: 400;
  color: ${({ theme }) => theme.text.heading};
  margin: 0 0 2rem;
  position: relative;

  &::after {
    content: '';
    position: absolute;
    bottom: -8px;
    left: 0;
    width: 60px;
    height: 2px;
    background: ${({ theme }) => theme.gradients.primary};
  }

  @media (min-width: 2560px) {
    font-size: 2.1rem;
  }
  @media (min-width: 3840px) {
    font-size: 2.5rem;
  }
  @media (max-width: 320px) {
    font-size: 1.4rem;
  }
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1.75rem;

  @media (max-width: 320px) {
    gap: 1.25rem;
  }
`;

const InputGroup = styled.div`
  position: relative;
`;

const FloatingLabel = styled.label`
  position: absolute;
  left: 16px;
  top: 16px;
  font-size: 0.95rem;
  color: ${({ theme }) => theme.text.muted};
  pointer-events: none;
  transition: all 0.25s ease;
`;

const inputShared = css`
  width: 100%;
  background: ${({ theme }) => theme.background.elevated};
  border: ${({ theme }) => theme.borders.subtle};
  border-radius: 10px;
  color: ${({ theme }) => theme.text.primary};
  font-family: ${({ theme }) => theme.fonts.ui};
  font-size: 1rem;
  padding: 18px 16px 8px;
  min-height: 54px;
  transition: border-color 0.3s ease, box-shadow 0.3s ease;

  &:focus {
    outline: none;
    border: ${({ theme }) => theme.borders.focus};
    box-shadow: 0 0 0 2px rgba(0, 255, 255, 0.2), 0 0 20px rgba(0, 255, 255, 0.08);
    animation: ${pulseGlow} 2s ease-in-out infinite;
    ${reducedMotion}
  }

  &::placeholder {
    color: transparent;
  }

  &:focus + ${FloatingLabel},
  &:not(:placeholder-shown) + ${FloatingLabel} {
    top: 4px;
    font-size: 0.7rem;
    color: ${({ theme }) => theme.text.accent};
  }

  @media (max-width: 430px) {
    font-size: 16px;
  }
  @media (max-width: 320px) {
    min-height: 48px;
    padding: 16px 12px 6px;
    font-size: 16px;
  }
  @media (min-width: 2560px) {
    font-size: 1.1rem;
    min-height: 60px;
    padding: 20px 18px 10px;
  }
  @media (min-width: 3840px) {
    font-size: 1.25rem;
    min-height: 68px;
    padding: 22px 20px 12px;
    border-radius: 14px;
  }
`;

const StyledInput = styled.input`
  ${inputShared}
`;

const StyledTextarea = styled.textarea`
  ${inputShared}
  min-height: 130px;
  resize: vertical;

  @media (min-width: 2560px) {
    min-height: 160px;
  }
  @media (min-width: 3840px) {
    min-height: 200px;
  }
`;

const SubmitButton = styled.button`
  min-height: 52px;
  min-width: 44px;
  border: none;
  border-radius: 12px;
  background: ${({ theme }) => theme.gradients.primary};
  color: ${({ theme }) => theme.text.primary};
  font-family: ${({ theme }) => theme.fonts.heading};
  font-size: 1.05rem;
  font-weight: 600;
  letter-spacing: 1px;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.3s ease;
  box-shadow: ${({ theme }) => theme.shadows.primary};

  &:hover {
    transform: translateY(-2px);
    box-shadow: ${({ theme }) => theme.shadows.elevation};
  }

  &:active {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }

  @media (max-width: 320px) {
    min-height: 48px;
    font-size: 0.95rem;
  }
  @media (min-width: 2560px) {
    min-height: 58px;
    font-size: 1.15rem;
    border-radius: 14px;
  }
  @media (min-width: 3840px) {
    min-height: 66px;
    font-size: 1.3rem;
    border-radius: 16px;
  }
`;

// --------------- Info Cards ---------------

const InfoStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.25rem;

  @media (max-width: 320px) {
    gap: 1rem;
  }
  @media (min-width: 2560px) {
    gap: 1.5rem;
  }
  @media (min-width: 3840px) {
    gap: 2rem;
  }
`;

const InfoCard = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  background: ${({ theme }) => theme.background.surface};
  border: ${({ theme }) => theme.borders.card};
  border-radius: 16px;
  padding: 1.5rem;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  box-shadow: ${({ theme }) => theme.shadows.glass};
  ${({ theme }) => theme.effects.glassmorphism && css`
    backdrop-filter: blur(12px);
  `}

  &:hover {
    transform: translateY(-4px);
    box-shadow: ${({ theme }) => theme.shadows.elevation};
  }

  @media (max-width: 430px) {
    padding: 1.1rem;
    border-radius: 12px;
  }
  @media (max-width: 320px) {
    padding: 0.9rem;
    gap: 0.75rem;
    border-radius: 10px;
  }
  @media (min-width: 2560px) {
    padding: 1.75rem;
    border-radius: 18px;
  }
  @media (min-width: 3840px) {
    padding: 2.25rem;
    border-radius: 22px;
    gap: 1.5rem;
  }
`;

const IconCircle = styled.div`
  flex-shrink: 0;
  width: 48px;
  height: 48px;
  min-width: 44px;
  min-height: 44px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ theme }) => theme.gradients.glass};
  color: ${({ theme }) => theme.colors.primary};
  border: ${({ theme }) => theme.borders.elegant};

  @media (min-width: 2560px) {
    width: 56px;
    height: 56px;
  }
  @media (min-width: 3840px) {
    width: 64px;
    height: 64px;
  }
`;

const InfoContent = styled.div`
  display: flex;
  flex-direction: column;
`;

const InfoLabel = styled.span`
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: ${({ theme }) => theme.text.muted};
  margin-bottom: 4px;

  @media (min-width: 2560px) {
    font-size: 0.9rem;
  }
  @media (min-width: 3840px) {
    font-size: 1rem;
  }
  @media (max-width: 320px) {
    font-size: 0.7rem;
  }
`;

const InfoValue = styled.span`
  font-size: 1.05rem;
  color: ${({ theme }) => theme.text.primary};
  line-height: 1.5;

  a {
    color: ${({ theme }) => theme.text.accent};
    text-decoration: none;
    transition: color 0.2s ease;

    &:hover {
      color: ${({ theme }) => theme.colors.primary};
      text-decoration: underline;
    }
  }

  @media (min-width: 2560px) {
    font-size: 1.15rem;
  }
  @media (min-width: 3840px) {
    font-size: 1.3rem;
  }
  @media (max-width: 320px) {
    font-size: 0.95rem;
  }
`;

// --------------- FAQ ---------------

const FAQGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
  @media (max-width: 320px) {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
  @media (min-width: 2560px) {
    grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
    gap: 2rem;
  }
  @media (min-width: 3840px) {
    grid-template-columns: repeat(auto-fit, minmax(480px, 1fr));
    gap: 2.5rem;
  }
`;

const FAQCard = styled.div`
  background: ${({ theme }) => theme.background.surface};
  border: ${({ theme }) => theme.borders.card};
  border-radius: 16px;
  overflow: hidden;
  transition: box-shadow 0.3s ease, transform 0.3s ease, border-color 0.3s ease;
  ${({ theme }) => theme.effects.glassmorphism && css`
    backdrop-filter: blur(16px);
  `}

  &:hover {
    box-shadow: ${({ theme }) => theme.shadows.elevation}, 0 0 30px rgba(0, 255, 255, 0.06);
    transform: translateY(-2px);
    border-color: rgba(0, 255, 255, 0.15);
  }

  @media (max-width: 320px) {
    border-radius: 12px;
  }
  @media (min-width: 2560px) {
    border-radius: 20px;
  }
  @media (min-width: 3840px) {
    border-radius: 24px;
  }
`;

const FAQQuestion = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.25rem 1.5rem;
  min-height: 54px;
  background: transparent;
  border: none;
  cursor: pointer;
  color: ${({ theme }) => theme.text.heading};
  font-family: ${({ theme }) => theme.fonts.heading};
  font-size: 1rem;
  font-weight: 500;
  text-align: left;
  transition: background 0.2s ease;

  &:hover {
    background: ${({ theme }) => theme.background.elevated};
  }

  @media (max-width: 320px) {
    padding: 1rem;
    font-size: 0.9rem;
    min-height: 48px;
  }
  @media (min-width: 2560px) {
    padding: 1.5rem 1.75rem;
    font-size: 1.1rem;
    min-height: 60px;
  }
  @media (min-width: 3840px) {
    padding: 1.75rem 2rem;
    font-size: 1.25rem;
    min-height: 68px;
  }
`;

const ChevronIcon = styled(ChevronDown)<{ $open: boolean }>`
  flex-shrink: 0;
  transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  color: ${({ theme }) => theme.colors.primary};
  transform: rotate(${({ $open }) => ($open ? '180deg' : '0deg')});
`;

const FAQAnswer = styled(motion.div)`
  padding: 0 1.5rem 1.25rem;
  font-size: 0.95rem;
  line-height: 1.7;
  color: ${({ theme }) => theme.text.body};

  @media (max-width: 320px) {
    padding: 0 1rem 1rem;
    font-size: 0.85rem;
  }
  @media (min-width: 2560px) {
    padding: 0 1.75rem 1.5rem;
    font-size: 1.05rem;
  }
  @media (min-width: 3840px) {
    padding: 0 2rem 1.75rem;
    font-size: 1.2rem;
  }
`;

// --------------- Social ---------------

const SocialRow = styled.div`
  display: flex;
  justify-content: center;
  gap: 1.25rem;
  padding: 2rem 0;
  position: relative;
  z-index: 2;

  @media (max-width: 320px) {
    gap: 0.75rem;
    padding: 1.5rem 0;
  }
  @media (min-width: 2560px) {
    gap: 1.75rem;
    padding: 3rem 0;
  }
  @media (min-width: 3840px) {
    gap: 2rem;
    padding: 4rem 0;
  }
`;

const SocialLink = styled.a`
  width: 52px;
  height: 52px;
  min-width: 44px;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: ${({ theme }) => theme.background.surface};
  border: ${({ theme }) => theme.borders.elegant};
  color: ${({ theme }) => theme.text.secondary};
  text-decoration: none;
  transition: all 0.3s ease;

  &:hover, &:focus-visible {
    background: ${({ theme }) => theme.gradients.glass};
    color: ${({ theme }) => theme.colors.primary};
    transform: translateY(-3px);
    box-shadow: ${({ theme }) => theme.shadows.primary};
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }

  @media (min-width: 2560px) {
    width: 60px;
    height: 60px;
  }
  @media (min-width: 3840px) {
    width: 72px;
    height: 72px;
  }
`;

// --------------- Notification ---------------

const NotificationWrapper = styled.div<{ $visible: boolean }>`
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10000;
  opacity: ${({ $visible }) => ($visible ? 1 : 0)};
  visibility: ${({ $visible }) => ($visible ? 'visible' : 'hidden')};
  transition: all 0.3s ease;
  animation: ${({ $visible }) => ($visible ? slideUp : 'none')} 0.3s ease;
  ${reducedMotion}
`;

const AlertBox = styled.div<{ $type: 'success' | 'error' }>`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 24px;
  border-radius: 12px;
  color: #fff;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  min-width: 300px;
  max-width: 520px;
  backdrop-filter: blur(10px);

  ${({ $type }) =>
    $type === 'success'
      ? css`
          background: rgba(46, 125, 50, 0.92);
          border: 1px solid rgba(76, 175, 80, 0.4);
        `
      : css`
          background: rgba(211, 47, 47, 0.92);
          border: 1px solid rgba(244, 67, 54, 0.4);
        `}

  @media (max-width: 320px) {
    min-width: 260px;
    max-width: 300px;
    padding: 12px 16px;
    font-size: 0.85rem;
  }
`;

const AlertCloseBtn = styled.button`
  background: none;
  border: none;
  color: inherit;
  cursor: pointer;
  padding: 4px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  min-height: 44px;
  transition: background 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.15);
  }
`;

// --------------- Section Heading Helper ---------------

const SectionHeading = styled.h2`
  font-family: ${({ theme }) => theme.fonts.heading};
  font-size: clamp(1.5rem, 3vw, 2.25rem);
  font-weight: 400;
  color: ${({ theme }) => theme.text.heading};
  text-align: center;
  margin: 0 0 2.5rem;
  position: relative;

  &::after {
    content: '';
    display: block;
    width: 80px;
    height: 2px;
    margin: 12px auto 0;
    background: ${({ theme }) => theme.gradients.primary};
  }

  @media (min-width: 2560px) {
    font-size: 2.5rem;
    margin-bottom: 3rem;
  }
  @media (min-width: 3840px) {
    font-size: 3rem;
    margin-bottom: 3.5rem;

    &::after {
      width: 120px;
      height: 3px;
    }
  }
  @media (max-width: 320px) {
    font-size: 1.3rem;
    margin-bottom: 1.75rem;
  }
`;

// ================================================================
// Component
// ================================================================

const faqData = [
  {
    q: 'How do I schedule a session?',
    a: 'Visit our store page or contact us directly through this form, by phone, or email. We will match you with the perfect trainer for your goals.',
  },
  {
    q: 'What are the pricing options?',
    a: 'We offer flexible packages from single sessions to 12-month programs. Contact us for a personalized quote based on your specific needs and objectives.',
  },
  {
    q: 'Do you offer virtual training?',
    a: 'Yes! We offer both in-person and virtual training sessions. Virtual sessions are customized just like our in-person training to ensure you reach your fitness goals.',
  },
  {
    q: 'How quickly do you respond?',
    a: 'We typically respond within 24 hours. For urgent matters, we recommend giving us a call directly at (714) 485-3950.',
  },
];

const ContactV3: React.FC = () => {
  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // FAQ accordion state
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (idx: number) => {
    setOpenFaq((prev) => (prev === idx ? null : idx));
  };

  // ---------- Form submission (matches original API contract) ----------
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !email || !message) {
      setError('Please fill in all required fields.');
      return;
    }

    setSubmitting(true);

    try {
      const API_BASE_URL = window.location.origin.includes('sswanstudios.com')
        ? 'https://ss-pt-new.onrender.com'
        : 'http://localhost:5000';

      await axios.post(`${API_BASE_URL}/api/contact`, {
        name,
        email,
        message: message + (subject ? `\n\nSubject: ${subject}` : ''),
        consultationType: 'general',
        priority: 'normal',
      });

      setSuccess(true);
      setName('');
      setEmail('');
      setSubject('');
      setMessage('');
      setError('');

      setTimeout(() => setSuccess(false), 5000);
    } catch (err: unknown) {
      const axiosErr = err as {
        response?: { status?: number; data?: { message?: string } };
        message?: string;
        code?: string;
      };

      if (axiosErr.response?.status === 404) {
        setError('Contact service not found. Please try again later.');
      } else if (axiosErr.response?.status && axiosErr.response.status >= 500) {
        setError('Server error. Please try again later.');
      } else if (axiosErr.code === 'NETWORK_ERROR' || !axiosErr.response) {
        setError('Network error. Please check your connection and try again.');
      } else {
        setError(
          `Failed to send message: ${axiosErr.response?.data?.message || axiosErr.message}`
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageWrapper>
      {/* ---- Noise Overlay ---- */}
      <NoiseOverlay />

      {/* ---- All content above noise ---- */}
      <ContentLayer>
        {/* ---- Hero ---- */}
        <ParallaxHero
          imageSrc="/images/parallax/contact-hero-bg.png"
          overlayOpacity={0.65}
          minHeight="70vh"
        >
          <HeroLogo src={logoImg} alt="SwanStudios Logo" />
          <HeroTitle text="Let's Connect" forwardedAs="h1" speed={60} />
          <HeroSubtitle>
            Whether you have questions about personal training, want to book a session, or just want
            to say hello — we would love to hear from you.
          </HeroSubtitle>
        </ParallaxHero>

        <SectionDivider />

        {/* ---- Contact Form + Info Cards ---- */}
        <Section>
          <ContactGrid>
            {/* LEFT: Form */}
            <ScrollReveal direction="left" delay={0.1}>
              <FormCard>
                <FormTitle>Send Us a Message</FormTitle>
                <Form onSubmit={handleSubmit}>
                  <InputGroup>
                    <StyledInput
                      id="contact-name"
                      name="name"
                      type="text"
                      placeholder="Full Name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      autoComplete="name"
                    />
                    <FloatingLabel htmlFor="contact-name">Full Name *</FloatingLabel>
                  </InputGroup>

                  <InputGroup>
                    <StyledInput
                      id="contact-email"
                      name="email"
                      type="email"
                      placeholder="Email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                    />
                    <FloatingLabel htmlFor="contact-email">Email *</FloatingLabel>
                  </InputGroup>

                  <InputGroup>
                    <StyledInput
                      id="contact-subject"
                      name="subject"
                      type="text"
                      placeholder="Subject"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      autoComplete="off"
                    />
                    <FloatingLabel htmlFor="contact-subject">Subject</FloatingLabel>
                  </InputGroup>

                  <InputGroup>
                    <StyledTextarea
                      id="contact-message"
                      name="message"
                      placeholder="Message"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      required
                      autoComplete="off"
                    />
                    <FloatingLabel htmlFor="contact-message">Message *</FloatingLabel>
                  </InputGroup>

                  <SubmitButton type="submit" disabled={submitting}>
                    {submitting ? 'Sending...' : 'Send Message'}
                  </SubmitButton>
                </Form>
              </FormCard>
            </ScrollReveal>

            {/* RIGHT: Info Cards */}
            <InfoStack>
              <ScrollReveal direction="right" delay={0.15}>
                <InfoCard>
                  <IconCircle>
                    <MapPin size={22} />
                  </IconCircle>
                  <InfoContent>
                    <InfoLabel>Location</InfoLabel>
                    <InfoValue>Anaheim Hills, CA</InfoValue>
                  </InfoContent>
                </InfoCard>
              </ScrollReveal>

              <ScrollReveal direction="right" delay={0.25}>
                <InfoCard>
                  <IconCircle>
                    <Mail size={22} />
                  </IconCircle>
                  <InfoContent>
                    <InfoLabel>Email</InfoLabel>
                    <InfoValue>
                      <a href="mailto:loveswanstudios@protonmail.com">
                        loveswanstudios@protonmail.com
                      </a>
                    </InfoValue>
                  </InfoContent>
                </InfoCard>
              </ScrollReveal>

              <ScrollReveal direction="right" delay={0.35}>
                <InfoCard>
                  <IconCircle>
                    <Phone size={22} />
                  </IconCircle>
                  <InfoContent>
                    <InfoLabel>Phone</InfoLabel>
                    <InfoValue>
                      <a href="tel:+17144853950">(714) 485-3950</a>
                    </InfoValue>
                  </InfoContent>
                </InfoCard>
              </ScrollReveal>

              <ScrollReveal direction="right" delay={0.45}>
                <InfoCard>
                  <IconCircle>
                    <Clock size={22} />
                  </IconCircle>
                  <InfoContent>
                    <InfoLabel>Hours</InfoLabel>
                    <InfoValue>Monday &ndash; Sunday: By Appointment</InfoValue>
                  </InfoContent>
                </InfoCard>
              </ScrollReveal>
            </InfoStack>
          </ContactGrid>
        </Section>

        <SectionDivider />

        {/* ---- FAQ Section ---- */}
        <Section>
          <ScrollReveal direction="up">
            <SectionHeading>Frequently Asked Questions</SectionHeading>
          </ScrollReveal>

          <FAQGrid>
            {faqData.map((item, idx) => (
              <ScrollReveal key={idx} direction="up" delay={idx * 0.1}>
                <FAQCard>
                  <FAQQuestion
                    onClick={() => toggleFaq(idx)}
                    aria-expanded={openFaq === idx}
                    aria-controls={`faq-answer-${idx}`}
                  >
                    {item.q}
                    <ChevronIcon size={20} $open={openFaq === idx} />
                  </FAQQuestion>

                  <AnimatePresence initial={false}>
                    {openFaq === idx && (
                      <FAQAnswer
                        id={`faq-answer-${idx}`}
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{
                          duration: 0.4,
                          ease: [0.4, 0, 0.2, 1],
                          opacity: { duration: 0.3, delay: 0.05 },
                        }}
                        style={{ overflow: 'hidden' }}
                      >
                        {item.a}
                      </FAQAnswer>
                    )}
                  </AnimatePresence>
                </FAQCard>
              </ScrollReveal>
            ))}
          </FAQGrid>
        </Section>

        <SectionDivider />

        {/* ---- Social Links ---- */}
        <SocialRow>
          <ScrollReveal direction="up" delay={0}>
            <SocialLink
              href="https://facebook.com/seanswantech"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Facebook"
            >
              <Facebook size={22} />
            </SocialLink>
          </ScrollReveal>
          <ScrollReveal direction="up" delay={0.1}>
            <SocialLink
              href="https://www.instagram.com/seanswantech"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
            >
              <Instagram size={22} />
            </SocialLink>
          </ScrollReveal>
          <ScrollReveal direction="up" delay={0.2}>
            <SocialLink
              href="https://www.youtube.com/@swanstudios2018"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="YouTube"
            >
              <Youtube size={22} />
            </SocialLink>
          </ScrollReveal>
        </SocialRow>
      </ContentLayer>

      {/* ---- Notifications (above everything) ---- */}
      <NotificationWrapper $visible={success}>
        <AlertBox $type="success">
          <CheckCircle size={20} />
          <span style={{ flex: 1 }}>
            Your message has been sent successfully! We will get back to you soon.
          </span>
          <AlertCloseBtn onClick={() => setSuccess(false)}>
            <X size={16} />
          </AlertCloseBtn>
        </AlertBox>
      </NotificationWrapper>

      <NotificationWrapper $visible={!!error}>
        <AlertBox $type="error">
          <AlertCircle size={20} />
          <span style={{ flex: 1 }}>{error}</span>
          <AlertCloseBtn onClick={() => setError('')}>
            <X size={16} />
          </AlertCloseBtn>
        </AlertBox>
      </NotificationWrapper>
    </PageWrapper>
  );
};

export default ContactV3;
