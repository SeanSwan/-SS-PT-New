// src/components/ui/Transitions.tsx
import React, { forwardRef } from 'react';

// material-ui
import { Collapse, Fade, Box, Grow, Slide, Zoom } from '@mui/material';

// types
interface TransitionsProps {
  children: React.ReactNode;
  type?: 'grow' | 'fade' | 'collapse' | 'slide' | 'zoom';
  position?: 'top-left' | 'top-right' | 'top' | 'bottom-left' | 'bottom-right' | 'bottom';
  direction?: 'up' | 'down' | 'left' | 'right';
  in?: boolean;
  sx?: any;
  [key: string]: any;
}

// ==============================|| TRANSITIONS ||============================== //

const Transitions = forwardRef<HTMLDivElement, TransitionsProps>(
  ({ children, position = 'top-left', type = 'grow', direction = 'up', ...others }, ref) => {
    let positionSX = {
      transformOrigin: '0 0 0'
    };

    switch (position) {
      case 'top-right':
        positionSX = {
          transformOrigin: 'top right'
        };
        break;
      case 'top':
        positionSX = {
          transformOrigin: 'top'
        };
        break;
      case 'bottom-left':
        positionSX = {
          transformOrigin: 'bottom left'
        };
        break;
      case 'bottom-right':
        positionSX = {
          transformOrigin: 'bottom right'
        };
        break;
      case 'bottom':
        positionSX = {
          transformOrigin: 'bottom'
        };
        break;
      case 'top-left':
      default:
        positionSX = {
          transformOrigin: '0 0 0'
        };
        break;
    }

    return (
      <Box ref={ref}>
        {type === 'grow' && (
          <Grow {...others}>
            <Box sx={positionSX}>{children}</Box>
          </Grow>
        )}
        {type === 'collapse' && (
          <Collapse {...others} sx={positionSX}>
            {children}
          </Collapse>
        )}
        {type === 'fade' && (
          <Fade
            {...others}
            timeout={{
              appear: 500,
              enter: 600,
              exit: 400
            }}
          >
            <Box sx={positionSX}>{children}</Box>
          </Fade>
        )}
        {type === 'slide' && (
          <Slide
            {...others}
            timeout={{
              appear: 0,
              enter: 400,
              exit: 200
            }}
            direction={direction}
          >
            <Box sx={positionSX}>{children}</Box>
          </Slide>
        )}
        {type === 'zoom' && (
          <Zoom {...others}>
            <Box sx={positionSX}>{children}</Box>
          </Zoom>
        )}
      </Box>
    );
  }
);

export default Transitions;