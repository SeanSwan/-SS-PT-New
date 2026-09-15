/**
 * TrainerOnboardingStyles — theme-aware styled-components for the trainer onboarding page.
 * ============================================================================
 * Extracted from TrainerOnboardingPage to keep the page under the 300-line cap.
 * Reuses the PublicWaiverPage.V3 conventions (theme tokens, 44px targets, iOS-zoom guard,
 * extended responsive). Crystalline Swan palette via theme tokens with hex fallbacks.
 *
 * @module pages/TrainerOnboarding/TrainerOnboardingStyles
 */
import styled from 'styled-components';

export const PageWrapper = styled.div`
  min-height: 100vh;
  background: ${({ theme }) => theme?.background?.primary || 'var(--bg-base, #030712)'};
  color: ${({ theme }) => theme?.text?.body || 'var(--text-primary, #E0ECF4)'};
  position: relative;
`;

export const HeroBand = styled.div`
  text-align: center;
  padding: 3.5rem 1.5rem 2rem;
  background: linear-gradient(180deg, rgba(0, 32, 96, 0.35), transparent);

  @media (max-width: 430px) {
    padding: 2.5rem 1rem 1.5rem;
  }
`;

export const HeroLogo = styled.img`
  width: 92px;
  height: 92px;
  border-radius: 50%;
  object-fit: contain;
  margin-bottom: 1rem;
  filter: drop-shadow(0 0 20px rgba(96, 192, 240, 0.35));

  @media (max-width: 320px) { width: 68px; height: 68px; }
`;

export const HeroTitle = styled.h1`
  font-family: ${({ theme }) => theme?.fonts?.heading || "'Plus Jakarta Sans', sans-serif"};
  font-size: clamp(1.9rem, 5vw, 3.25rem);
  font-weight: 800;
  letter-spacing: -0.02em;
  color: ${({ theme }) => theme?.text?.heading || 'var(--text-primary, #E0ECF4)'};
  margin: 0 0 0.5rem;
  text-wrap: balance;
`;

export const HeroSubtitle = styled.p`
  font-family: ${({ theme }) => theme?.fonts?.ui || "'Sora', sans-serif"};
  font-size: clamp(0.95rem, 2vw, 1.15rem);
  color: ${({ theme }) => theme?.text?.secondary || 'rgba(224,236,244,0.75)'};
  max-width: 560px;
  margin: 0 auto;
  line-height: 1.55;
`;

/* Earnings preview — the "I don't be stingy" money-honesty moment */
export const EarningsCard = styled.div`
  max-width: 560px;
  margin: 1.75rem auto 0;
  padding: 1.25rem 1.5rem;
  border-radius: 16px;
  border: 1px solid rgba(198, 168, 75, 0.3);
  background: linear-gradient(160deg, rgba(198, 168, 75, 0.1), rgba(20, 20, 25, 0.6));
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 0.4rem 1.25rem;
  text-align: center;
`;

export const EarningsKeep = styled.span`
  font-family: ${({ theme }) => theme?.fonts?.heading || "'Plus Jakarta Sans', sans-serif"};
  font-size: clamp(1.4rem, 4vw, 2rem);
  font-weight: 800;
  color: var(--accent-gold, #C6A84B);
`;

export const EarningsNote = styled.span`
  font-family: ${({ theme }) => theme?.fonts?.ui || "'Sora', sans-serif"};
  font-size: 0.9rem;
  color: ${({ theme }) => theme?.text?.secondary || 'rgba(224,236,244,0.75)'};
`;

export const FormContainer = styled.div`
  max-width: 720px;
  margin: 0 auto;
  padding: 1.5rem 1.5rem 4rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;

  @media (max-width: 430px) { padding: 1rem 1rem 3rem; }
  @media (min-width: 2560px) { max-width: 900px; }
`;

export const SectionCard = styled.section`
  border-radius: 18px;
  border: 1px solid rgba(96, 192, 240, 0.14);
  background: rgba(20, 20, 28, 0.72);
  backdrop-filter: blur(16px);
  padding: 1.5rem;

  @media (max-width: 430px) { padding: 1.15rem; }
`;

export const SectionTitle = styled.h2`
  font-family: ${({ theme }) => theme?.fonts?.heading || "'Plus Jakarta Sans', sans-serif"};
  font-size: 1.15rem;
  font-weight: 700;
  color: ${({ theme }) => theme?.text?.heading || 'var(--text-primary, #E0ECF4)'};
  margin: 0 0 0.35rem;
  display: flex;
  align-items: center;
  gap: 0.6rem;
`;

export const StepIndex = styled.span`
  font-family: 'Fira Code', monospace;
  font-size: 0.8rem;
  color: var(--accent-primary, #60C0F0);
`;

export const SectionHint = styled.p`
  font-family: ${({ theme }) => theme?.fonts?.ui || "'Sora', sans-serif"};
  font-size: 0.85rem;
  color: ${({ theme }) => theme?.text?.muted || 'rgba(224,236,244,0.55)'};
  margin: 0 0 1rem;
`;

export const Grid2 = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;

  @media (max-width: 560px) { grid-template-columns: 1fr; }
`;

export const InputGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
`;

export const Label = styled.label`
  font-family: ${({ theme }) => theme?.fonts?.ui || "'Sora', sans-serif"};
  font-size: 0.85rem;
  color: ${({ theme }) => theme?.text?.muted || 'rgba(224,236,244,0.6)'};
`;

export const Input = styled.input<{ $error?: boolean }>`
  padding: 0.75rem;
  min-height: 44px;
  background: ${({ theme }) => theme?.background?.elevated || 'rgba(10,10,15,0.6)'};
  border: 1px solid ${({ $error }) => ($error ? 'var(--danger, #E5484D)' : 'rgba(96,192,240,0.2)')};
  border-radius: 10px;
  color: ${({ theme }) => theme?.text?.primary || 'var(--text-primary, #E0ECF4)'};
  font-family: ${({ theme }) => theme?.fonts?.ui || "'Sora', sans-serif"};
  font-size: 1rem;
  transition: border-color 0.25s ease, box-shadow 0.25s ease;

  &:focus {
    border-color: var(--accent-primary, #60C0F0);
    outline: none;
    box-shadow: 0 0 0 2px rgba(96, 192, 240, 0.2);
  }

  @media (max-width: 430px) { font-size: 16px; /* iOS zoom guard */ }
`;

export const TextArea = styled(Input).attrs({ as: 'textarea' })`
  min-height: 88px;
  resize: vertical;
  line-height: 1.5;
`;

export const FileRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
`;

export const FileButton = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  min-height: 44px;
  padding: 0.6rem 1rem;
  border-radius: 10px;
  border: 1px dashed rgba(96, 192, 240, 0.4);
  background: rgba(0, 32, 96, 0.25);
  color: var(--accent-primary, #60C0F0);
  font-family: ${({ theme }) => theme?.fonts?.ui || "'Sora', sans-serif"};
  font-size: 0.9rem;
  cursor: pointer;
  transition: border-color 0.2s ease, background 0.2s ease;

  &:hover { border-color: rgba(96, 192, 240, 0.7); background: rgba(0, 32, 96, 0.4); }
  input { display: none; }
`;

export const FileName = styled.span`
  font-family: 'Fira Code', monospace;
  font-size: 0.8rem;
  color: ${({ theme }) => theme?.text?.secondary || 'rgba(224,236,244,0.7)'};
`;

export const ContractBox = styled.div`
  max-height: 340px;
  overflow-y: auto;
  border: 1px solid rgba(96, 192, 240, 0.2);
  border-radius: 12px;
  padding: 1rem;
  background: rgba(10, 10, 15, 0.5);
  color: ${({ theme }) => theme?.text?.body || 'var(--text-primary, #E0ECF4)'};
  line-height: 1.6;
  font-family: ${({ theme }) => theme?.fonts?.ui || "'Sora', sans-serif"};
  font-size: 0.92rem;
  margin-bottom: 1rem;

  strong { color: var(--accent-primary, #60C0F0); }
`;

export const DraftBanner = styled.div`
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.75rem 1rem;
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.3);
  border-radius: 10px;
  color: var(--warning, #F5A623);
  font-family: ${({ theme }) => theme?.fonts?.ui || "'Sora', sans-serif"};
  font-size: 0.85rem;
  margin-bottom: 1rem;
`;

export const ConsentRow = styled.label<{ $required?: boolean }>`
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  min-height: 44px;
  padding: 0.5rem 0;
  cursor: pointer;
  font-family: ${({ theme }) => theme?.fonts?.ui || "'Sora', sans-serif"};
  font-size: 0.9rem;
  color: ${({ theme }) => theme?.text?.body || 'var(--text-primary, #E0ECF4)'};

  input {
    width: 20px;
    height: 20px;
    margin-top: 2px;
    accent-color: var(--accent-secondary, #8B5CF6);
    flex-shrink: 0;
  }
`;

export const ErrorText = styled.p`
  color: var(--danger, #E5484D);
  font-size: 0.8rem;
  margin: 0.25rem 0 0;
  font-family: ${({ theme }) => theme?.fonts?.ui || "'Sora', sans-serif"};
`;

export const SubmitRow = styled.div`
  display: flex;
  justify-content: center;
  padding-top: 0.5rem;
`;

export const StatusCard = styled.div`
  max-width: 560px;
  margin: 3rem auto;
  text-align: center;
  padding: 2.5rem 1.5rem;
  border-radius: 18px;
  border: 1px solid rgba(96, 192, 240, 0.2);
  background: rgba(20, 20, 28, 0.72);
`;

export const StatusIcon = styled.div`
  width: 64px;
  height: 64px;
  margin: 0 auto 1.25rem;
  border-radius: 50%;
  background: rgba(96, 192, 240, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
`;
