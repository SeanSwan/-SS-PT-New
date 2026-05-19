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

const NotificationBadge = styled(Avatar)`
  transition: all 0.2s ease-in-out;
  cursor: pointer;
  background: var(--accent-secondary-15, rgba(139, 92, 246, 0.15));
  color: var(--accent-secondary, #8B5CF6);

  &:hover {
    background: var(--accent-secondary, #8B5CF6);
    color: var(--bg-surface, #0A0A0F);
  }
`;

const NotificationTriggerShell = styled(Box)`
  margin-left: 16px;
`;

const ColumnGrid = styled(Grid)`
  flex-direction: column;
`;

const HeaderGrid = styled(Grid)`
  align-items: center;
  justify-content: space-between;
  padding: 16px 16px 0;
`;

const MarkReadLink = styled(Link)`
  color: var(--accent-secondary, #8B5CF6);
  font-size: 0.875rem;
  font-weight: 600;
  text-decoration: none;

  &:hover,
  &:focus-visible {
    color: var(--accent-primary, #60C0F0);
    text-decoration: underline;
    outline: none;
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

const SearchShell = styled(Box)`
  padding: 2px 16px;
`;

const FullWidthTextField = styled(TextField)`
  width: 100%;
`;

const DividerGrid = styled(Grid)`
  padding: 0;
`;

const FooterActions = styled(CardActions)`
  padding: 10px;
  justify-content: center;
`;

const HeaderNotificationPopper = styled(Popper)`
  z-index: var(--z-dropdown, 1700);
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
      <NotificationTriggerShell>
        <NotificationBadge
          variant="rounded"
          ref={anchorRef}
          aria-controls={open ? 'menu-list-grow' : undefined}
          aria-haspopup="true"
          onClick={handleToggle}
        >
          <IconBell stroke={1.5} size="20px" />
        </NotificationBadge>
      </NotificationTriggerShell>
      <HeaderNotificationPopper
        placement={downMD ? 'bottom' : 'bottom-end'}
        open={open}
        anchorEl={anchorRef.current}
        modifiers={[{ name: 'offset', options: { offset: [downMD ? 5 : 0, 20] } }]}
      >
        {({ TransitionProps }: { TransitionProps: React.HTMLAttributes<HTMLElement> }) => (
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
                    <ColumnGrid container spacing={2}>
                      <Grid item xs={12}>
                        <HeaderGrid container>
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
                            <MarkReadLink to="#">
                              Mark as all read
                            </MarkReadLink>
                          </Grid>
                        </HeaderGrid>
                      </Grid>
                      <Grid item xs={12}>
                        <NotificationScrollableContent>
                          <ColumnGrid container spacing={2}>
                            <Grid item xs={12}>
                              <SearchShell>
                                <FullWidthTextField
                                  id="outlined-select-currency-native"
                                  value={value}
                                  onChange={handleChange}
                                  placeholder="Filter notifications"
                                />
                              </SearchShell>
                            </Grid>
                            <DividerGrid item xs={12}>
                              <Divider />
                            </DividerGrid>
                          </ColumnGrid>
                          <NotificationList />
                        </NotificationScrollableContent>
                      </Grid>
                    </ColumnGrid>
                    <FooterActions>
                      <Button size="small">
                        View All
                      </Button>
                    </FooterActions>
                  </MainCard>
                )}
              </Paper>
            </Transitions>
          </ClickAwayListener>
        )}
      </HeaderNotificationPopper>
    </>
  );
};

export default NotificationSection;
