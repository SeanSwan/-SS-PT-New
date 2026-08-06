/**
 * Public waiver page styles — SWA-140
 * ====================================
 * Crystalline Swan, tuned for a trust-critical legal surface.
 *
 * Two deliberate departures from the previous design, both from the review
 * panel: the autoplaying hero video and the typewriter animation on the <h1>
 * are gone. Marketing motion wrapped around a liability release reads as
 * salesmanship on a document you are giving up rights in, and animating legal
 * text character-by-character is hostile to screen readers. The motion budget
 * moved to the one moment that earns it — the seal on the receipt.
 */
import styled, { css } from 'styled-components';

export const PageWrapper = styled.div`
  min-height: 100vh;
  background:
    radial-gradient(1200px 600px at 50% -10%, color-mix(in srgb, var(--accent-deep, #002060) 55%, transparent), transparent 70%),
    var(--bg-base, #030712);
  color: var(--text-primary, #E0ECF4);
  padding-bottom: 4rem;
`;

export const Header = styled.header`
  text-align: center;
  padding: clamp(2rem, 6vw, 3.5rem) 1rem 1.5rem;
`;

export const Logo = styled.img`
  width: 64px;
  height: 64px;
  border-radius: 50%;
  object-fit: cover;
  margin-bottom: 1rem;
`;

export const PageTitle = styled.h1`
  margin: 0 0 0.5rem;
  font-size: clamp(1.75rem, 5vw, 2.75rem);
  letter-spacing: -0.02em;
  color: var(--text-primary, #E0ECF4);
`;

export const PageSubtitle = styled.p`
  margin: 0 auto;
  max-width: 46ch;
  color: var(--text-muted, rgba(224, 236, 244, 0.72));
`;

export const Container = styled.main`
  width: min(100% - 2rem, 780px);
  margin: 0 auto;
`;

export const Card = styled.section`
  border-radius: 18px;
  padding: clamp(1.25rem, 4vw, 2rem);
  border: 1px solid var(--border-subtle, rgba(96, 192, 240, 0.22));
  background: var(--surface-elevated, rgba(255, 255, 255, 0.045));
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.28);
`;

export const Step = styled.div`
  padding-top: 1.75rem;
  margin-top: 1.75rem;
  border-top: 1px solid var(--border-subtle, rgba(96, 192, 240, 0.14));

  &:first-of-type {
    padding-top: 0;
    margin-top: 0;
    border-top: 0;
  }
`;

export const StepHeading = styled.h2`
  margin: 0 0 0.25rem;
  font-size: 1.125rem;
  color: var(--text-primary, #E0ECF4);
`;

export const StepHelp = styled.p`
  margin: 0 0 1rem;
  font-size: 0.875rem;
  color: var(--text-muted, rgba(224, 236, 244, 0.62));
`;

export const ActivityGrid = styled.div`
  display: grid;
  gap: 0.75rem;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));

  @media (max-width: 360px) {
    grid-template-columns: 1fr;
  }
`;

export const ActivityCard = styled.label<{ $selected: boolean }>`
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
  min-height: 56px;
  padding: 0.875rem 1rem;
  border-radius: 12px;
  cursor: pointer;
  background: var(--surface-raised, rgba(255, 255, 255, 0.03));
  border: 1px solid ${({ $selected }) =>
    $selected ? 'var(--accent-primary, #60C0F0)' : 'var(--border-subtle, rgba(96, 192, 240, 0.2))'};

  ${({ $selected }) => $selected && css`
    box-shadow: 0 0 0 1px var(--accent-primary, #60C0F0) inset;
  `}

  input {
    margin-top: 0.2rem;
    width: 20px;
    height: 20px;
    accent-color: var(--accent-primary, #60C0F0);
  }

  &:focus-within {
    outline: 2px solid var(--accent-secondary, #8B5CF6);
    outline-offset: 2px;
  }
`;

export const ActivityLabel = styled.span`
  display: block;
  font-weight: 600;
  color: var(--text-primary, #E0ECF4);
`;

export const ActivityDetail = styled.span`
  display: block;
  font-size: 0.8125rem;
  color: var(--text-muted, rgba(224, 236, 244, 0.6));
`;

export const FieldGrid = styled.div`
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
`;

export const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
`;

export const Label = styled.label`
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-primary, #E0ECF4);
`;

export const Input = styled.input<{ $invalid?: boolean }>`
  min-height: 48px;
  padding: 0 0.875rem;
  border-radius: 10px;
  font: inherit;
  /* 16px minimum stops iOS zooming the whole page on focus */
  font-size: 16px;
  color: var(--text-primary, #E0ECF4);
  background: var(--surface-raised, rgba(255, 255, 255, 0.04));
  border: 1px solid ${({ $invalid }) =>
    $invalid ? 'var(--danger, #f4707a)' : 'var(--border-subtle, rgba(96, 192, 240, 0.24))'};

  &::placeholder { color: var(--text-muted, rgba(224, 236, 244, 0.4)); }

  &:focus-visible {
    outline: 2px solid var(--accent-secondary, #8B5CF6);
    outline-offset: 1px;
  }
`;

export const FieldHelp = styled.p`
  margin: 0;
  font-size: 0.8125rem;
  color: var(--text-muted, rgba(224, 236, 244, 0.58));
`;

export const ConsentCard = styled.div<{ $required?: boolean }>`
  display: flex;
  gap: 0.875rem;
  padding: 1rem;
  border-radius: 12px;
  margin-bottom: 0.75rem;
  background: var(--surface-raised, rgba(255, 255, 255, 0.03));
  border: 1px solid var(--border-subtle, rgba(96, 192, 240, 0.2));
  border-left: 3px solid ${({ $required }) =>
    $required ? 'var(--accent-gold, #C6A84B)' : 'var(--border-subtle, rgba(96, 192, 240, 0.2))'};

  input {
    margin-top: 0.15rem;
    width: 22px;
    height: 22px;
    flex-shrink: 0;
    accent-color: var(--accent-primary, #60C0F0);
  }

  &:focus-within {
    outline: 2px solid var(--accent-secondary, #8B5CF6);
    outline-offset: 2px;
  }
`;

export const ConsentText = styled.span`
  display: block;
  color: var(--text-primary, #E0ECF4);
  line-height: 1.5;
`;

export const ConsentNote = styled.span`
  display: block;
  margin-top: 0.25rem;
  font-size: 0.8125rem;
  color: var(--text-muted, rgba(224, 236, 244, 0.58));
`;

/** The boxed restatement immediately above the signature. */
export const Restatement = styled.aside`
  margin: 1.5rem 0 1rem;
  padding: 1.125rem 1.25rem;
  border-radius: 12px;
  border: 2px solid var(--accent-gold, #C6A84B);
  background: color-mix(in srgb, var(--accent-gold, #C6A84B) 8%, transparent);

  h3 {
    margin: 0 0 0.625rem;
    font-size: 1rem;
    color: var(--text-primary, #E0ECF4);
  }
  ul { margin: 0; padding-left: 1.15rem; }
  li {
    margin-bottom: 0.4rem;
    color: var(--text-primary, #E0ECF4);
    line-height: 1.5;
  }
  li:last-child { margin-bottom: 0; }
`;

export const Notice = styled.div<{ $tone: 'info' | 'warn' | 'danger' }>`
  padding: 1rem 1.125rem;
  border-radius: 12px;
  margin-bottom: 1rem;
  line-height: 1.55;
  border: 1px solid ${({ $tone }) =>
    $tone === 'danger' ? 'var(--danger, #f4707a)'
      : $tone === 'warn' ? 'var(--accent-gold, #C6A84B)'
        : 'var(--accent-primary, #60C0F0)'};
  background: ${({ $tone }) =>
    $tone === 'danger' ? 'color-mix(in srgb, #f4707a 10%, transparent)'
      : $tone === 'warn' ? 'color-mix(in srgb, #C6A84B 10%, transparent)'
        : 'color-mix(in srgb, #60C0F0 8%, transparent)'};
  color: var(--text-primary, #E0ECF4);

  strong { display: block; margin-bottom: 0.25rem; }
`;

export const SubmitBar = styled.div`
  margin-top: 1.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
  align-items: center;
`;

export const SubmitButton = styled.button`
  width: 100%;
  max-width: 420px;
  min-height: 54px;
  border-radius: 14px;
  cursor: pointer;
  font: inherit;
  font-size: 1.0625rem;
  font-weight: 700;
  color: var(--text-primary, #E0ECF4);
  background: var(--accent-deep, #002060);
  border: 1px solid var(--accent-secondary, #8B5CF6);
  box-shadow: 0 0 22px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 40%, transparent);
  transition: transform 160ms ease, box-shadow 160ms ease;

  &:hover:not(:disabled) { transform: translateY(-1px); }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    box-shadow: none;
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 3px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
    &:hover:not(:disabled) { transform: none; }
  }
`;

export const RetryButton = styled.button`
  min-height: 44px;
  margin-top: 0.75rem;
  padding: 0 1.25rem;
  border-radius: 10px;
  cursor: pointer;
  font: inherit;
  font-weight: 600;
  color: var(--text-primary, #E0ECF4);
  background: transparent;
  border: 1px solid var(--accent-primary, #60C0F0);

  &:focus-visible {
    outline: 2px solid var(--accent-secondary, #8B5CF6);
    outline-offset: 2px;
  }
`;

export const HelpFooter = styled.footer`
  margin-top: 2rem;
  text-align: center;
  font-size: 0.875rem;
  color: var(--text-muted, rgba(224, 236, 244, 0.6));

  strong { display: block; color: var(--text-primary, #E0ECF4); }
`;
