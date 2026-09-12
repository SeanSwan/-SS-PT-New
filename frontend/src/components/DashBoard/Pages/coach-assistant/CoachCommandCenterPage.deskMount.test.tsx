/** Packet 47: do not expose incomplete Desk actions before integration readiness. */
import {cleanup,screen,fireEvent} from '@testing-library/react';
import {afterEach,beforeEach,describe,expect,it} from 'vitest';
import {renderPage,resetCoachCommandCenterMocks} from './CoachCommandCenterPage.test.harness';
describe('CoachCommandCenterPage Desk activation guard',()=>{
  beforeEach(resetCoachCommandCenterMocks);afterEach(cleanup);
  it.each(['admin','trainer','client'] as const)('keeps the working Coach transcript for %s without prototype actions',role=>{
    renderPage('/dashboard/'+role+'/coach-assistant?workspace=chat&clientId=42',role);
    expect(screen.queryByTestId('coach-session-desk')).toBeNull();
    expect(screen.queryByTestId('coach-session-desk-log')).toBeNull();
    expect(screen.getByText(/Talk to Swan Coach/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button',{name:/^More command tools$/i}));
    expect(screen.getByRole('menuitem',{name:/open workout logger/i})).toBeInTheDocument();
  },15000);
});
