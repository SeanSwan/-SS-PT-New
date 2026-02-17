import React, { useState } from 'react';
import styled from 'styled-components';

// Swan primitives
import { Divider, Drawer, Fab, Grid, IconButton, Tooltip } from '../../ui/primitives';

// third party
import PerfectScrollbar from 'react-perfect-scrollbar';

// project imports
import FontFamily from './FontFamily';
import BorderRadius from './BorderRadius';
import AnimateButton from '../../ui/AnimateButton';

// assets
import { IconSettings } from '@tabler/icons-react';

// Styled components
const CustomizeFab = styled(Fab)`
  border-radius: 0;
  border-top-left-radius: 50%;
  border-bottom-left-radius: 50%;
  border-top-right-radius: 50%;
  border-bottom-right-radius: 4px;
  top: 25%;
  position: fixed;
  right: 10px;
  z-index: 1200;
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
`;

const CustomizationPanel: React.FC = () => {
  // drawer on/off
  const [open, setOpen] = useState(false);
  const handleToggle = () => {
    setOpen(!open);
  };

  return (
    <>
      {/* toggle button */}
      <Tooltip title="Live Customize">
        <div>
          <CustomizeFab
            onClick={handleToggle}
            size="medium"
            color="#7851A9"
          >
            <AnimateButton type="rotate">
              <IconButton color="inherit" size="large" aria-label="live customize">
                <IconSettings />
              </IconButton>
            </AnimateButton>
          </CustomizeFab>
        </div>
      </Tooltip>
      <Drawer
        anchor="right"
        onClose={handleToggle}
        open={open}
        PaperProps={{ sx: { width: 280 } }}
      >
        <PerfectScrollbar>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              {/* font family */}
              <FontFamily />
              <Divider />
            </Grid>
            <Grid item xs={12}>
              {/* border radius */}
              <BorderRadius />
              <Divider />
            </Grid>
          </Grid>
        </PerfectScrollbar>
      </Drawer>
    </>
  );
};

export default CustomizationPanel;
