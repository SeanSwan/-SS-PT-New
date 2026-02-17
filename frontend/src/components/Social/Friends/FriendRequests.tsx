import React from 'react';
import styled, { keyframes } from 'styled-components';
import { UserCheck, UserX, Clock, AlertCircle, X } from 'lucide-react';
import { useSocialFriends } from '../../../hooks/social/useSocialFriends';
import CustomModal from '../../UniversalMasterSchedule/ui/CustomModal';

const shimmer = keyframes`
  0% { background-position: -100% 0; }
  100% { background-position: 200% 0; }
`;

const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 20px 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);

  svg { color: rgba(0, 255, 255, 0.8); }
`;

const HeaderTitle = styled.h2`
  font-size: 1.25rem;
  font-weight: 600;
  color: white;
  margin: 0;
  flex: 1;
`;

const CloseBtn = styled.button`
  background: none;
  border: none;
  padding: 8px;
  min-height: 44px;
  min-width: 44px;
  border-radius: 50%;
  color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover { background: rgba(255, 255, 255, 0.1); color: white; }
`;

const Content = styled.div`
  padding: 16px 24px 24px;
`;

const RequestItem = styled.div`
  display: flex;
  align-items: center;
  padding: 12px 0;
  border-radius: 8px;
  transition: background-color 0.2s ease;
`;

const Avatar = styled.div<{ $src?: string }>`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: ${props => props.$src ? `url(${props.$src}) center/cover` : 'rgba(0, 255, 255, 0.2)'};
  color: #00ffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.875rem;
  font-weight: 600;
  flex-shrink: 0;
  margin-right: 12px;
`;

const RequestInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const RequestName = styled.span`
  font-size: 1rem;
  font-weight: 500;
  color: white;
  display: block;
`;

const RequestDate = styled.span`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.5);
  margin-top: 2px;

  svg { opacity: 0.7; }
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 8px;
  flex-shrink: 0;
`;

const AcceptBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  min-height: 36px;
  border-radius: 6px;
  border: none;
  background: rgba(0, 255, 255, 0.15);
  color: #00ffff;
  font-size: 0.8125rem;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover { background: rgba(0, 255, 255, 0.25); }
`;

const DeclineBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  min-height: 36px;
  border-radius: 6px;
  border: 1px solid rgba(244, 67, 54, 0.4);
  background: transparent;
  color: #ef5350;
  font-size: 0.8125rem;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover { background: rgba(244, 67, 54, 0.1); }
`;

const Divider = styled.hr`
  border: none;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  margin: 0;
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px;
  text-align: center;

  svg { opacity: 0.5; margin-bottom: 16px; color: rgba(255, 255, 255, 0.5); }
`;

const EmptyTitle = styled.h6`
  font-size: 1.25rem;
  font-weight: 600;
  color: white;
  margin: 0 0 8px;
`;

const EmptyText = styled.p`
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.5);
  margin: 0;
`;

const SkeletonBlock = styled.div<{ $width?: string; $height?: string; $borderRadius?: string }>`
  background: linear-gradient(90deg,
    rgba(255, 255, 255, 0.05) 0%,
    rgba(255, 255, 255, 0.1) 50%,
    rgba(255, 255, 255, 0.05) 100%);
  background-size: 200% 100%;
  animation: ${shimmer} 2s infinite linear;
  width: ${props => props.$width || '100%'};
  height: ${props => props.$height || '20px'};
  border-radius: ${props => props.$borderRadius || '4px'};
`;

const FooterRow = styled.div`
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
`;

const CloseButton = styled.button`
  padding: 8px 16px;
  min-height: 44px;
  border-radius: 8px;
  border: none;
  background: rgba(0, 255, 255, 0.1);
  color: #00ffff;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover { background: rgba(0, 255, 255, 0.2); }
`;

interface FriendRequestsProps {
  open: boolean;
  onClose: () => void;
}

/**
 * FriendRequests Component
 * Displays incoming friend requests with accept/decline options
 */
const FriendRequests: React.FC<FriendRequestsProps> = ({ open, onClose }) => {
  const {
    friendRequests,
    isLoadingRequests,
    acceptFriendRequest,
    declineFriendRequest
  } = useSocialFriends();

  const handleAccept = async (requestId: string) => {
    await acceptFriendRequest(requestId);
  };

  const handleDecline = async (requestId: string) => {
    await declineFriendRequest(requestId);
  };

  return (
    <CustomModal isOpen={open} onClose={onClose} title="" size="medium">
      <ModalHeader>
        <UserCheck size={20} />
        <HeaderTitle>Friend Requests</HeaderTitle>
        <CloseBtn onClick={onClose} aria-label="Close"><X size={18} /></CloseBtn>
      </ModalHeader>
      <Content>
        {isLoadingRequests ? (
          <div>
            {[1, 2, 3].map((item) => (
              <div key={item} style={{ display: 'flex', alignItems: 'center', padding: '12px 0' }}>
                <SkeletonBlock $width="40px" $height="40px" $borderRadius="50%" />
                <div style={{ marginLeft: 12, flex: 1 }}>
                  <SkeletonBlock $width="120px" $height="18px" />
                  <SkeletonBlock $width="80px" $height="14px" style={{ marginTop: 4 }} />
                </div>
                <SkeletonBlock $width="160px" $height="36px" $borderRadius="6px" />
              </div>
            ))}
          </div>
        ) : friendRequests.length > 0 ? (
          <div>
            {friendRequests.map((request, index) => (
              <React.Fragment key={request.id}>
                <RequestItem>
                  <Avatar $src={request.requester.photo || undefined}>
                    {!request.requester.photo && `${request.requester.firstName[0]}${request.requester.lastName[0]}`}
                  </Avatar>
                  <RequestInfo>
                    <RequestName>{request.requester.firstName} {request.requester.lastName}</RequestName>
                    <RequestDate>
                      <Clock size={14} />
                      {new Date(request.createdAt).toLocaleDateString()}
                    </RequestDate>
                  </RequestInfo>
                  <ActionButtons>
                    <AcceptBtn onClick={() => handleAccept(request.id)}>
                      <UserCheck size={16} /> Accept
                    </AcceptBtn>
                    <DeclineBtn onClick={() => handleDecline(request.id)}>
                      <UserX size={16} /> Decline
                    </DeclineBtn>
                  </ActionButtons>
                </RequestItem>
                {index < friendRequests.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </div>
        ) : (
          <EmptyState>
            <AlertCircle size={48} />
            <EmptyTitle>No pending requests</EmptyTitle>
            <EmptyText>When someone sends you a friend request, you'll see it here</EmptyText>
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
