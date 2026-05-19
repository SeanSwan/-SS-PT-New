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

interface HeaderAvatarProps extends React.ComponentProps<typeof Avatar> {
  children: React.ReactNode;
}

const SearchAvatar = styled(Avatar)`
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  background: var(--accent-secondary-15, rgba(139, 92, 246, 0.15));
  color: var(--accent-secondary, #8B5CF6);

  &:hover {
    background: var(--accent-secondary, #8B5CF6);
    color: var(--bg-base, #030712);
  }
`;

const SearchInputMobile = styled(OutlinedInput)`
  width: 100%;
  margin-left: 4px;
  padding: 0 16px;
  background: var(--bg-elevated, #002060);

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

const AdornmentGap = styled(Box)`
  margin-left: 16px;
`;

const CloseAvatar = styled(Avatar)`
  background: color-mix(in srgb, var(--warning-accent, #F59E0B) 15%, transparent);
  color: var(--warning-accent, #F59E0B);
  cursor: pointer;
`;

const MobileAnchorBox = styled(Box)`
  margin-left: 16px;
`;

const MobileSearchCard = styled(Card)`
  background: var(--bg-elevated, #002060);
  border: 0;
  box-shadow: none;
  width: 95vw;
`;

const HeaderSearchPopper = styled(Popper)`
  z-index: var(--z-dropdown, 1700);
`;

const MobileSearchContent = styled(Box)`
  padding: 16px;
`;

const MobileSearchGrid = styled(Grid)`
  align-items: center;
  justify-content: space-between;
`;

const MobileSearchGridItem = styled(Grid)`
  flex: 1;
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
HeaderAvatarComponent.displayName = 'HeaderAvatarComponent';

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
          <AdornmentGap>
            <CloseAvatar variant="rounded" onClick={onClose}>
              <IconX stroke={1.5} size="20px" />
            </CloseAvatar>
          </AdornmentGap>
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
        <MobileAnchorBox ref={anchorRef}>
          <HeaderAvatarComponent onClick={() => setMobileOpen(!mobileOpen)}>
            <IconSearch stroke={1.5} size="19.2px" />
          </HeaderAvatarComponent>
        </MobileAnchorBox>
        <HeaderSearchPopper
          open={mobileOpen}
          anchorEl={anchorRef.current}
          placement="bottom-start"
        >
          {() => (
            <Transitions type="zoom" in={mobileOpen}>
              <MobileSearchCard>
                <MobileSearchContent>
                  <MobileSearchGrid container>
                    <MobileSearchGridItem item>
                      <MobileSearch value={value} setValue={setValue} onClose={() => setMobileOpen(false)} />
                    </MobileSearchGridItem>
                  </MobileSearchGrid>
                </MobileSearchContent>
              </MobileSearchCard>
            </Transitions>
          )}
        </HeaderSearchPopper>
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
