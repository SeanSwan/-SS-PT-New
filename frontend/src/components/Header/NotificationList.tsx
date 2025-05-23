// src/components/Header/NotificationList.tsx
import React from 'react';
import styled from 'styled-components';

// material-ui
import { alpha, useTheme } from '@mui/material/styles';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemText from '@mui/material/ListItemText';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

// assets
import { IconBrandTelegram, IconBuildingStore, IconMailbox, IconPhoto } from '@tabler/icons-react';
import User1 from '../../assets/users/user-round.svg';

interface ListItemWrapperProps {
  children: React.ReactNode;
}

const ListWrapper = styled(Box)`
  padding: 16px;
  border-bottom: 1px solid ${({ theme }) => theme.divider};
  cursor: pointer;
  
  &:hover {
    background-color: ${({ theme }) => alpha(theme.palette.grey[200], 0.3)};
  }
`;

function ListItemWrapper({ children }: ListItemWrapperProps) {
  return <ListWrapper>{children}</ListWrapper>;
}

const ContentWrapper = styled(Stack)`
  padding-left: 56px;
`;

const NotificationList: React.FC = () => {
  return (
    <List sx={{ width: '100%', maxWidth: { xs: 300, md: 330 }, py: 0 }}>
      <ListItemWrapper>
        <ListItem
          alignItems="center"
          disablePadding
          secondaryAction={
            <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'flex-end' }}>
              <Typography variant="caption">2 min ago</Typography>
            </Stack>
          }
        >
          <ListItemAvatar>
            <Avatar alt="John Doe" src={User1} />
          </ListItemAvatar>
          <ListItemText primary="John Doe" />
        </ListItem>
        <ContentWrapper spacing={2}>
          <Typography variant="subtitle2">It is a long established fact that a reader will be distracted</Typography>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Chip label="Unread" color="error" size="small" sx={{ width: 'min-content' }} />
            <Chip label="New" color="warning" size="small" sx={{ width: 'min-content' }} />
          </Stack>
        </ContentWrapper>
      </ListItemWrapper>
      
      {/* Add the rest of the list items here... */}
    </List>
  );
};

export default NotificationList;