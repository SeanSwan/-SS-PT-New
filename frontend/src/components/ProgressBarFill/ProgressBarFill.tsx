import styled from "styled-components";
import { motion } from "framer-motion";

// A styled motion div component for animated progress bar fills
const ProgressBarFill = styled(motion.div)<{ $progress: number }>`
  height: 100%;
  background: linear-gradient(90deg, var(--primary-color) 0%, var(--secondary-color) 100%);
  border-radius: 5px;
  width: ${({ $progress }) => `${$progress}%`};
`;

export default ProgressBarFill;