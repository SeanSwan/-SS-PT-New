import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import HomeWorld from './HomeWorld';

describe('HomeWorld', () => {
  it('falls back to the training room when activeRoom is malformed', () => {
    const onRoomChange = vi.fn();

    render(
      <HomeWorld
        homeTier="starter"
        activeRoom="unknown_room"
        furniture={{
          training_room: {
            floor_mat: 'crystal_floor',
          },
        }}
        onRoomChange={onRoomChange}
      />
    );

    expect(screen.getByRole('button', { name: /training room/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Floor Mat')).toBeInTheDocument();
    expect(screen.getByText('Crystal Floor')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /bedroom/i }));
    expect(onRoomChange).toHaveBeenCalledWith('bedroom');
  });

  it('renders an empty room state instead of a blank furniture grid', () => {
    render(
      <HomeWorld
        homeTier="starter"
        activeRoom="kitchen"
        furniture={{ kitchen: {} }}
        onRoomChange={vi.fn()}
      />
    );

    expect(screen.getByText('No furniture placed in this room yet.')).toBeInTheDocument();
  });

  it('does not expose developer setup placeholders on the mounted home preview', () => {
    render(
      <HomeWorld
        homeTier="premium"
        activeRoom="training_room"
        furniture={{ training_room: {} }}
        onRoomChange={vi.fn()}
      />
    );

    expect(screen.queryByText(/react three fiber|@react-three|webgpu|npm install|renderer/i))
      .not.toBeInTheDocument();
    expect(screen.getByText(/Your private training habitat evolves with logged progress/i))
      .toBeInTheDocument();
  });
});
