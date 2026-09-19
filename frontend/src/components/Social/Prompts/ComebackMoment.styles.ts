/**
 * FILE: ComebackMoment.styles.ts
 * PURPOSE: Welcome-back card styling (S4, MEGA-BLUEPRINT §6 S4).
 *
 * Warmth, not alarm: ice-cyan chrome (system chrome), never gold (earned recognition is
 * reserved for Coach Signal) and never purple (AI coach). No red, no warning color — a
 * return is good news.
 */
import styled from 'styled-components';

export const ComebackCard = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 14px 16px;
  margin: 0 0 14px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 55%, transparent);
  border-radius: 14px;
  background: linear-gradient(
    160deg,
    color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, transparent) 0%,
    var(--bg-surface, #0A0A0F) 70%
  );
  color: var(--text-primary, #E0ECF4);
`;

export const ComebackDismiss = styled.button`
  position: absolute;
  top: 4px;
  right: 4px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: color-mix(in srgb, var(--text-primary, #E0ECF4) 70%, transparent);
  cursor: pointer;

  &:hover {
    color: var(--text-primary, #E0ECF4);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;

export const ComebackTitle = styled.p`
  margin: 0;
  padding-right: 40px;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-primary, #E0ECF4);
`;

export const ComebackCopy = styled.p`
  margin: 0;
  font-family: 'Sora', sans-serif;
  font-size: 0.8rem;
  line-height: 1.45;
  color: color-mix(in srgb, var(--text-primary, #E0ECF4) 76%, transparent);
`;

export const ComebackActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-top: 2px;
`;

export const ComebackCheers = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--accent-primary, #60C0F0);
  font-family: 'Sora', sans-serif;
  font-size: 0.74rem;
  font-weight: 600;
`;
