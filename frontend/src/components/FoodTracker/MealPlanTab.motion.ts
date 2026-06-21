type MotionValue = number | string;
type MotionTarget = Record<string, MotionValue>;

interface ButtonMotionProps {
  whileHover?: MotionTarget;
  whileTap?: MotionTarget;
}

interface PanelMotionProps {
  initial?: MotionTarget;
  animate?: MotionTarget;
  exit?: MotionTarget;
}

const NO_MOTION = {};

export const buttonMotion = (reduceMotion: boolean): ButtonMotionProps =>
  reduceMotion ? NO_MOTION : {
    whileHover: { scale: 1.02 },
    whileTap: { scale: 0.98 },
  };

export const fadeSlideMotion = (reduceMotion: boolean): PanelMotionProps =>
  reduceMotion ? NO_MOTION : {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0 },
  };

export const expandMotion = (reduceMotion: boolean): PanelMotionProps =>
  reduceMotion ? NO_MOTION : {
    initial: { height: 0, opacity: 0 },
    animate: { height: 'auto', opacity: 1 },
    exit: { height: 0, opacity: 0 },
  };
