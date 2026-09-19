/**
 * FILE: SpotlightRail.styles.ts
 * PURPOSE: Swan Spotlight rail styling (S3, MEGA-BLUEPRINT §5).
 *
 * COLOR SEMANTICS (blueprint ban #8): Spotlight chrome is ICE-CYAN only.
 *   gold  (#C6A84B) = earned recognition (Coach Signal) — never here
 *   purple (#8B5CF6) = AI coach — never here
 * There are deliberately no like/comment/share-count styles, because those affordances
 * must never exist on an editorial Spotlight card (blueprint ban #2).
 */
import styled from 'styled-components';

export const RailSection = styled.section`
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 0 0 14px;
`;

export const RailHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
`;

export const RailTitle = styled.h2`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  color: var(--accent-primary, #60C0F0);
  font-family: 'Sora', sans-serif;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
`;

export const MuteButton = styled.button`
  min-height: 44px;
  padding: 0 10px;
  border: none;
  background: transparent;
  color: color-mix(in srgb, var(--text-primary, #E0ECF4) 60%, transparent);
  cursor: pointer;
  font-family: 'Sora', sans-serif;
  font-size: 0.7rem;

  &:hover {
    color: var(--text-primary, #E0ECF4);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;

export const SpotlightCard = styled.article`
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border: 1px solid var(--accent-primary, #60C0F0);
  border-radius: 14px;
  background: linear-gradient(
    160deg,
    var(--bg-surface, #0A0A0F) 0%,
    color-mix(in srgb, var(--midnight-sapphire, #002060) 40%, var(--bg-surface, #0A0A0F)) 100%
  );
  color: var(--text-primary, #E0ECF4);
`;

export const SpotlightImage = styled.img`
  width: 100%;
  height: 132px;
  object-fit: cover;
  border-radius: 10px;
  background: color-mix(in srgb, var(--bg-base, #030712) 60%, transparent);
`;

export const SpotlightHeadline = styled.h3`
  margin: 0;
  padding-right: 36px;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 0.95rem;
  font-weight: 700;
  line-height: 1.35;
`;

export const SpotlightDek = styled.p`
  margin: 0;
  color: color-mix(in srgb, var(--text-primary, #E0ECF4) 74%, transparent);
  font-family: 'Sora', sans-serif;
  font-size: 0.78rem;
  line-height: 1.45;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

export const SpotlightFoot = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  font-family: 'Sora', sans-serif;
  font-size: 0.68rem;
  color: color-mix(in srgb, var(--text-primary, #E0ECF4) 62%, transparent);
`;

export const SourceChip = styled.a`
  color: var(--accent-primary, #60C0F0);
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`;

export const CuratedBy = styled.span`
  color: color-mix(in srgb, var(--text-primary, #E0ECF4) 55%, transparent);
`;

export const DismissButton = styled.button`
  position: absolute;
  top: 6px;
  right: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border: none;
  border-radius: 50%;
  background: color-mix(in srgb, var(--bg-base, #030712) 55%, transparent);
  color: var(--text-primary, #E0ECF4);
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;

export const RailStatus = styled.p`
  margin: 0;
  color: color-mix(in srgb, var(--text-primary, #E0ECF4) 62%, transparent);
  font-family: 'Sora', sans-serif;
  font-size: 0.74rem;
`;
