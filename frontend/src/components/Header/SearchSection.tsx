// src/components/Header/SearchSection.tsx
import React, { forwardRef, useRef, useState } from 'react';
import styled from 'styled-components';

// Swan primitives
import {
  Avatar,
  Card,
  Grid,
  InputAdornment,
  OutlinedInput,
  Popper,
  Box,
} from '../ui/primitives/components';
import { BREAKPOINT_VALUES } from '../../styles/mui-replacements';

// project imports
import Transitions from '../ui/Transitions';

// assets
import { IconAdjustmentsHorizontal, IconSearch, IconX } from '@tabler/icons-react';

interface HeaderAvatarProps {
  children: React.ReactNode;
  [key: string]: any;
}

const SearchAvatar = styled(Avatar)`
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  background: rgba(120, 81, 169, 0.15);
  color: #7851A9;

  &:hover {
    background: #7851A9;
    color: rgba(120, 81, 169, 0.15);
  }
`;

const SearchInputMobile = styled(OutlinedInput)`
  width: 100%;
  margin-left: 4px;
  padding: 0 16px;
  background: #0a0a1a;

  & input {
    background: transparent;
    padding-left: 4px;
  }
`;

const SearchInputDesktop = styled(OutlinedInput)`
  width: 250px;
  margin-left: 16px;
  padding: 0 16px;

  @media (min-width: ${BREAKPOINT_VALUES.xl}px) {
    width: 434px;
  }

  & input {
    background: transparent;
    padding-left: 4px;
  }
`;

const MobileSearchBox = styled(Box)`
  display: block;
  @media (min-width: ${BREAKPOINT_VALUES.md}px) {
    display: none;
  }
`;

const DesktopSearchBox = styled(Box)`
  display: none;
  @media (min-width: ${BREAKPOINT_VALUES.md}px) {
    display: block;
  }
`;

const HeaderAvatarComponent = forwardRef<HTMLDivElement, HeaderAvatarProps>(
  ({ children, ...others }, ref) => {
    return (
      <SearchAvatar
        ref={ref}
        variant="rounded"
        {...others}
      >
        {children}
      </SearchAvatar>
    );
  }
);

// Mobile search component
function MobileSearch({ value, setValue, onClose }: {
  value: string,
  setValue: React.Dispatch<React.SetStateAction<string>>,
  onClose: () => void
}) {
  return (
    <SearchInputMobile
      id="input-search-header"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      placeholder="Search"
      startAdornment={
        <InputAdornment position="start">
          <IconSearch stroke={1.5} size="16px" />
        </InputAdornment>
      }
      endAdornment={
        <InputAdornment position="end">
          <HeaderAvatarComponent>
            <IconAdjustmentsHorizontal stroke={1.5} size="20px" />
          </HeaderAvatarComponent>
          <Box style={{ marginLeft: 16 }}>
            <Avatar
              variant="rounded"
              style={{
                background: 'rgba(255, 152, 0, 0.15)',
                color: '#ff9800',
                cursor: 'pointer',
              }}
              onClick={onClose}
            >
              <IconX stroke={1.5} size="20px" />
            </Avatar>
          </Box>
        </InputAdornment>
      }
      aria-describedby="search-helper-text"
    />
  );
}

const SearchSection: React.FC = () => {
  const [value, setValue] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);

  return (
    <>
      <MobileSearchBox>
        <Box style={{ marginLeft: 16 }} ref={anchorRef}>
          <HeaderAvatarComponent onClick={() => setMobileOpen(!mobileOpen)}>
            <IconSearch stroke={1.5} size="19.2px" />
          </HeaderAvatarComponent>
        </Box>
        <Popper
          open={mobileOpen}
          anchorEl={anchorRef.current}
          placement="bottom-start"
        >
          {() => (
            <Transitions type="zoom" in={mobileOpen}>
              <Card style={{ background: '#0a0a1a', border: 0, boxShadow: 'none', width: '95vw' }}>
                <Box style={{ padding: 16 }}>
                  <Grid container style={{ alignItems: 'center', justifyContent: 'space-between' }}>
                    <Grid item style={{ flex: 1 }}>
                      <MobileSearch value={value} setValue={setValue} onClose={() => setMobileOpen(false)} />
                    </Grid>
                  </Grid>
                </Box>
              </Card>
            </Transitions>
          )}
        </Popper>
      </MobileSearchBox>
      <DesktopSearchBox>
        <SearchInputDesktop
          id="input-search-header"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Search"
          startAdornment={
            <InputAdornment position="start">
              <IconSearch stroke={1.5} size="16px" />
            </InputAdornment>
          }
          endAdornment={
            <InputAdornment position="end">
              <HeaderAvatarComponent>
                <IconAdjustmentsHorizontal stroke={1.5} size="20px" />
              </HeaderAvatarComponent>
            </InputAdornment>
          }
          aria-describedby="search-helper-text"
        />
      </DesktopSearchBox>
    </>
  );
};

export default SearchSection;
