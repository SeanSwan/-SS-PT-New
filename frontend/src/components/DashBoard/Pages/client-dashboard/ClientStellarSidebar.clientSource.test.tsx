
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import ClientStellarSidebar from './ClientStellarSidebar';

describe('ClientStellarSidebar client source navigation', () => {
  it('hides SwanStudios booking for Move Fitness clients while preserving tool access', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard/client/overview']}>
        <ClientStellarSidebar clientSource=" Move Fitness " />
      </MemoryRouter>
    );

    expect(screen.queryByRole('menuitem', { name: 'Book Session' })).not.toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'My Workouts' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Nutrition' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Pain & Injury Chart' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Community & Challenges' })).toBeInTheDocument();
  });

  it('keeps booking visible for SwanStudios clients', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard/client/overview']}>
        <ClientStellarSidebar clientSource="swanstudios" />
      </MemoryRouter>
    );

    expect(screen.getByRole('menuitem', { name: 'Book Session' })).toBeInTheDocument();
  });

  it('marks Log Workout active when the route loads today by query string', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard/client/log-workout?loadPlan=today']}>
        <ClientStellarSidebar clientSource="swanstudios" />
      </MemoryRouter>
    );

    expect(screen.getByRole('menuitem', { name: 'Log Workout' })).toHaveAttribute('aria-current', 'page');
  });
});
