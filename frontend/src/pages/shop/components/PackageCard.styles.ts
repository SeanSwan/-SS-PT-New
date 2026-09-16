import styled from 'styled-components';

export const PackageCardShell = styled.article`
  display: flex;
  flex-direction: column;
  min-height: 100%;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60c0f0) 24%, transparent);
  border-radius: 1.2rem;
  background: linear-gradient(145deg, rgba(8, 24, 66, 0.96), rgba(11, 11, 23, 0.96));
  box-shadow: 0 1.5rem 3.5rem rgba(0, 0, 0, 0.28);
  color: var(--text-primary, #e0ecf4);
  isolation: isolate;
  min-width: 0;

  &:focus-within {
    border-color: var(--accent-primary, #60c0f0);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent-primary, #60c0f0) 28%, transparent), 0 1.5rem 3.5rem rgba(0, 0, 0, 0.28);
  }
`;

export const PackageMedia = styled.div<{ $imageUrl?: string | null }>`
  min-height: 12rem;
  background: linear-gradient(145deg, rgba(96, 192, 240, 0.28), rgba(139, 92, 246, 0.12)),
    ${({ $imageUrl }) => $imageUrl ? `url(${$imageUrl}) center / cover` : 'radial-gradient(circle at 25% 20%, rgba(198,168,75,.4), transparent 42%), linear-gradient(135deg, var(--accent-primary, #061c50), var(--bg-surface, #17132c))'};
  position: relative;

  &::after { content: ''; position: absolute; inset: 0; background: linear-gradient(180deg, transparent 35%, rgba(3, 9, 28, 0.78)); pointer-events: none; }
  @media (max-width: 430px) { min-height: 10rem; }
`;

export const PackageBody = styled.div`display: flex; flex: 1; flex-direction: column; gap: 0.9rem; min-width: 0; padding: 1.35rem;`;
export const PackageTitle = styled.h3`color: var(--text-heading, #e0ecf4); font-family: var(--font-drama, "Cormorant Garamond", Georgia, serif); font-size: clamp(1.5rem, 3vw, 2rem); line-height: 1.1; margin: 0; overflow-wrap: anywhere;`;
export const PackageDescription = styled.p`color: var(--text-secondary, rgba(224, 236, 244, 0.8)); font-size: 0.94rem; line-height: 1.55; margin: 0; overflow-wrap: anywhere;`;
export const PackageFacts = styled.div`display: grid; gap: 0.35rem; min-height: 3.5rem; padding: 0.85rem; border: 1px solid rgba(96, 192, 240, 0.15); border-radius: 0.8rem; color: var(--text-secondary, rgba(224, 236, 244, 0.82)); font-size: 0.84rem; line-height: 1.4;`;
export const PackagePrice = styled.div`display: grid; gap: 0.2rem; min-height: 5rem; padding: 1rem; border: 1px solid color-mix(in srgb, var(--accent-gold, #c6a84b) 30%, transparent); border-radius: 0.8rem; background: color-mix(in srgb, var(--accent-gold, #c6a84b) 7%, transparent);`;
export const PriceLabel = styled.span`color: var(--text-muted, rgba(224, 236, 244, 0.62)); font-size: 0.72rem; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase;`;
export const PriceValue = styled.span`color: var(--text-heading, #E0ECF4); font-family: var(--font-data, "Fira Code", monospace); font-size: 1.4rem; font-weight: 800; overflow-wrap: anywhere;`;
export const CardAction = styled.button`width: 100%; min-height: 48px; padding: 0.75rem 1rem; border: 1px solid var(--accent-primary, #60c0f0); border-radius: 999px; background: linear-gradient(135deg, var(--accent-primary, #002060), var(--accent-purple, #493082)); color: var(--text-primary, #e0ecf4); cursor: pointer; font: inherit; font-weight: 800; transition: transform 180ms ease, box-shadow 180ms ease; &:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 0.7rem 1.6rem rgba(96, 192, 240, 0.2); } &:disabled { cursor: not-allowed; opacity: 0.58; } &:focus-visible { outline: 2px solid var(--accent-gold, #c6a84b); outline-offset: 3px; } @media (prefers-reduced-motion: reduce) { transition: none; &:hover:not(:disabled) { transform: none; } }`;
