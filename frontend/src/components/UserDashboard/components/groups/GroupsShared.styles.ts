/**
 * ============================================================================
 * FILE: GroupsShared.styles.ts
 * PURPOSE: Crystalline Swan styling for the Groups tab (hub, cards, detail).
 * HOW IT FITS: Imported by GroupsHub / GroupCard / GroupDetail / modal.
 * KEY DECISIONS:
 * - Styled-components only, token-with-fallback (rule 6), dark-first.
 * - Data cards stay low-motion (client-card standard): hover lift only,
 *   gated behind prefers-reduced-motion.
 * - Dual-Button Glow: purple primary buttons carry a cyan glow.
 * ============================================================================
 */
import styled from 'styled-components';

export const GroupsSurface = styled.div`
  display: flex;
  flex-direction: column;
  gap: clamp(0.9rem, 2vw, 1.25rem);
  min-width: 0;
`;

export const HubControlsRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
  align-items: center;
  min-width: 0;
`;

export const GroupSearchInput = styled.input`
  flex: 1 1 220px;
  min-height: 44px;
  padding: 0 0.9rem;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 26%, transparent);
  background: color-mix(in srgb, var(--bg-elevated, #141419) 92%, transparent);
  color: var(--text-primary, #E0ECF4);
  font-size: 0.95rem;

  &::placeholder {
    color: color-mix(in srgb, var(--text-primary, #E0ECF4) 45%, transparent);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-secondary, #8B5CF6);
    outline-offset: 2px;
  }
`;

export const CategoryChipRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
`;

export const CategoryChip = styled.button<{ $active: boolean }>`
  min-height: 44px;
  padding: 0 0.85rem;
  border-radius: 999px;
  border: 1px solid
    ${({ $active }) => ($active
    ? 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 70%, transparent)'
    : 'color-mix(in srgb, var(--accent-primary, #60C0F0) 22%, transparent)')};
  background: ${({ $active }) => ($active
    ? 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 26%, transparent)'
    : 'color-mix(in srgb, var(--bg-elevated, #141419) 90%, transparent)')};
  color: var(--text-primary, #E0ECF4);
  font-size: 0.82rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  cursor: pointer;
  transition: border-color 160ms ease, background 160ms ease;
  text-transform: capitalize;

  &:focus-visible {
    outline: 2px solid var(--accent-secondary, #8B5CF6);
    outline-offset: 2px;
  }
`;

export const GroupsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(260px, 100%), 1fr));
  gap: clamp(0.75rem, 1.6vw, 1rem);
  min-width: 0;
`;

export const GroupCardShell = styled.article`
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
  padding: clamp(0.9rem, 1.8vw, 1.1rem);
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 22%, transparent);
  background:
    linear-gradient(
      150deg,
      color-mix(in srgb, var(--surface-primary, #003080) 62%, transparent),
      color-mix(in srgb, var(--bg-elevated, #141419) 94%, transparent)
    );
  box-shadow: 0 14px 34px color-mix(in srgb, var(--bg-base, #030712) 46%, transparent);
  min-width: 0;

  @media (prefers-reduced-motion: no-preference) {
    transition: transform 180ms ease, border-color 180ms ease;
    &:hover {
      transform: translateY(-2px);
      border-color: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 45%, transparent);
    }
  }
`;

export const GroupIdentityRow = styled.div`
  display: flex;
  gap: 0.7rem;
  align-items: center;
  min-width: 0;
`;

export const GroupEmojiTile = styled.div`
  flex: 0 0 auto;
  width: 48px;
  height: 48px;
  display: grid;
  place-items: center;
  font-size: 1.45rem;
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 32%, transparent);
  background:
    linear-gradient(
      160deg,
      color-mix(in srgb, var(--primary, #002060) 80%, transparent),
      color-mix(in srgb, var(--accent-secondary, #8B5CF6) 22%, transparent)
    );
`;

export const GroupName = styled.h3`
  margin: 0;
  font-size: 1.02rem;
  font-weight: 700;
  color: var(--text-primary, #E0ECF4);
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
`;

export const GroupMetaRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem 0.7rem;
  align-items: center;
  font-size: 0.78rem;
  color: color-mix(in srgb, var(--text-primary, #E0ECF4) 66%, transparent);

  svg { flex: 0 0 auto; }
  span { display: inline-flex; align-items: center; gap: 0.3rem; }
`;

export const GroupDescription = styled.p`
  margin: 0;
  font-size: 0.86rem;
  line-height: 1.45;
  color: color-mix(in srgb, var(--text-primary, #E0ECF4) 74%, transparent);
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
`;

export const CardActionsRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: auto;
`;

/** Purple primary — cyan glow (Dual-Button Glow). */
export const PrimaryGroupButton = styled.button`
  min-height: 44px;
  padding: 0 1.05rem;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--accent-secondary, #8B5CF6) 65%, transparent);
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--accent-secondary, #8B5CF6) 82%, transparent),
    color-mix(in srgb, var(--primary, #002060) 68%, transparent)
  );
  color: var(--text-primary, #E0ECF4);
  font-weight: 700;
  font-size: 0.88rem;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  box-shadow: 0 0 18px color-mix(in srgb, var(--accent-primary, #60C0F0) 30%, transparent);

  &:disabled { opacity: 0.55; cursor: not-allowed; }
  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;

/** Quiet secondary — bordered, no glow. */
export const QuietGroupButton = styled.button`
  min-height: 44px;
  padding: 0 0.95rem;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 32%, transparent);
  background: color-mix(in srgb, var(--bg-elevated, #141419) 88%, transparent);
  color: var(--text-primary, #E0ECF4);
  font-weight: 600;
  font-size: 0.86rem;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;

  &:disabled { opacity: 0.55; cursor: not-allowed; }
  &:focus-visible {
    outline: 2px solid var(--accent-secondary, #8B5CF6);
    outline-offset: 2px;
  }
`;

export const StatusPill = styled.span<{ $tone?: 'gold' | 'violet' | 'cyan' }>`
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.22rem 0.6rem;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--text-primary, #E0ECF4);
  border: 1px solid
    ${({ $tone }) => ($tone === 'gold'
    ? 'color-mix(in srgb, var(--accent-gold, #C6A84B) 55%, transparent)'
    : $tone === 'cyan'
      ? 'color-mix(in srgb, var(--accent-primary, #60C0F0) 50%, transparent)'
      : 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 55%, transparent)')};
  background:
    ${({ $tone }) => ($tone === 'gold'
    ? 'color-mix(in srgb, var(--accent-gold, #C6A84B) 16%, transparent)'
    : $tone === 'cyan'
      ? 'color-mix(in srgb, var(--accent-primary, #60C0F0) 14%, transparent)'
      : 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 16%, transparent)')};
`;

export const EmptyStateCard = styled.div`
  padding: clamp(1.1rem, 2.5vw, 1.6rem);
  border-radius: 12px;
  border: 1px dashed color-mix(in srgb, var(--accent-primary, #60C0F0) 30%, transparent);
  background: color-mix(in srgb, var(--bg-elevated, #141419) 85%, transparent);
  color: color-mix(in srgb, var(--text-primary, #E0ECF4) 75%, transparent);
  text-align: center;
  display: grid;
  gap: 0.7rem;
  justify-items: center;
  font-size: 0.92rem;
`;

export const SectionDivider = styled.h4`
  margin: 0.4rem 0 0;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--text-primary, #E0ECF4) 58%, transparent);
`;
