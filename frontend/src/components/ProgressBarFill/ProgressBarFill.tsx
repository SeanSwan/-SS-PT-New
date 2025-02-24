import styled from "styled-components";
import { motion } from "framer-motion";

/**
 * ProgressBarFill
 * ----------------
 * A styled motion.div that fills based on the $progress value.
 * The transient prop $progress is used so it does not get passed to the DOM.
 */
const ProgressBarFill = styled(motion.div)<{ $progress: number }>`
  background: var(--primary-color);
  width: ${({ $progress }) => $progress}%;
  height: 100%;
  border-radius: 5px;
`;

export default ProgressBarFill;
