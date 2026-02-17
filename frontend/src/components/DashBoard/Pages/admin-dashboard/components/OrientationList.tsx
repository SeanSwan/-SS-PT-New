import React, { useEffect, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import styled, { keyframes, css } from 'styled-components';
import { Info, Mail, Phone, HeartPulse, Dumbbell, X } from 'lucide-react';
import { format } from 'date-fns';

// Import from Redux store
import { RootState } from '../../../../../store';
import { fetchAllOrientations, OrientationData } from '../../../../../store/slices/orientationSlice';

// ============================================================
// Theme Tokens
// ============================================================
const THEME = {
  bg: 'rgba(15,23,42,0.95)',
  bgSurface: 'rgba(15,23,42,0.8)',
  border: 'rgba(14,165,233,0.2)',
  borderHover: 'rgba(14,165,233,0.4)',
  text: '#e2e8f0',
  textSecondary: '#94a3b8',
  accent: '#0ea5e9',
  accentHover: '#38bdf8',
  success: '#22c55e',
  info: '#3b82f6',
  error: '#ef4444',
  glass: 'rgba(255,255,255,0.03)',
  glassHover: 'rgba(255,255,255,0.06)',
  backdrop: 'blur(12px)',
} as const;

// ============================================================
// Breakpoint helper
// ============================================================
const MOBILE_BREAKPOINT = 768;

function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < MOBILE_BREAKPOINT : false
  );

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    setIsMobile(mq.matches);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return isMobile;
}

// ============================================================
// Animations
// ============================================================
const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const slideUp = keyframes`
  from { opacity: 0; transform: translateY(24px) scale(0.97); }
  to { opacity: 1; transform: translateY(0) scale(1); }
`;

// ============================================================
// Styled Components
// ============================================================

const Wrapper = styled.div`
  width: 100%;
`;

const GlassPanel = styled.div`
  background: ${THEME.bg};
  border: 1px solid ${THEME.border};
  border-radius: 12px;
  backdrop-filter: ${THEME.backdrop};
  -webkit-backdrop-filter: ${THEME.backdrop};
  overflow: hidden;
  margin-bottom: 16px;
`;

const PanelHeader = styled.div`
  padding: 24px;
  border-bottom: 1px solid ${THEME.border};
`;

const Title = styled.h2`
  margin: 0 0 4px 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: ${THEME.text};
`;

const Subtitle = styled.p`
  margin: 0;
  font-size: 0.875rem;
  color: ${THEME.textSecondary};
`;

const TableScrollContainer = styled.div`
  max-height: 60vh;
  overflow: auto;
`;

const StyledTable = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const StyledThead = styled.thead`
  position: sticky;
  top: 0;
  z-index: 2;
`;

const StyledTh = styled.th<{ $align?: string }>`
  padding: 12px 16px;
  font-size: 0.8125rem;
  font-weight: 700;
  color: ${THEME.text};
  text-align: ${({ $align }) => $align || 'left'};
  background: rgba(15, 23, 42, 0.98);
  border-bottom: 1px solid ${THEME.border};
  white-space: nowrap;
`;

const StyledTr = styled.tr<{ $clickable?: boolean; $selected?: boolean }>`
  transition: background-color 0.2s ease;
  cursor: ${({ $clickable }) => ($clickable ? 'pointer' : 'default')};
  background-color: ${({ $selected }) =>
    $selected ? 'rgba(14, 165, 233, 0.08)' : 'transparent'};

  &:hover {
    background-color: ${THEME.glassHover};
  }
`;

const StyledTd = styled.td<{ $align?: string }>`
  padding: 12px 16px;
  font-size: 0.875rem;
  color: ${THEME.text};
  text-align: ${({ $align }) => $align || 'left'};
  border-bottom: 1px solid ${THEME.border};
  vertical-align: middle;
`;

// Chip / badge
interface ChipStyleProps {
  $variant?: 'default' | 'primary' | 'info' | 'success';
}

const chipColors: Record<string, { bg: string; text: string; border: string }> = {
  default: { bg: 'rgba(148,163,184,0.12)', text: THEME.textSecondary, border: 'rgba(148,163,184,0.25)' },
  primary: { bg: 'rgba(14,165,233,0.12)', text: THEME.accent, border: 'rgba(14,165,233,0.3)' },
  info: { bg: 'rgba(59,130,246,0.12)', text: THEME.info, border: 'rgba(59,130,246,0.3)' },
  success: { bg: 'rgba(34,197,94,0.12)', text: THEME.success, border: 'rgba(34,197,94,0.3)' },
};

const ChipBadge = styled.span<ChipStyleProps>`
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  font-size: 0.75rem;
  font-weight: 600;
  border-radius: 9999px;
  white-space: nowrap;
  background: ${({ $variant = 'default' }) => chipColors[$variant]?.bg};
  color: ${({ $variant = 'default' }) => chipColors[$variant]?.text};
  border: 1px solid ${({ $variant = 'default' }) => chipColors[$variant]?.border};
`;

// Buttons
const BaseButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 44px;
  min-width: 44px;
  padding: 10px 20px;
  font-size: 0.875rem;
  font-weight: 600;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-decoration: none;
  border: none;
  font-family: inherit;

  &:focus-visible {
    outline: 2px solid ${THEME.accent};
    outline-offset: 2px;
  }
`;

const PrimaryButton = styled(BaseButton)`
  background: ${THEME.accent};
  color: #0f172a;

  &:hover {
    background: ${THEME.accentHover};
  }
`;

const OutlinedButton = styled(BaseButton)`
  background: transparent;
  color: ${THEME.text};
  border: 1px solid ${THEME.border};

  &:hover {
    border-color: ${THEME.borderHover};
    background: ${THEME.glass};
  }
`;

const IconBtn = styled.button<{ $size?: number }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  min-width: 44px;
  width: ${({ $size }) => ($size ? `${$size}px` : '44px')};
  height: ${({ $size }) => ($size ? `${$size}px` : '44px')};
  border-radius: 8px;
  border: none;
  background: transparent;
  color: ${THEME.accent};
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;

  &:hover {
    background: rgba(14, 165, 233, 0.1);
    color: ${THEME.accentHover};
  }

  &:focus-visible {
    outline: 2px solid ${THEME.accent};
    outline-offset: 2px;
  }
`;

// Loading spinner
const Spinner = styled.div`
  width: 36px;
  height: 36px;
  border: 3px solid ${THEME.border};
  border-top-color: ${THEME.accent};
  border-radius: 50%;
  animation: ${spin} 0.8s linear infinite;
`;

const CenterBox = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 32px;
`;

// Dialog / Modal
const Overlay = styled.div<{ $open: boolean }>`
  position: fixed;
  inset: 0;
  z-index: 1300;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(4px);
  animation: ${fadeIn} 0.2s ease;
  visibility: ${({ $open }) => ($open ? 'visible' : 'hidden')};
  opacity: ${({ $open }) => ($open ? 1 : 0)};
  transition: opacity 0.2s ease, visibility 0.2s ease;
`;

const DialogPanel = styled.div<{ $fullScreen?: boolean }>`
  background: ${THEME.bg};
  border: 1px solid ${THEME.border};
  backdrop-filter: ${THEME.backdrop};
  -webkit-backdrop-filter: ${THEME.backdrop};
  color: ${THEME.text};
  animation: ${slideUp} 0.25s ease;
  display: flex;
  flex-direction: column;
  max-height: 90vh;

  ${({ $fullScreen }) =>
    $fullScreen
      ? css`
          width: 100%;
          height: 100%;
          max-height: 100vh;
          border-radius: 0;
        `
      : css`
          width: 90%;
          max-width: 900px;
          border-radius: 12px;
        `}
`;

const DialogTitleBar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  border-bottom: 1px solid ${THEME.border};
  flex-shrink: 0;
`;

const DialogTitleText = styled.h3`
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: ${THEME.text};
`;

const DialogContentArea = styled.div`
  padding: 24px;
  overflow-y: auto;
  flex: 1;
`;

const DialogFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid ${THEME.border};
  flex-shrink: 0;
`;

// Layout helpers
const FlexRow = styled.div<{ $gap?: number; $wrap?: boolean }>`
  display: flex;
  gap: ${({ $gap = 16 }) => $gap}px;
  ${({ $wrap }) => $wrap && 'flex-wrap: wrap;'}
`;

const FlexCol = styled.div<{ $gap?: number; $flex?: number }>`
  display: flex;
  flex-direction: column;
  gap: ${({ $gap = 8 }) => $gap}px;
  ${({ $flex }) => $flex !== undefined && `flex: ${$flex};`}
`;

const ColumnsRow = styled.div`
  display: flex;
  gap: 32px;

  @media (max-width: ${MOBILE_BREAKPOINT - 1}px) {
    flex-direction: column;
  }
`;

const Column = styled.div`
  flex: 1;
`;

const SectionTitle = styled.h4`
  margin: 0 0 8px 0;
  font-size: 0.9375rem;
  font-weight: 600;
  color: ${THEME.text};
  display: flex;
  align-items: center;
  gap: 8px;
`;

const Label = styled.span`
  display: block;
  font-size: 0.75rem;
  font-weight: 500;
  color: ${THEME.textSecondary};
  margin-bottom: 2px;
`;

const Value = styled.span`
  display: block;
  font-size: 0.9375rem;
  color: ${THEME.text};
`;

const InfoPanel = styled.div`
  background: ${THEME.glass};
  border: 1px solid ${THEME.border};
  border-radius: 8px;
  padding: 16px;
  min-height: 80px;
  color: ${THEME.text};
  font-size: 0.9375rem;
  line-height: 1.5;
`;

const HealthInfoPanel = styled(InfoPanel)`
  min-height: 100px;
`;

const EmptyMessage = styled.p`
  text-align: center;
  padding: 24px 0;
  color: ${THEME.textSecondary};
  font-size: 0.9375rem;
  margin: 0;
`;

const ErrorContainer = styled.div`
  padding: 24px;
`;

const ErrorTitle = styled.h3`
  margin: 0 0 8px 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: ${THEME.error};
`;

const ErrorText = styled.p`
  margin: 0 0 16px 0;
  font-size: 0.875rem;
  color: ${THEME.error};
`;

const IconColor = styled.span`
  display: inline-flex;
  color: ${THEME.accent};
  flex-shrink: 0;
`;

const TooltipWrapper = styled.div`
  position: relative;
  display: inline-flex;

  &:hover > span {
    opacity: 1;
    visibility: visible;
    transform: translateX(-50%) translateY(0);
  }
`;

const TooltipText = styled.span`
  position: absolute;
  bottom: calc(100% + 6px);
  left: 50%;
  transform: translateX(-50%) translateY(4px);
  background: #1e293b;
  color: ${THEME.text};
  font-size: 0.75rem;
  padding: 4px 8px;
  border-radius: 4px;
  white-space: nowrap;
  opacity: 0;
  visibility: hidden;
  transition: all 0.15s ease;
  pointer-events: none;
  z-index: 10;
`;

// ============================================================
// Sub-components
// ============================================================

const DetailsRow: React.FC<{
  label: string;
  value: string | null;
  icon?: React.ReactNode;
}> = ({ label, value, icon }) => (
  <FlexRow $gap={8} style={{ marginBottom: 16, alignItems: 'flex-start' }}>
    {icon && (
      <IconColor style={{ marginTop: 2 }}>{icon}</IconColor>
    )}
    <FlexCol $gap={2}>
      <Label>{label}</Label>
      <Value>{value || 'Not provided'}</Value>
    </FlexCol>
  </FlexRow>
);

// ============================================================
// Main Component
// ============================================================

/**
 * OrientationList Component
 *
 * Displays a list of client orientation submissions with detailed view functionality
 */
const OrientationList: React.FC = () => {
  const dispatch = useDispatch();
  const isMobile = useIsMobile();

  // Get orientation data from Redux store
  const { orientations, loading, error } = useSelector(
    (state: RootState) => state.orientation
  );

  // Local state for dialog
  const [selectedOrientation, setSelectedOrientation] = useState<OrientationData | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Fetch orientation data on component mount
  useEffect(() => {
    // @ts-ignore (dispatch type issue with async thunk)
    dispatch(fetchAllOrientations());
  }, [dispatch]);

  // Handle dialog open/close
  const handleOpenDialog = useCallback((orientation: OrientationData) => {
    setSelectedOrientation(orientation);
    setDialogOpen(true);
  }, []);

  const handleCloseDialog = useCallback(() => {
    setDialogOpen(false);
    // Clear the selection after animation completes
    setTimeout(() => setSelectedOrientation(null), 300);
  }, []);

  // Close on Escape key
  useEffect(() => {
    if (!dialogOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleCloseDialog();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [dialogOpen, handleCloseDialog]);

  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy h:mm a');
    } catch (e) {
      return 'Invalid date';
    }
  };

  // Handle experience level display
  const getExperienceLevelChip = (level: string | null) => {
    if (!level) return <ChipBadge $variant="default">Not specified</ChipBadge>;

    const levels: Record<string, 'default' | 'primary' | 'info' | 'success'> = {
      Beginner: 'primary',
      Intermediate: 'info',
      Advanced: 'success',
    };

    const variant = levels[level] || 'default';
    return <ChipBadge $variant={variant}>{level}</ChipBadge>;
  };

  if (loading) {
    return (
      <CenterBox>
        <Spinner />
      </CenterBox>
    );
  }

  if (error) {
    return (
      <ErrorContainer>
        <ErrorTitle>Error loading orientation data</ErrorTitle>
        <ErrorText>{error}</ErrorText>
        <PrimaryButton
          type="button"
          onClick={() => dispatch(fetchAllOrientations())}
        >
          Try Again
        </PrimaryButton>
      </ErrorContainer>
    );
  }

  return (
    <Wrapper>
      <GlassPanel>
        <PanelHeader>
          <Title>Client Orientation Submissions</Title>
          <Subtitle>
            Review prospective client orientation forms submitted through the platform.
          </Subtitle>
        </PanelHeader>

        <TableScrollContainer>
          <StyledTable>
            <StyledThead>
              <tr>
                <StyledTh>Name</StyledTh>
                {!isMobile && <StyledTh>Email</StyledTh>}
                {!isMobile && <StyledTh>Phone</StyledTh>}
                <StyledTh>Experience</StyledTh>
                <StyledTh>Submitted</StyledTh>
                <StyledTh $align="right">Actions</StyledTh>
              </tr>
            </StyledThead>
            <tbody>
              {orientations.length === 0 ? (
                <tr>
                  <StyledTd colSpan={isMobile ? 4 : 6}>
                    <EmptyMessage>No orientation submissions found.</EmptyMessage>
                  </StyledTd>
                </tr>
              ) : (
                orientations.map((orientation) => (
                  <StyledTr key={orientation.id}>
                    <StyledTd>{orientation.fullName}</StyledTd>
                    {!isMobile && <StyledTd>{orientation.email}</StyledTd>}
                    {!isMobile && <StyledTd>{orientation.phone}</StyledTd>}
                    <StyledTd>{getExperienceLevelChip(orientation.experienceLevel)}</StyledTd>
                    <StyledTd>{formatDate(orientation.createdAt)}</StyledTd>
                    <StyledTd $align="right">
                      <TooltipWrapper>
                        <TooltipText>View Details</TooltipText>
                        <IconBtn
                          type="button"
                          aria-label="View Details"
                          onClick={() => handleOpenDialog(orientation)}
                        >
                          <Info size={18} />
                        </IconBtn>
                      </TooltipWrapper>
                    </StyledTd>
                  </StyledTr>
                ))
              )}
            </tbody>
          </StyledTable>
        </TableScrollContainer>
      </GlassPanel>

      {/* Detailed View Dialog */}
      {dialogOpen && (
        <Overlay $open={dialogOpen} onClick={handleCloseDialog}>
          <DialogPanel
            $fullScreen={isMobile}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={
              selectedOrientation
                ? `Orientation Details: ${selectedOrientation.fullName}`
                : 'Orientation Details'
            }
          >
            {selectedOrientation && (
              <>
                <DialogTitleBar>
                  <DialogTitleText>
                    Orientation Details: {selectedOrientation.fullName}
                  </DialogTitleText>
                  <IconBtn
                    type="button"
                    aria-label="Close"
                    onClick={handleCloseDialog}
                  >
                    <X size={20} />
                  </IconBtn>
                </DialogTitleBar>

                <DialogContentArea>
                  <FlexCol $gap={16}>
                    <ColumnsRow>
                      {/* Left column */}
                      <Column>
                        <SectionTitle>Contact Information</SectionTitle>
                        <DetailsRow label="Full Name" value={selectedOrientation.fullName} />
                        <DetailsRow
                          label="Email"
                          value={selectedOrientation.email}
                          icon={<Mail size={16} />}
                        />
                        <DetailsRow
                          label="Phone"
                          value={selectedOrientation.phone}
                          icon={<Phone size={16} />}
                        />
                        <DetailsRow
                          label="Date Submitted"
                          value={formatDate(selectedOrientation.createdAt)}
                        />
                        <DetailsRow
                          label="Waiver Initials"
                          value={selectedOrientation.waiverInitials}
                        />
                      </Column>

                      {/* Right column */}
                      <Column>
                        <SectionTitle>Fitness Information</SectionTitle>
                        <DetailsRow
                          label="Experience Level"
                          value={selectedOrientation.experienceLevel}
                          icon={<Dumbbell size={16} />}
                        />
                        <Label style={{ marginBottom: 8 }}>Training Goals</Label>
                        <InfoPanel>
                          {selectedOrientation.trainingGoals || 'No training goals specified'}
                        </InfoPanel>
                      </Column>
                    </ColumnsRow>

                    {/* Health Information */}
                    <div style={{ marginTop: 8 }}>
                      <SectionTitle>
                        <HeartPulse size={16} />
                        Health Information
                      </SectionTitle>
                      <HealthInfoPanel>
                        {selectedOrientation.healthInfo}
                      </HealthInfoPanel>
                    </div>
                  </FlexCol>
                </DialogContentArea>

                <DialogFooter>
                  <OutlinedButton type="button" onClick={handleCloseDialog}>
                    Close
                  </OutlinedButton>
                  <PrimaryButton
                    as="a"
                    href={`mailto:${selectedOrientation.email}?subject=Your Swan Studios Orientation`}
                  >
                    Contact Client
                  </PrimaryButton>
                </DialogFooter>
              </>
            )}
          </DialogPanel>
        </Overlay>
      )}
    </Wrapper>
  );
};

export default OrientationList;
