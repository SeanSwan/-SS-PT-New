import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import JobClassSelector from './JobClassSelector';

const { putMock } = vi.hoisted(() => ({
  putMock: vi.fn(),
}));

vi.mock('../../../../services/api.service', () => ({
  default: {
    put: putMock,
  },
}));

describe('JobClassSelector', () => {
  beforeEach(() => {
    putMock.mockReset();
  });

  it('previews another class before saving', () => {
    render(<JobClassSelector userId={7} currentJobClass="paladin" />);

    fireEvent.click(screen.getByLabelText('Preview Monk job class'));

    expect(screen.getByRole('button', { name: 'Select Monk' })).toBeTruthy();
    expect(putMock).not.toHaveBeenCalled();
  });

  it('uses shared apiService and ignores rapid duplicate saves', async () => {
    let resolveSave: (value: { status: number }) => void = () => undefined;
    putMock.mockReturnValue(new Promise((resolve) => {
      resolveSave = resolve;
    }));
    const onClassChange = vi.fn();

    render(
      <JobClassSelector
        userId={7}
        currentJobClass="paladin"
        onClassChange={onClassChange}
      />,
    );

    fireEvent.click(screen.getByLabelText('Preview Ranger job class'));
    const selectButton = screen.getByRole('button', { name: 'Select Ranger' });
    fireEvent.click(selectButton);
    fireEvent.click(selectButton);

    expect(putMock).toHaveBeenCalledTimes(1);
    expect(putMock).toHaveBeenCalledWith(
      '/api/gamification/users/7/job-class',
      { jobClass: 'ranger' },
      { validateStatus: expect.any(Function) },
    );

    resolveSave({ status: 200 });
    await waitFor(() => expect(onClassChange).toHaveBeenCalledWith('ranger'));
  });

  it('shows safe copy when the save is rejected without exposing backend errors', async () => {
    putMock.mockResolvedValue({ status: 403, data: { message: 'raw backend denial' } });
    const onClassChange = vi.fn();

    render(
      <JobClassSelector
        userId={7}
        currentJobClass="paladin"
        onClassChange={onClassChange}
      />,
    );

    fireEvent.click(screen.getByLabelText('Preview Dark Knight job class'));
    fireEvent.click(screen.getByRole('button', { name: 'Select Dark Knight' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not update job class. Try again.');
    expect(screen.queryByText('raw backend denial')).toBeNull();
    expect(onClassChange).not.toHaveBeenCalled();
  });

  it('treats 2xx failure payloads as rejected saves', async () => {
    putMock.mockResolvedValue({
      status: 200,
      data: { success: false, message: 'raw backend save denial' },
    });
    const onClassChange = vi.fn();

    render(
      <JobClassSelector
        userId={7}
        currentJobClass="paladin"
        onClassChange={onClassChange}
      />,
    );

    fireEvent.click(screen.getByLabelText('Preview Monk job class'));
    fireEvent.click(screen.getByRole('button', { name: 'Select Monk' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not update job class. Try again.');
    expect(screen.queryByText('raw backend save denial')).toBeNull();
    expect(onClassChange).not.toHaveBeenCalled();
  });
});
