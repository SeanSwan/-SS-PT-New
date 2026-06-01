import React from 'react';
import { createPortal } from 'react-dom';
import { Activity, Clock, Eye, Globe, Users, X } from 'lucide-react';
import {
  anonVisitorKey,
  countryFlag,
  geoVisitorKey,
  historyVisitorToAnon,
  isAnonVisitor,
  pageName,
  pageVisitItems,
  timeAgo,
} from './VisitorGeoWidget.logic';
import { EmptyState, ErrorState, LiveDotSmall, SourceBadge } from './VisitorGeoWidget.styles';
import {
  CloseDetailBtn,
  DetailContent,
  DetailHeader,
  DetailLabel,
  DetailPanel,
  DetailRow,
  DetailTitle,
  DetailValue,
  ModalBody,
  ModalContent,
  ModalHeader,
  ModalList,
  ModalOverlay,
  ModalRow,
  ModalRowInfo,
  ModalRowMeta,
  ModalRowPages,
  ModalSection,
  ModalSectionTitle,
  ModalTitle,
  PageTag,
  PagesList,
  PaginationBtn,
  PaginationInfo,
  PaginationRow
} from './VisitorGeoWidget.modalStyles';
import type { AnonData, GeoData, HistoryData, SelectedVisitor } from './VisitorGeoWidget.types';

interface DetailProps {
  selectedVisitor: SelectedVisitor;
  onClose: () => void;
}

export const VisitorDetailPanel: React.FC<DetailProps> = ({ selectedVisitor, onClose }) => (
  <DetailPanel>
    <DetailHeader>
      <DetailTitle>Visitor Details</DetailTitle>
      <CloseDetailBtn onClick={onClose} aria-label="Close visitor details"><X size={16} /></CloseDetailBtn>
    </DetailHeader>
    <DetailContent>
      {isAnonVisitor(selectedVisitor) ? <AnonDetail visitor={selectedVisitor} /> : <GeoDetail visitor={selectedVisitor} />}
    </DetailContent>
  </DetailPanel>
);

const AnonDetail: React.FC<{ visitor: Extract<SelectedVisitor, { pages: string[] }> }> = ({ visitor }) => (
  <>
    <DetailRow><DetailLabel>Location</DetailLabel><DetailValue>{countryFlag(visitor.countryCode)} {visitor.city || 'Unknown'}{visitor.region && `, ${visitor.region}`}{visitor.country && ` - ${visitor.country}`}</DetailValue></DetailRow>
    <DetailRow><DetailLabel>First Seen</DetailLabel><DetailValue>{new Date(visitor.firstSeen).toLocaleString()}</DetailValue></DetailRow>
    <DetailRow><DetailLabel>Last Seen</DetailLabel><DetailValue>{timeAgo(visitor.lastSeen)}</DetailValue></DetailRow>
    <DetailRow><DetailLabel>Page Views</DetailLabel><DetailValue>{visitor.pageCount}</DetailValue></DetailRow>
    {visitor.referrer && <DetailRow><DetailLabel>Referrer</DetailLabel><DetailValue>{visitor.referrer}</DetailValue></DetailRow>}
    <DetailRow>
      <DetailLabel>Pages Visited</DetailLabel>
      <DetailValue><PagesList>{pageVisitItems(visitor.pages).map(({ key, page }) => <PageTag key={key}>{pageName(page)}</PageTag>)}</PagesList></DetailValue>
    </DetailRow>
  </>
);

const GeoDetail: React.FC<{ visitor: Exclude<SelectedVisitor, { pages: string[] }> }> = ({ visitor }) => (
  <>
    <DetailRow><DetailLabel>Name</DetailLabel><DetailValue>{visitor.name}</DetailValue></DetailRow>
    <DetailRow><DetailLabel>Role</DetailLabel><DetailValue>{visitor.role}</DetailValue></DetailRow>
    <DetailRow><DetailLabel>Location</DetailLabel><DetailValue>{countryFlag(visitor.countryCode)} {visitor.city && `${visitor.city}, `}{visitor.country || 'Unknown'}</DetailValue></DetailRow>
    <DetailRow><DetailLabel>Last Active</DetailLabel><DetailValue>{timeAgo(visitor.lastActive)}</DetailValue></DetailRow>
    <DetailRow><DetailLabel>Source</DetailLabel><DetailValue>{visitor.source}</DetailValue></DetailRow>
  </>
);

interface ModalProps {
  anonData: AnonData | null;
  geoData: GeoData | null;
  historyData: HistoryData | null;
  historyLoading: boolean;
  historyError: string | null;
  onClose: () => void;
  onFetchHistory: (page: number) => void;
  onSelectVisitor: (visitor: SelectedVisitor) => void;
}

export const VisitorFullModal: React.FC<ModalProps> = ({
  anonData,
  geoData,
  historyData,
  historyLoading,
  historyError,
  onClose,
  onFetchHistory,
  onSelectVisitor
}) => {
  const handleOverlayClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.currentTarget === event.target) onClose();
  };
  const handleOverlayKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClose();
    }
  };

  return createPortal(
    <ModalOverlay role="button" tabIndex={0} aria-label="Close visitor intelligence modal" onClick={handleOverlayClick} onKeyDown={handleOverlayKeyDown}>
      <ModalContent role="dialog" aria-modal="true" aria-labelledby="visitor-intelligence-title" tabIndex={-1}>
        <ModalHeader>
          <ModalTitle id="visitor-intelligence-title"><Globe size={20} />Visitor Intelligence - Full View</ModalTitle>
          <CloseDetailBtn onClick={onClose} aria-label="Close visitor intelligence modal"><X size={20} /></CloseDetailBtn>
        </ModalHeader>
        <ModalBody>
          <LiveModalSection anonData={anonData} onSelectVisitor={onSelectVisitor} />
          <UserModalSection geoData={geoData} onSelectVisitor={onSelectVisitor} />
          <HistoryModalSection historyData={historyData} historyLoading={historyLoading} historyError={historyError} onFetchHistory={onFetchHistory} onSelectVisitor={onSelectVisitor} />
        </ModalBody>
      </ModalContent>
    </ModalOverlay>,
    document.body
  );
};

const LiveModalSection: React.FC<{ anonData: AnonData | null; onSelectVisitor: (visitor: SelectedVisitor) => void }> = ({ anonData, onSelectVisitor }) => (
  <ModalSection>
    <ModalSectionTitle><Activity size={16} />Live Visitors ({anonData?.recentVisitors?.length || 0})</ModalSectionTitle>
    <ModalList>
      {anonData?.recentVisitors?.map((visitor) => (
        <ModalRow key={anonVisitorKey(visitor)} type="button" onClick={() => onSelectVisitor(visitor)}>
          <LiveDotSmall $recent={Date.now() - new Date(visitor.lastSeen).getTime() < 300000} />
          <ModalRowInfo><span>{countryFlag(visitor.countryCode)} {visitor.city || visitor.country || 'Unknown'}</span><ModalRowMeta>{visitor.pageCount} pages - {timeAgo(visitor.lastSeen)}{visitor.referrer && ` - from ${visitor.referrer}`}</ModalRowMeta></ModalRowInfo>
          <ModalRowPages>{pageVisitItems(visitor.pages).map(({ key, page }) => <PageTag key={key}>{pageName(page)}</PageTag>)}</ModalRowPages>
        </ModalRow>
      ))}
      {!anonData?.recentVisitors?.length && <EmptyState><Eye size={24} /><span>No live visitors right now</span></EmptyState>}
    </ModalList>
  </ModalSection>
);

const UserModalSection: React.FC<{ geoData: GeoData | null; onSelectVisitor: (visitor: SelectedVisitor) => void }> = ({ geoData, onSelectVisitor }) => (
  <ModalSection>
    <ModalSectionTitle><Users size={16} />Registered Users ({geoData?.visitors?.length || 0})</ModalSectionTitle>
    <ModalList>
      {geoData?.visitors?.map((visitor) => (
        <ModalRow key={geoVisitorKey(visitor)} type="button" onClick={() => onSelectVisitor(visitor)}>
          <LiveDotSmall $recent={Date.now() - new Date(visitor.lastActive).getTime() < 300000} />
          <ModalRowInfo><span>{countryFlag(visitor.countryCode)} {visitor.name}</span><ModalRowMeta>{visitor.role} - {visitor.city && `${visitor.city}, `}{visitor.country || 'Unknown'} - {timeAgo(visitor.lastActive)}</ModalRowMeta></ModalRowInfo>
          <SourceBadge $variant={visitor.source === 'gallery' ? 'gallery' : 'login'}>{visitor.role === 'gallery_visitor' ? 'gallery' : visitor.role}</SourceBadge>
        </ModalRow>
      ))}
      {!geoData?.visitors?.length && <EmptyState><Users size={24} /><span>No registered user data yet</span></EmptyState>}
    </ModalList>
  </ModalSection>
);

const HistoryModalSection: React.FC<Omit<ModalProps, 'anonData' | 'geoData' | 'onClose'>> = ({ historyData, historyLoading, historyError, onFetchHistory, onSelectVisitor }) => (
  <ModalSection>
    <ModalSectionTitle><Clock size={16} />Visitor History {historyData ? `(${historyData.total} total)` : ''}</ModalSectionTitle>
    {historyLoading && !historyData && <EmptyState>Loading visitor history...</EmptyState>}
    {historyError && <ErrorState role="alert"><Clock size={24} /><span>Visitor history unavailable. Retry before treating history as empty.</span></ErrorState>}
    <ModalList>
      {historyData?.visitors?.map(visitor => (
        <ModalRow key={visitor.id} type="button" onClick={() => onSelectVisitor(historyVisitorToAnon(visitor))}>
          <LiveDotSmall $recent={false} />
          <ModalRowInfo><span>{countryFlag(visitor.country_code || null)} {visitor.city || visitor.country || 'Unknown'}</span><ModalRowMeta>{visitor.page_count || 1} pages - {timeAgo(visitor.last_seen || visitor.createdAt || new Date().toISOString())}</ModalRowMeta></ModalRowInfo>
          <ModalRowPages>{pageVisitItems((visitor.pages || []).slice(-3)).map(({ key, page }) => <PageTag key={key}>{pageName(page)}</PageTag>)}</ModalRowPages>
        </ModalRow>
      ))}
      {historyData && historyData.visitors.length === 0 && <EmptyState><Clock size={24} /><span>No persistent history yet - data accumulates over time</span></EmptyState>}
    </ModalList>
    {historyData && historyData.totalPages > 1 && (
      <PaginationRow>
        <PaginationBtn disabled={historyData.page <= 1 || historyLoading} onClick={() => onFetchHistory(historyData.page - 1)}>Previous</PaginationBtn>
        <PaginationInfo>Page {historyData.page} of {historyData.totalPages}</PaginationInfo>
        <PaginationBtn disabled={historyData.page >= historyData.totalPages || historyLoading} onClick={() => onFetchHistory(historyData.page + 1)}>Next</PaginationBtn>
      </PaginationRow>
    )}
  </ModalSection>
);
