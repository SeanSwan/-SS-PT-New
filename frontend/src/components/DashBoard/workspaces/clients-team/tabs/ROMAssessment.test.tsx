import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ROMAssessment from './ROMAssessment';

const { mockAuthAxios } = vi.hoisted(() => ({
  mockAuthAxios: {
    post: vi.fn(),
  },
}));

vi.mock('../../../../../context/AuthContext', () => ({
  useAuth: () => ({ authAxios: mockAuthAxios }),
}));

describe('ROMAssessment controls', () => {
  it('refuses malformed client ids before posting ROM measurements', async () => {
    mockAuthAxios.post.mockResolvedValue({ data: { success: true } });

    render(<ROMAssessment clientId="fixture-424242" clientName="Fixture Client" />);

    fireEvent.change(screen.getAllByLabelText(/flexion left side degrees/i)[0], {
      target: { value: '90' },
    });
    fireEvent.click(screen.getByRole('button', { name: /save assessment/i }));

    await waitFor(() => {
      expect(mockAuthAxios.post).not.toHaveBeenCalled();
    });
    expect(screen.getByText(/select a valid client before saving/i)).toBeInTheDocument();
  });

  it('keeps the active ROM component under the 300-line cap', () => {
    const source = readFileSync(resolve(__dirname, 'ROMAssessment.tsx'), 'utf8');

    expect(source.split(/\r?\n/).length).toBeLessThanOrEqual(300);
    expect(source).toContain("from './ROMAssessment.styles'");
  });

  it('keeps save and reset actions as explicit non-submit buttons', () => {
    render(<ROMAssessment clientId={424242} clientName="Fixture Client" />);

    expect(screen.getByRole('button', { name: /save assessment/i }))
      .toHaveAttribute('type', 'button');
    expect(screen.getByRole('button', { name: /reset/i }))
      .toHaveAttribute('type', 'button');
  });

  it('keeps ROM layout in styled-components with mobile-safe grid tracks', () => {
    const componentSource = readFileSync(resolve(__dirname, 'ROMAssessment.tsx'), 'utf8');
    const stylesSource = readFileSync(resolve(__dirname, 'ROMAssessment.styles.ts'), 'utf8');

    expect(componentSource).not.toContain('style={{');
    expect(stylesSource).toContain('export const RomGridHeader');
    expect(stylesSource).toContain('grid-template-columns: minmax(130px, 1.2fr) minmax(72px, 1fr) minmax(72px, 1fr) minmax(52px, 0.7fr);');
    expect(stylesSource).toContain('grid-template-columns: minmax(94px, 1.1fr) minmax(0, 1fr) minmax(0, 1fr) minmax(42px, 0.7fr);');
  });
});
