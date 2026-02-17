// src/components/Header/NotificationSection.tsx
import React, { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { Link } from 'react-router-dom';

// Swan primitives
import {
  Avatar,
  Chip,
  ClickAwayListener,
  Divider,
  Grid,
  Paper,
  Popper,
  Typography,
  Box,
  Button,
  Stack,
  CardActions,
  TextField,
} from '../ui/primitives/components';
import { useMediaQuery, BREAKPOINT_VALUES } from '../../styles/mui-replacements';

// project imports
import MainCard from '../ui/MainCard';
import Transitions from '../ui/Transitions';

// assets
import { IconBell } from '@tabler/icons-react';
import NotificationList from './NotificationList';

// notification status options
const status = [
  { value: 'all', label: 'All Notification' },
  { value: 'new', label: 'New' },
  { value: 'unread', label: 'Unread' },
  { value: 'other', label: 'Other' },
];

const NotificationBadge = styled(Avatar)`
  transition: all 0.2s ease-in-out;
  cursor: pointer;
  background: rgba(120, 81, 169, 0.15);
  color: #7851A9;

  &:hover {
    background: #7851A9;
    color: rgba(120, 81, 169, 0.15);
  }
`;

const NotificationScrollableContent = styled(Box)`
  height: 100%;
  max-height: calc(100vh - 205px);
  overflow-x: hidden;
  &::-webkit-scrollbar {
    width: 5px;
  }
`;

const NotificationSection: React.FC = () => {
  const downMD = useMediaQuery(`(max-width: ${BREAKPOINT_VALUES.md - 1}px)`);

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
      <Box style={{ marginLeft: 16 }}>
        <NotificationBadge
          variant="rounded"
          ref={anchorRef}
          aria-controls={open ? 'menu-list-grow' : undefined}
          aria-haspopup="true"
          onClick={handleToggle}
        >
          <IconBell stroke={1.5} size="20px" />
        </NotificationBadge>
      </Box>
      <Popper
        placement={downMD ? 'bottom' : 'bottom-end'}
        open={open}
        anchorEl={anchorRef.current}
        modifiers={[{ name: 'offset', options: { offset: [downMD ? 5 : 0, 20] } }]}
      >
        {({ TransitionProps }: any) => (
          <ClickAwayListener onClickAway={handleClose}>
            <Transitions position={downMD ? 'top' : 'top-right'} in={open} {...TransitionProps}>
              <Paper>
                {open && (
                  <MainCard
                    border={false}
                    elevation={16}
                    content={false}
                    boxShadow="0 16px 48px rgba(0, 0, 0, 0.3)"
                  >
                    <Grid container style={{ flexDirection: 'column' }} spacing={2}>
                      <Grid item xs={12}>
                        <Grid container style={{ alignItems: 'center', justifyContent: 'space-between', padding: '16px 16px 0' }}>
                          <Grid item>
                            <Stack direction="row" spacing={2}>
                              <Typography variant="subtitle1">All Notification</Typography>
                              <Chip
                                size="small"
                                label="01"
                                color="warning"
                              />
                            </Stack>
                          </Grid>
                          <Grid item>
                            <Typography
                              component={Link}
                              to="#"
                              variant="subtitle2"
                              style={{ color: '#00FFFF' }}
                            >
                              Mark as all read
                            </Typography>
                          </Grid>
                        </Grid>
                      </Grid>
                      <Grid item xs={12}>
                        <NotificationScrollableContent>
                          <Grid container style={{ flexDirection: 'column' }} spacing={2}>
                            <Grid item xs={12}>
                              <Box style={{ padding: '2px 16px' }}>
                                <TextField
                                  id="outlined-select-currency-native"
                                  value={value}
                                  onChange={handleChange}
                                  placeholder="Filter notifications"
                                  style={{ width: '100%' }}
                                />
                              </Box>
                            </Grid>
                            <Grid item xs={12} style={{ padding: 0 }}>
                              <Divider />
                            </Grid>
                          </Grid>
                          <NotificationList />
                        </NotificationScrollableContent>
                      </Grid>
                    </Grid>
                    <CardActions style={{ padding: 10, justifyContent: 'center' }}>
                      <Button size="small">
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
