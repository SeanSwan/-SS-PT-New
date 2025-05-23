// src/components/Header/NotificationSection.tsx
import React, { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { Link } from 'react-router-dom';

// material-ui
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import Avatar from '@mui/material/Avatar';
import Chip from '@mui/material/Chip';
import ClickAwayListener from '@mui/material/ClickAwayListener';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid2';
import Paper from '@mui/material/Paper';
import Popper from '@mui/material/Popper';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack'; // Add missing import
import CardActions from '@mui/material/CardActions'; // Add missing import
import TextField from '@mui/material/TextField';

// project imports
import MainCard from '../ui/MainCard';
import Transitions from '../ui/Transitions';

// assets
import { IconBell } from '@tabler/icons-react';
import NotificationList from './NotificationList';

// notification status options
const status = [
  {
    value: 'all',
    label: 'All Notification'
  },
  {
    value: 'new',
    label: 'New'
  },
  {
    value: 'unread',
    label: 'Unread'
  },
  {
    value: 'other',
    label: 'Other'
  }
];

const NotificationBadge = styled(Avatar)`
  transition: all 0.2s ease-in-out;
  cursor: pointer;
  
  &:hover {
    background-color: ${({ theme }) => theme.palette?.secondary?.dark || '#1565c0'};
    color: ${({ theme }) => theme.palette?.secondary?.light || '#90caf9'};
  }
`;

// Fix the Popper by using an sx prop instead of styled-components with a custom prop
const NotificationScrollableContent = styled(Box)`
  height: 100%;
  max-height: calc(100vh - 205px);
  overflow-x: hidden;
  &::-webkit-scrollbar {
    width: 5px;
  }
`;

const NotificationSection: React.FC = () => {
  const theme = useTheme();
  const downMD = useMediaQuery(theme.breakpoints.down('md'));

  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');

  const anchorRef = useRef<HTMLDivElement>(null);

  const handleToggle = () => {
    setOpen((prevOpen) => !prevOpen);
  };

  const handleClose = (event: Event | React.SyntheticEvent) => {
    if (anchorRef.current && anchorRef.current.contains(event.target as Node)) {
      return;
    }
    setOpen(false);
  };

  const prevOpen = useRef(open);
  useEffect(() => {
    if (prevOpen.current === true && open === false) {
      if (anchorRef.current) {
        anchorRef.current.focus();
      }
    }
    prevOpen.current = open;
  }, [open]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event?.target.value) {
      setValue(event.target.value);
    }
  };

  return (
    <>
      <Box sx={{ ml: 2 }}>
        <NotificationBadge
          variant="rounded"
          sx={{
            backgroundColor: 'secondary.light',
            color: 'secondary.dark',
            '&[aria-controls="menu-list-grow"],&:hover': {
              backgroundColor: 'secondary.dark',
              color: 'secondary.light'
            }
          }}
          ref={anchorRef}
          aria-controls={open ? 'menu-list-grow' : undefined}
          aria-haspopup="true"
          onClick={handleToggle}
          color="inherit"
        >
          <IconBell stroke={1.5} size="20px" />
        </NotificationBadge>
      </Box>
      <Popper
        placement={downMD ? 'bottom' : 'bottom-end'}
        open={open}
        anchorEl={anchorRef.current}
        role={undefined}
        transition
        disablePortal
        sx={{
          zIndex: 1200,
          width: downMD ? '100%' : '360px',
          maxWidth: downMD ? 'calc(100vw - 40px)' : '360px'
        }}
        modifiers={[
          {
            name: 'offset',
            options: {
              offset: [downMD ? 5 : 0, 20]
            }
          }
        ]}
      >
        {({ TransitionProps }) => (
          <ClickAwayListener onClickAway={handleClose}>
            <Transitions position={downMD ? 'top' : 'top-right'} in={open} {...TransitionProps}>
              <Paper>
                {open && (
                  <MainCard 
                    border={false} 
                    elevation={16} 
                    content={false} 
                    boxShadow // Fixed: Changed from string to boolean
                    sx={{ boxShadow: theme.shadows[16] }} // Add shadow through sx prop
                  >
                    <Grid container direction="column" spacing={2}>
                      <Grid size={12}>
                        <Grid container sx={{ alignItems: 'center', justifyContent: 'space-between', pt: 2, px: 2 }}>
                          <Grid>
                            <Stack direction="row" spacing={2}>
                              <Typography variant="subtitle1">All Notification</Typography>
                              <Chip size="small" label="01" sx={{ color: 'background.default', bgcolor: 'warning.dark' }} />
                            </Stack>
                          </Grid>
                          <Grid>
                            <Typography component={Link} to="#" variant="subtitle2" color="primary">
                              Mark as all read
                            </Typography>
                          </Grid>
                        </Grid>
                      </Grid>
                      <Grid size={12}>
                        <NotificationScrollableContent>
                          <Grid container direction="column" spacing={2}>
                            <Grid size={12}>
                              <Box sx={{ px: 2, pt: 0.25 }}>
                                <TextField
                                  id="outlined-select-currency-native"
                                  select
                                  fullWidth
                                  value={value}
                                  onChange={handleChange}
                                  SelectProps={{ native: true }}
                                >
                                  {status.map((option) => (
                                    <option key={option.value} value={option.value}>
                                      {option.label}
                                    </option>
                                  ))}
                                </TextField>
                              </Box>
                            </Grid>
                            <Grid size={12} sx={{ p: 0 }}>
                              <Divider sx={{ my: 0 }} />
                            </Grid>
                          </Grid>
                          <NotificationList />
                        </NotificationScrollableContent>
                      </Grid>
                    </Grid>
                    <CardActions sx={{ p: 1.25, justifyContent: 'center' }}>
                      <Button size="small" disableElevation>
                        View All
                      </Button>
                    </CardActions>
                  </MainCard>
                )}
              </Paper>
            </Transitions>
          </ClickAwayListener>
        )}
      </Popper>
    </>
  );
};

export default NotificationSection;