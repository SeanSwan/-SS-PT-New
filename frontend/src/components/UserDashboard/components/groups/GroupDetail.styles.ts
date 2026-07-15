/**
 * ============================================================================
 * FILE: GroupDetail.styles.ts
 * PURPOSE: Layout + chrome for the group detail page (header, feed column,
 *          member rail, locked-state panel).
 * HOW IT FITS: Imported only by GroupDetail.
 * ============================================================================
 */
import styled from 'styled-components';

export const DetailLayout = styled.div<{ $split?: boolean }>`
  display: ${({ $split }) => ($split ? 'grid' : 'flex')};
  ${({ $split }) => ($split
    ? `
      grid-template-columns: minmax(0, 1fr) 240px;
      align-items: start;
      @media (max-width: 900px) {
        grid-template-columns: 1fr;
      }
    `
    : 'flex-direction: column;')}
  gap: clamp(0.85rem, 1.8vw, 1.15rem);
  min-width: 0;
`;

export const DetailHeaderCard = styled.header`
  display: grid;
  gap: 0.85rem;
  padding: clamp(1rem, 2.2vw, 1.3rem);
  border-radius: 14px;
  border: 1px solid color-mix(in srgb, var(--accent-secondary, #8B5CF6) 32%, transparent);
  background:
    linear-gradient(
      150deg,
      color-mix(in srgb, var(--surface-primary, #003080) 68%, transparent),
      color-mix(in srgb, var(--bg-elevated, #1A1A24) 94%, transparent)
    );
  box-shadow: 0 18px 44px color-mix(in srgb, var(--bg-base, #030712) 52%, transparent);
`;

export const DetailTitleBlock = styled.div`
  display: flex;
  gap: 0.85rem;
  align-items: flex-start;
  min-width: 0;

  h2 {
    margin: 0 0 0.25rem;
    font-size: clamp(1.15rem, 2.6vw, 1.45rem);
    color: var(--text-primary, #E0ECF4);
    overflow-wrap: anywhere;
  }

  p {
    margin: 0.45rem 0 0;
    font-size: 0.9rem;
    line-height: 1.5;
    color: color-mix(in srgb, var(--text-primary, #E0ECF4) 74%, transparent);
  }
`;

export const FeedColumn = styled.section`
  display: flex;
  flex-direction: column;
  gap: clamp(0.75rem, 1.6vw, 1rem);
  min-width: 0;
`;

export const MemberRail = styled.aside`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: clamp(0.8rem, 1.6vw, 1rem);
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 20%, transparent);
  background: color-mix(in srgb, var(--bg-elevated, #141419) 90%, transparent);
  min-width: 0;

  @media (max-width: 900px) {
    order: 2;
  }
`;

export const MemberRailTitle = styled.h3`
  margin: 0 0 0.25rem;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--text-primary, #E0ECF4) 60%, transparent);
`;

export const MemberChip = styled.div<{ $pending?: boolean }>`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.4rem;
  padding: 0.45rem 0.6rem;
  border-radius: 9px;
  font-size: 0.84rem;
  color: var(--text-primary, #E0ECF4);
  background: color-mix(in srgb, var(--surface-primary, #003080) 34%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 16%, transparent);
  opacity: ${({ $pending }) => ($pending ? 0.7 : 1)};
  overflow-wrap: anywhere;
`;

export const LockedPanel = styled.div`
  display: grid;
  gap: 0.5rem;
  justify-items: center;
  text-align: center;
  padding: clamp(1.4rem, 3.2vw, 2rem);
  border-radius: 14px;
  border: 1px dashed color-mix(in srgb, var(--accent-secondary, #8B5CF6) 40%, transparent);
  background: color-mix(in srgb, var(--bg-elevated, #1A1A24) 88%, transparent);
  color: color-mix(in srgb, var(--text-primary, #E0ECF4) 80%, transparent);
  font-size: 0.92rem;

  strong { color: var(--text-primary, #E0ECF4); }
`;
