import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import MessageAttachmentList from './MessageAttachmentList';
import type { MessageAttachment } from './MessagingTypes';

const renderAttachments = (attachments: MessageAttachment[]) => render(<MessageAttachmentList attachments={attachments} />);

describe('MessageAttachmentList', () => {
  it('renders governed training card attachments with semantic labels', () => {
    renderAttachments([
      { id: 'workout-1', kind: 'workout_card', title: 'Upper Push Plan', url: '/dashboard/client/workouts/42', scanStatus: 'not_required' },
      { id: 'session-1', kind: 'session_card', title: 'Monday Training Session', url: '/dashboard/client/sessions/7', scanStatus: 'not_required' },
      { id: 'nutrition-1', kind: 'nutrition_card', title: 'Protein Target', url: '/dashboard/client/nutrition/3', scanStatus: 'not_required' },
    ]);

    expect(screen.getByRole('link', { name: /open workout attachment upper push plan/i })).toHaveAttribute('href', '/dashboard/client/workouts/42');
    expect(screen.getByRole('link', { name: /open session attachment monday training session/i })).toHaveAttribute('href', '/dashboard/client/sessions/7');
    expect(screen.getByRole('link', { name: /open nutrition attachment protein target/i })).toHaveAttribute('href', '/dashboard/client/nutrition/3');
    expect(screen.getByText('Workout')).toBeInTheDocument();
    expect(screen.getByText('Session')).toBeInTheDocument();
    expect(screen.getByText('Nutrition')).toBeInTheDocument();
  });

  it('renders governed card attachments without a URL as non-clickable cards', () => {
    renderAttachments([
      { id: 'workout-1', kind: 'workout_card', title: 'Upper Push Plan', entityType: 'workout', entityId: 42, scanStatus: 'not_required' },
      { id: 'session-1', kind: 'session_card', title: 'Monday Training Session', entityType: 'session', entityId: 7, scanStatus: 'not_required' },
    ]);

    expect(screen.getByText('Upper Push Plan')).toBeInTheDocument();
    expect(screen.getByText('Monday Training Session')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /upper push plan/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /monday training session/i })).not.toBeInTheDocument();
  });

  it('renders governed internal links and hides external or raw binary kinds', () => {
    renderAttachments([
      { id: 'link-1', kind: 'link', title: 'Progress Chart', url: '/dashboard/client/progress', scanStatus: 'not_required' },
      { id: 'external-1', kind: 'link', title: 'External URL', url: 'https://example.com', scanStatus: 'not_required' },
      { id: 'voice-1', kind: 'voice_note', title: 'Unscanned voice note', url: '/api/messages/voice/1', scanStatus: 'pending' },
      { id: 'file-1', kind: 'file', title: 'Unscanned file', url: '/api/messages/file/1', scanStatus: 'pending' },
    ]);

    expect(screen.getByRole('link', { name: /open link attachment progress chart/i })).toHaveAttribute('href', '/dashboard/client/progress');
    expect(screen.queryByText('External URL')).not.toBeInTheDocument();
    expect(screen.queryByText('Unscanned voice note')).not.toBeInTheDocument();
    expect(screen.queryByText('Unscanned file')).not.toBeInTheDocument();
  });
});