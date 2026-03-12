/**
 * VaultDrawer — Luxury bottom drawer for Print-on-Demand checkout
 * Royal Depth background · Gilded Fern border · 24px radius top corners
 * Performance: blur limited to 16px (8px on mobile per AI Village guidance)
 */
import styled from 'styled-components';
import { motion } from 'framer-motion';

export const VaultDrawer = styled(motion.div)`
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100%;
  max-height: 85vh;
  overflow-y: auto;
  background: linear-gradient(180deg, rgba(0, 48, 128, 0.95) 0%, rgba(0, 32, 96, 1) 100%);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-top: 1px solid rgba(198, 168, 75, 0.3); /* Gilded Fern */
  box-shadow: 0 -20px 40px rgba(0, 32, 96, 0.8);
  border-radius: 24px 24px 0 0;
  padding: 32px 24px;
  z-index: 100;

  @media (max-width: 430px) {
    padding: 24px 16px;
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
  }

  @supports not (backdrop-filter: blur(16px)) {
    background: rgba(0, 32, 96, 0.98);
  }
`;
