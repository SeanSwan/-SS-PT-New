import { render, screen } from '@testing-library/react';
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
    render(<CoachChatTranscript activeThread={null} logs={[]} onReset={() => undefined} />);

    expect(screen.queryByRole('button', { name: /Use suggestion:/i })).not.toBeInTheDocument();
  });

  it('keeps the top of the empty-state guidance visible', () => {
    mockScrollableTranscript();
    render(
      <CoachChatTranscript activeThread={null} logs={[]} onReset={() => undefined} />,
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
        onReset={() => undefined}
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
        onReset={() => undefined}
      />,
    );

    const announcement = screen.getByLabelText('Conversation with Swan Coach')
      .querySelector('.transcript-live-announcement');
    expect(announcement).toHaveTextContent('Your next workout is ready.');
  });
});
