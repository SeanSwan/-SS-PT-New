// src/components/Header/NotificationList.tsx
import React from 'react';
import styled from 'styled-components';

// Swan primitives
import {
  Avatar,
  Box,
  Card,
  Chip,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Stack,
  Typography,
} from '../ui/primitives';
import { alpha } from '../../styles/mui-replacements';

// assets
import { IconBrandTelegram, IconBuildingStore, IconMailbox, IconPhoto } from '@tabler/icons-react';
import User1 from '../../assets/users/user-round.svg';

interface ListItemWrapperProps {
  children: React.ReactNode;
}

const ListWrapper = styled.div`
  padding: 16px;
  border-bottom: 1px solid ${alpha('#FFFFFF', 0.08)};
  cursor: pointer;

  &:hover {
    background-color: ${alpha('#FFFFFF', 0.05)};
  }
`;

function ListItemWrapper({ children }: ListItemWrapperProps) {
  return <ListWrapper>{children}</ListWrapper>;
}

const ContentWrapper = styled.div`
  padding-left: 56px;
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const NotificationList: React.FC = () => {
  return (
    <List disablePadding style={{ width: '100%', maxWidth: 330 }}>
      <ListItemWrapper>
        <ListItem
          style={{ alignItems: 'center', padding: 0 }}
          secondaryAction={
            <Stack direction="row" style={{ alignItems: 'center', justifyContent: 'flex-end' }}>
              <Typography variant="caption">2 min ago</Typography>
            </Stack>
          }
        >
          <ListItemAvatar>
            <Avatar src={User1} alt="John Doe" />
          </ListItemAvatar>
          <ListItemText primary="John Doe" />
        </ListItem>
        <ContentWrapper>
          <Typography variant="subtitle2">It is a long established fact that a reader will be distracted</Typography>
          <Stack direction="row" spacing={1} style={{ alignItems: 'center' }}>
            <Chip label="Unread" color="#ef4444" size="small" />
            <Chip label="New" color="#f59e0b" size="small" />
          </Stack>
        </ContentWrapper>
      </ListItemWrapper>

      {/* Add the rest of the list items here... */}
    </List>
  );
};

export default NotificationList;
