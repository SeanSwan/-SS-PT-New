import { render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import AdminSystemHealthPanel from './AdminSystemHealthPanel';

const SOURCE = readFileSync(
  resolve(process.cwd(), 'src/components/DashBoard/Pages/admin-dashboard/overview/AdminSystemHealthPanel.tsx'),
  'utf8',
);

describe('AdminSystemHealthPanel truth handling', () => {
  it('shows an explicit empty state instead of a blank health grid', () => {
    render(<AdminSystemHealthPanel systemHealth={[]} onRefresh={vi.fn()} />);

    expect(screen.getByText(/no service health checks returned yet/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
  });

  it('keeps the refresh action as a non-submit button', () => {
    expect(SOURCE).toContain('<CommandButton type="button"');
  });
});
