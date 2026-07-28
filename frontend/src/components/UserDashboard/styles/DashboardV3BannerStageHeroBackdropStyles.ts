import styled from 'styled-components';
import { BannerStageImage, BannerStageVideo } from './DashboardV3BannerStageStyles';

export const BannerStageHeroBackdrop = styled.div`
  position: absolute;
  inset: -28px;
  z-index: 0;
  opacity: 0.42;
  filter: blur(24px) saturate(1.25) brightness(0.82);
  transform: scale(1.08);
  pointer-events: none;

  ${BannerStageImage},
  ${BannerStageVideo} {
    object-fit: cover;
  }

  @media (prefers-reduced-motion: reduce) {
    filter: blur(18px) saturate(1.12) brightness(0.82);
    transform: none;
  }
`;