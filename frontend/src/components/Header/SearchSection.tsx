// src/components/Header/SearchSection.tsx
import React, { forwardRef, useState } from 'react';
import styled from 'styled-components';

// material-ui
import { useTheme } from '@mui/material/styles';
import Avatar from '@mui/material/Avatar';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid2';
import InputAdornment from '@mui/material/InputAdornment';
import OutlinedInput from '@mui/material/OutlinedInput';
import Popper from '@mui/material/Popper';
import Box from '@mui/material/Box';

// third party
import PopupState, { bindPopper, bindToggle } from 'material-ui-popup-state';

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
  
  &:hover {
    background-color: ${({ theme }) => theme.palette?.secondary?.dark || '#1565c0'};
    color: ${({ theme }) => theme.palette?.secondary?.light || '#90caf9'};
  }
`;

const SearchInputMobile = styled(OutlinedInput)`
  width: 100%;
  margin-left: 4px;
  padding: 0 16px;
  background-color: ${({ theme }) => theme.palette?.background?.paper || '#ffffff'};
  
  & input {
    background-color: transparent;
    padding-left: 4px;
  }
`;

const SearchInputDesktop = styled(OutlinedInput)`
  width: 250px;
  margin-left: 16px;
  padding: 0 16px;
  
  @media (min-width: 1200px) {
    width: 434px;
  }
  
  & input {
    background-color: transparent;
    padding-left: 4px;
  }
`;

const HeaderAvatarComponent = forwardRef<HTMLDivElement, HeaderAvatarProps>(
  ({ children, ...others }, ref) => {
    const theme = useTheme();

    return (
      <SearchAvatar
        ref={ref}
        variant="rounded"
        sx={{
          backgroundColor: 'secondary.light',
          color: 'secondary.dark',
          '&:hover': {
            backgroundColor: 'secondary.dark',
            color: 'secondary.light'
          }
        }}
        {...others}
      >
        {children}
      </SearchAvatar>
    );
  }
);

// This is used in MobileSearch component
function MobileSearch({ value, setValue, popupState }: { 
  value: string, 
  setValue: React.Dispatch<React.SetStateAction<string>>, 
  popupState: any 
}) {
  const theme = useTheme();

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
          <Box sx={{ ml: 2 }}>
            <Avatar
              variant="rounded"
              sx={{
                bgcolor: 'orange.light',
                color: 'orange.dark',
                '&:hover': {
                  bgcolor: 'orange.dark',
                  color: 'orange.light'
                }
              }}
              {...bindToggle(popupState)}
            >
              <IconX stroke={1.5} size="20px" />
            </Avatar>
          </Box>
        </InputAdornment>
      }
      aria-describedby="search-helper-text"
      inputProps={{ 'aria-label': 'weight' }}
    />
  );
}

const SearchSection: React.FC = () => {
  const [value, setValue] = useState('');

  return (
    <>
      <Box sx={{ display: { xs: 'block', md: 'none' } }}>
        <PopupState variant="popper" popupId="demo-popup-popper">
          {(popupState) => (
            <>
              <Box sx={{ ml: 2 }}>
                <HeaderAvatarComponent {...bindToggle(popupState)}>
                  <IconSearch stroke={1.5} size="19.2px" />
                </HeaderAvatarComponent>
              </Box>
              <Popper
                {...bindPopper(popupState)}
                transition
                sx={{ zIndex: 1100, width: '99%', top: '-55px !important', px: { xs: 1.25, sm: 1.5 } }}
              >
                {({ TransitionProps }) => (
                  <>
                    <Transitions type="zoom" {...TransitionProps} sx={{ transformOrigin: 'center left' }}>
                      <Card sx={{ bgcolor: 'background.default', border: 0, boxShadow: 'none' }}>
                        <Box sx={{ p: 2 }}>
                          <Grid container alignItems="center" justifyContent="space-between">
                            <Grid size="grow">
                              <MobileSearch value={value} setValue={setValue} popupState={popupState} />
                            </Grid>
                          </Grid>
                        </Box>
                      </Card>
                    </Transitions>
                  </>
                )}
              </Popper>
            </>
          )}
        </PopupState>
      </Box>
      <Box sx={{ display: { xs: 'none', md: 'block' } }}>
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
          inputProps={{ 'aria-label': 'weight' }}
        />
      </Box>
    </>
  );
};

export default SearchSection;