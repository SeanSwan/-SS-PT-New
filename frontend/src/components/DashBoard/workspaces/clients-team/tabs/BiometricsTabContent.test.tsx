import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import BiometricsTabContent from './BiometricsTabContent';

vi.mock('../../../../BodyMap', () => ({
  default: () => <div data-testid="body-map" />,
}));

vi.mock('../../../Pages/admin-dashboard/MeasurementEntry', () => ({
  default: () => <div data-testid="measurement-entry" />,
}));

vi.mock('../../../Pages/admin-movement-analysis/MovementAnalysisWizard', () => ({
  default: () => <div data-testid="movement-analysis" />,
}));

vi.mock('../../../../FormAnalysis/FormAnalysisPage', () => ({
  default: () => <div data-testid="form-analysis" />,
}));

vi.mock('./ROMAssessment', () => ({
  default: () => <div data-testid="rom-assessment" />,
}));

describe('BiometricsTabContent controls', () => {
  it('keeps the active biometrics tab component under the 300-line cap', () => {
    const source = readFileSync(resolve(__dirname, 'BiometricsTabContent.tsx'), 'utf8');

    expect(source.split(/\r?\n/).length).toBeLessThanOrEqual(300);
    expect(source).toContain("from './BiometricsTabContent.styles'");
  });

  it('keeps biometric cards and expanded back navigation as explicit non-submit buttons', async () => {
    const user = userEvent.setup();

    render(<BiometricsTabContent clientId={424242} clientName="Fixture Client" />);

    [
      /open body map/i,
      /open measurements/i,
      /open movement analysis/i,
      /open form analysis/i,
      /open range of motion/i,
    ].forEach((name) => {
      expect(screen.getByRole('button', { name })).toHaveAttribute('type', 'button');
    });

    await user.click(screen.getByRole('button', { name: /open body map/i }));

    expect(await screen.findByRole('button', { name: /back to biometrics grid/i }))
      .toHaveAttribute('type', 'button');
  });

  it('blocks malformed client ids before biometric tools receive NaN', async () => {
    render(<BiometricsTabContent clientId="fixture-424242" clientName="Fixture Client" />);

    expect(await screen.findByRole('alert')).toHaveTextContent(/valid client/i);
    expect(screen.queryByRole('button', { name: /open body map/i })).not.toBeInTheDocument();
  });
});
