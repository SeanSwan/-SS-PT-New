/**
 * EventList — selectable gallery cards + per-card actions
 * ======================================================
 * Left-rail list. Selecting a card drives the work area. Actions: publish
 * toggle, recount, open public gallery, delete. No nested interactive elements
 * (the name is one button; each action is a sibling button/anchor).
 */

import React from 'react';
import styled from 'styled-components';
import { Eye, EyeOff, ExternalLink, RefreshCw, Trash2 } from 'lucide-react';
import type { GalleryEvent } from '../types';
import { Badge, EmptyState, ErrorText, IconButton, Panel, SectionTitle, Spinner } from '../styles';

interface Props {
  events: GalleryEvent[];
  selectedId: number | null;
  loading: boolean;
  error: string | null;
  onSelect: (event: GalleryEvent) => void;
  onTogglePublish: (event: GalleryEvent) => void;
  onRecount: (id: number) => void;
  onDelete: (event: GalleryEvent) => void;
}

const fmtDate = (d?: string | null) => {
  if (!d) return '';
  const date = new Date(d);
  return Number.isNaN(date.getTime()) ? d : date.toLocaleDateString();
};

const EventList: React.FC<Props> = ({ events, selectedId, loading, error, onSelect, onTogglePublish, onRecount, onDelete }) => (
  <Panel>
    <SectionTitle>Galleries {events.length > 0 && <Count>{events.length}</Count>}</SectionTitle>

    {loading && <Loading><Spinner /> Loading galleries…</Loading>}
    {error && <ErrorText role="alert">{error}</ErrorText>}
    {!loading && !error && events.length === 0 && (
      <EmptyState>No galleries yet. Create one above to start uploading a shoot.</EmptyState>
    )}

    <List>
      {events.map((event) => {
        const meta = [event.sport, fmtDate(event.eventDate), event.location].filter(Boolean).join(' · ');
        const active = event.id === selectedId;
        return (
          <Card key={event.id} $active={active}>
            <SelectBtn type="button" onClick={() => onSelect(event)} aria-pressed={active}>
              <Name>{event.name}</Name>
              {meta && <Meta>{meta}</Meta>}
              <BottomRow>
                <span>{event.photoCount} photo{event.photoCount === 1 ? '' : 's'}</span>
                <Badge $tone={event.isPublished ? 'published' : 'draft'}>
                  {event.isPublished ? 'Published' : 'Draft'}
                </Badge>
              </BottomRow>
            </SelectBtn>
            <Actions>
              <IconButton
                type="button"
                title={event.isPublished ? 'Unpublish (make draft)' : 'Publish'}
                aria-label={event.isPublished ? 'Unpublish gallery' : 'Publish gallery'}
                onClick={() => onTogglePublish(event)}
              >
                {event.isPublished ? <Eye size={18} /> : <EyeOff size={18} />}
              </IconButton>
              <IconButton type="button" title="Recount photos" aria-label="Recount photos" onClick={() => onRecount(event.id)}>
                <RefreshCw size={18} />
              </IconButton>
              <IconButton
                as="a"
                href={`/gallery/${event.slug}`}
                target="_blank"
                rel="noreferrer"
                title="Open public gallery"
                aria-label="Open public gallery in a new tab"
              >
                <ExternalLink size={18} />
              </IconButton>
              <IconButton $danger type="button" title="Delete gallery" aria-label="Delete gallery" onClick={() => onDelete(event)}>
                <Trash2 size={18} />
              </IconButton>
            </Actions>
          </Card>
        );
      })}
    </List>
  </Panel>
);

const Count = styled.span`
  font-size: 0.75rem;
  color: var(--text-muted, #8fa3b8);
  background: var(--surface-dark, #1a1a24);
  border-radius: 999px;
  padding: 0.1rem 0.5rem;
`;

const Loading = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--text-muted, #8fa3b8);
  font-size: 0.9rem;
  padding: 0.5rem 0;
`;

const List = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
`;

const Card = styled.div<{ $active: boolean }>`
  border: 1px solid ${({ $active }) => ($active ? 'var(--accent-primary, #60c0f0)' : 'var(--border-subtle, rgba(96,192,240,0.16))')};
  border-radius: 12px;
  background: ${({ $active }) => ($active ? 'rgba(96, 192, 240, 0.08)' : 'var(--surface-dark, #1a1a24)')};
  overflow: hidden;
`;

const SelectBtn = styled.button`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  width: 100%;
  text-align: left;
  background: none;
  border: none;
  padding: 0.85rem 0.9rem 0.6rem;
  cursor: pointer;
  color: var(--text-primary, #e0ecf4);
`;

const Name = styled.span`
  font-weight: 600;
  font-size: 0.98rem;
`;

const Meta = styled.span`
  font-size: 0.8rem;
  color: var(--text-muted, #8fa3b8);
`;

const BottomRow = styled.span`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 0.35rem;
  font-size: 0.8rem;
  color: var(--text-muted, #8fa3b8);
`;

const Actions = styled.div`
  display: flex;
  gap: 0.4rem;
  padding: 0 0.9rem 0.85rem;
  flex-wrap: wrap;
`;

export default EventList;
