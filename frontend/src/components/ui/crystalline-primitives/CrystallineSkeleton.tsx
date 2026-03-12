/**
 * CrystallineSkeleton — Shimmer loading placeholders
 * Royal Depth base with Ice Wing highlight sweep
 * No spinners — cinematic shimmer only (per Gemini 3.1 Pro)
 */
import styled, { keyframes } from 'styled-components';

const shimmer = keyframes`
  0% { background-position: -1000px 0; }
  100% { background-position: 1000px 0; }
`;

export const CrystallineSkeleton = styled.div`
  background: #003080; /* Royal Depth */
  background-image: linear-gradient(
    90deg,
    rgba(0, 48, 128, 1) 0px,
    rgba(96, 192, 240, 0.05) 50%,
    rgba(0, 48, 128, 1) 100%
  );
  background-size: 1000px 100%;
  animation: ${shimmer} 2.5s infinite linear;
  border-radius: 12px;
  border: 1px solid rgba(224, 236, 244, 0.05);

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    background-image: none;
  }
`;

export const SkeletonText = styled(CrystallineSkeleton)`
  height: 16px;
  border-radius: 4px;
  margin-bottom: 8px;

  &:last-child {
    width: 60%;
  }
`;

export const SkeletonImage = styled(CrystallineSkeleton)`
  width: 100%;
  aspect-ratio: 4 / 3;
  border-radius: 12px;
`;
