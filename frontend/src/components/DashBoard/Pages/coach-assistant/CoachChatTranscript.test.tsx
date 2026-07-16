import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import CoachChatTranscript from './CoachChatTranscript';

const originalScrollHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollHeight');

function mockScrollableTranscript() {
  Object.defineProperty(HTMLElement.prototype, 'scrollHeight', {
    configurable: true,
    get: () => 600,
  });
}

afterEach(() => {
  if (originalScrollHeight) {
    Object.defineProperty(HTMLElement.prototype, 'scrollHeight', originalScrollHeight);
  } else {
    delete (HTMLElement.prototype as { scrollHeight?: number }).scrollHeight;
  }
});

describe('CoachChatTranscript scrolling', () => {
  it('does not render inert prompt controls without a suggestion callback', () => {
    render(<CoachChatTranscript activeThread={null} logs={[]} />);

    expect(screen.queryByRole('button', { name: /Use suggestion:/i })).not.toBeInTheDocument();
  });

  it('keeps the top of the empty-state guidance visible', () => {
    mockScrollableTranscript();
    render(
      <CoachChatTranscript activeThread={null} logs={[]} />,
    );

    const stream = screen.getByLabelText('Conversation with Swan Coach')
      .querySelector('.transcript-stream') as HTMLDivElement;
    expect(stream.scrollTop).toBe(0);
  });

  it('follows the newest entry when a conversation has content', () => {
    mockScrollableTranscript();
    render(
      <CoachChatTranscript
        activeThread={null}
        logs={[{ id: 'entry-1', actor: 'coach', label: 'Coach reply', body: 'Ready.' }]}
      />,
    );

    const stream = screen.getByLabelText('Conversation with Swan Coach')
      .querySelector('.transcript-stream') as HTMLDivElement;
    expect(stream.scrollTop).toBe(600);
  });

  it('announces the actual Coach response content', () => {
    render(
      <CoachChatTranscript
        activeThread={null}
        logs={[{ id: 'entry-1', actor: 'coach', label: 'Coach reply', body: 'Your next workout is ready.' }]}
      />,
    );

    const announcement = screen.getByLabelText('Conversation with Swan Coach')
      .querySelector('.transcript-live-announcement');
    expect(announcement).toHaveTextContent('Your next workout is ready.');
  });
});

describe('CoachChatTranscript jump-to-newest pill (W3 hardening)', () => {
  it('offers a jump pill instead of yanking a reader out of history when a new reply lands', () => {
    mockScrollableTranscript();
    const logs = [{ id: 'entry-1', actor: 'coach' as const, label: 'Coach reply', body: 'First.' }];
    const { rerender } = render(
      <CoachChatTranscript activeThread={null} logs={logs} />,
    );
    const stream = screen.getByLabelText('Conversation with Swan Coach')
      .querySelector('.transcript-stream') as HTMLDivElement;
    // Reader scrolls up into history (scrollHeight mocked to 600; top = far
    // away). The scroll event updates the near-bottom tracking ref.
    stream.scrollTop = 0;
    fireEvent.scroll(stream);

    rerender(
      <CoachChatTranscript
        activeThread={null}
        logs={[...logs, { id: 'entry-2', actor: 'coach' as const, label: 'Coach reply', body: 'Second.' }]}
      />,
    );

    const pill = screen.getByRole('button', { name: /new reply/i });
    fireEvent.click(pill);
    expect(stream.scrollTop).toBe(600);
    expect(screen.queryByRole('button', { name: /new reply/i })).toBeNull();
  });
});

describe('CoachChatTranscript thread-switch + pending states (R1 hostile fixes)', () => {
  it('re-lands on the newest message when the active thread changes, even at equal log counts', () => {
    mockScrollableTranscript();
    const threadA = { id: 11, title: 'A' } as any;
    const threadB = { id: 12, title: 'B' } as any;
    const logsA = [{ id: 'a-1', actor: 'coach' as const, label: 'Coach reply', body: 'Thread A.' }];
    const logsB = [{ id: 'b-1', actor: 'coach' as const, label: 'Coach reply', body: 'Thread B.' }];
    const { rerender } = render(
      <CoachChatTranscript activeThread={threadA} logs={logsA} onRetryMessage={() => undefined} />,
    );
    const stream = screen.getByLabelText('Conversation with Swan Coach')
      .querySelector('.transcript-stream') as HTMLDivElement;
    stream.scrollTop = 0;
    fireEvent.scroll(stream);

    rerender(<CoachChatTranscript activeThread={threadB} logs={logsB} onRetryMessage={() => undefined} />);

    expect(stream.scrollTop).toBe(600);
    expect(screen.queryByRole('button', { name: /new reply/i })).toBeNull();
  });

  it('shows a visible thinking row while a send is in flight', () => {
    render(
      <CoachChatTranscript
        activeThread={null}
        busy
        logs={[{ id: 'op-1', actor: 'operator' as const, label: 'You', body: 'hello' }]}
      />,
    );
    expect(screen.getByText(/Swan Coach is thinking/i)).toBeInTheDocument();
  });

  it('shows a loading state instead of the empty pitch while a thread loads', () => {
    render(<CoachChatTranscript activeThread={null} logs={[]} threadLoading />);
    expect(screen.getByText(/Loading thread/i)).toBeInTheDocument();
    expect(screen.queryByText(/Talk to Swan Coach/i)).toBeNull();
  });
});
