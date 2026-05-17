import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ClientObservatoryFeed from './ClientObservatoryFeed';

const noop = vi.fn();

describe('ClientObservatoryFeed XP receipt', () => {
  it('shows the point award returned by Quick Post', () => {
    render(
      <ClientObservatoryFeed
        feedLoading={false}
        posts={[]}
        postText=""
        creatingPost={false}
        postReceipt={{
          pointsAwarded: 25,
          message: 'You earned 25 points for creating a training post!',
        }}
        onPostTextChange={noop}
        onCreatePost={async () => {}}
      />
    );

    expect(screen.getByText('+25 XP')).toBeInTheDocument();
    expect(screen.getByText('You earned 25 points for creating a training post!')).toBeInTheDocument();
  });
});
