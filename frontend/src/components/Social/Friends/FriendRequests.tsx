import React from 'react';
import { AlertCircle, Clock, UserCheck, UserX, X } from 'lucide-react';
import type { SocialFriendsApi } from '../../../hooks/social/useSocialFriends';
import { cssUrlValue, sanitizeImageUrl } from '../../../utils/imageUrl';
import CustomModal from '../../UniversalMasterSchedule/ui/CustomModal';
import {
  AcceptBtn,
  ActionButtons,
  Avatar,
  CloseBtn,
  CloseButton,
  Content,
  DeclineBtn,
  Divider,
  EmptyState,
  EmptyText,
  EmptyTitle,
  FooterRow,
  HeaderTitle,
  ModalHeader,
  RequestInfo,
  RequestItem,
  RequestList,
  RequestDate,
  RequestName,
  SkeletonBlock,
  SkeletonRow,
  SkeletonTextStack,
} from './FriendRequests.styles';

interface FriendRequestsProps {
  open: boolean;
  onClose: () => void;
  friendsApi: SocialFriendsApi;
}

type FriendRequestItem = SocialFriendsApi['friendRequests'][number];

type FriendRequestRowProps = {
  isLast: boolean;
  request: FriendRequestItem;
  onAccept: (requestId: string) => void;
  onDecline: (requestId: string) => void;
};

function RequestAvatar({ requester }: { requester: FriendRequestItem['requester'] }) {
  const safePhoto = sanitizeImageUrl(requester.photo || undefined);
  const avatarImage = safePhoto ? cssUrlValue(safePhoto) : null;

  return (
    <Avatar $backgroundImage={avatarImage}>
      {!safePhoto && (`${requester.firstName?.[0] ?? ''}${requester.lastName?.[0] ?? ''}` || '?')}
    </Avatar>
  );
}

function RequestDivider({ isLast }: { isLast: boolean }) {
  if (isLast) return null;
  return <Divider />;
}

function FriendRequestRow({ isLast, request, onAccept, onDecline }: FriendRequestRowProps) {
  const { requester } = request;
  const fullName = `${requester.firstName} ${requester.lastName}`;

  return (
    <React.Fragment>
      <RequestItem>
        <RequestAvatar requester={requester} />
        <RequestInfo>
          <RequestName>{fullName}</RequestName>
          <RequestDate>
            <Clock size={14} />
            {new Date(request.createdAt).toLocaleDateString()}
          </RequestDate>
        </RequestInfo>
        <ActionButtons>
          <AcceptBtn onClick={() => onAccept(request.id)}>
            <UserCheck size={16} /> Accept
          </AcceptBtn>
          <DeclineBtn onClick={() => onDecline(request.id)}>
            <UserX size={16} /> Decline
          </DeclineBtn>
        </ActionButtons>
      </RequestItem>
      <RequestDivider isLast={isLast} />
    </React.Fragment>
  );
}

/**
 * FriendRequests Component
 * Displays incoming friend requests with accept/decline options.
 */
const FriendRequests: React.FC<FriendRequestsProps> = ({ open, onClose, friendsApi }) => {
  const {
    friendRequests,
    isLoadingRequests,
    acceptFriendRequest,
    declineFriendRequest,
  } = friendsApi;

  const renderLoadingRows = () => (
    <RequestList>
      {[1, 2, 3].map((item) => (
        <SkeletonRow key={item}>
          <SkeletonBlock $width="44px" $height="44px" $borderRadius="50%" />
          <SkeletonTextStack>
            <SkeletonBlock $width="120px" $height="18px" />
            <SkeletonBlock $width="80px" $height="14px" />
          </SkeletonTextStack>
          <SkeletonBlock $width="160px" $height="36px" $borderRadius="6px" />
        </SkeletonRow>
      ))}
    </RequestList>
  );

  return (
    <CustomModal isOpen={open} onClose={onClose} title="" size="md">
      <ModalHeader>
        <UserCheck size={20} />
        <HeaderTitle>Friend Requests</HeaderTitle>
        <CloseBtn onClick={onClose} aria-label="Close friend requests">
          <X size={18} />
        </CloseBtn>
      </ModalHeader>
      <Content>
        {isLoadingRequests ? (
          renderLoadingRows()
        ) : friendRequests.length > 0 ? (
          <RequestList>
            {friendRequests.map((request, index) => (
              <FriendRequestRow
                key={request.id}
                request={request}
                isLast={index === friendRequests.length - 1}
                onAccept={acceptFriendRequest}
                onDecline={declineFriendRequest}
              />
            ))}
          </RequestList>
        ) : (
          <EmptyState>
            <AlertCircle size={48} />
            <EmptyTitle>No pending requests</EmptyTitle>
            <EmptyText>When someone sends you a friend request, you&apos;ll see it here</EmptyText>
          </EmptyState>
        )}

        <FooterRow>
          <CloseButton onClick={onClose}>Close</CloseButton>
        </FooterRow>
      </Content>
    </CustomModal>
  );
};

export default FriendRequests;
