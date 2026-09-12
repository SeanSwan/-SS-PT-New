
import React from 'react';
import {render,screen,cleanup} from '@testing-library/react';
import {afterEach,expect,test,vi} from 'vitest';
import CoachSessionDeskGate from './CoachSessionDeskGate';
vi.mock('./useCoachSurfaceContext',()=>({CoachSurfaceProvider:({children}:any)=><>{children}</>}));
vi.mock('./CoachSessionDesk',()=>({default:({accessRevoked,offline,receipts}:any)=><div data-testid="state">{JSON.stringify({accessRevoked,offline,receipts})}</div>}));
afterEach(cleanup);
test('permission, offline and receipt changes reach the mounted desk with a stable callback',()=>{
  const open=vi.fn();
  const {rerender}=render(<CoachSessionDeskGate enabled onOpenLogger={open} accessRevoked={false} offline={false} receipts={[]}/>);
  rerender(<CoachSessionDeskGate enabled onOpenLogger={open} accessRevoked offline receipts={[{id:'receipt'} as any]}/>);
  expect(JSON.parse(screen.getByTestId('state').textContent!)).toEqual({accessRevoked:true,offline:true,receipts:[{id:'receipt'}]});
});
