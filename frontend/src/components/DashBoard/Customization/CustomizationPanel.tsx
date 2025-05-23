import React, { useState } from 'react';
import styled from 'styled-components';

// material-ui
import { useTheme } from '@mui/material/styles';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import Fab from '@mui/material/Fab';
import Grid from '@mui/material/Grid2';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';

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
  box-shadow: ${({ theme }) => theme.shadows[4]};
`;

const CustomizationPanel: React.FC = () => {
  const theme = useTheme();

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
            color="secondary"
          >
            <AnimateButton type="rotate">
              <IconButton color="inherit" size="large" disableRipple aria-label="live customize">
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
            <Grid size={12}>
              {/* font family */}
              <FontFamily />
              <Divider />
            </Grid>
            <Grid size={12}>
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