import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
const storeMocks = vi.hoisted(() => ({ add: vi.fn(), refresh: vi.fn().mockResolvedValue(undefined), reduced: false, items: [] as any[] }));
vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ isAuthenticated: true, user: { id: 1 } }) }));
vi.mock('../../context/CartContext', () => ({ useCart: () => ({ cart: { itemCount: 0 }, addToCart: storeMocks.add, refreshCart: storeMocks.refresh }) }));
vi.mock('./useStorefrontCatalog', () => ({ default: () => ({ items: storeMocks.items, pricesVisible: true, status: 'ready', retry: vi.fn() }) }));
vi.mock('../../hooks/useReducedMotion', () => ({ useReducedMotion: () => storeMocks.reduced }));
vi.mock('../../components/ui/backgrounds/SectionVideoBackground', () => ({ default: ({ src }: { src: string }) => <div data-testid="background-video" data-src={src} /> }));
vi.mock('./components/MembershipsSection', () => ({ default: () => null }));
vi.mock('./components/YourSpecialCard', () => ({ default: () => null }));
vi.mock('./components/StoreCartDock', () => ({ default: () => null }));
vi.mock('./useCartDeepLink', () => ({ default: () => undefined }));
vi.mock('./components/PackagesGrid', () => ({ default: (props: any) => <div>{props.packages.map((entry: any) => <button key={entry.id} onClick={() => props.onAddToCart(entry)}>Grid {entry.name}</button>)}</div> }));
import StoreV3 from './StoreV3';
import StoreStory from './components/StoreStory';
import StoreSpotlight from './components/StoreSpotlight';
import StoreComparison from './components/StoreComparison';
import type { StoreItem } from './components/storeCatalog.types';

const item = (overrides: Partial<StoreItem>): StoreItem => ({
  id: 1,
  name: 'Foundation',
  description: 'A supplied catalog commitment.',
  packageType: 'fixed',
  displayPrice: 840,
  price: 840,
  totalCost: 840,
  pricePerSession: 105,
  sessions: 8,
  months: null,
  sessionsPerWeek: null,
  totalSessions: 8,
  isActive: true,
  imageUrl: null,
  itemKind: 'training_package',
  isTaxable: false,
  fulfillmentType: 'none',
  stockQuantity: null,
  variants: [],
  ...overrides,
});

describe('StoreV3 experience sections', () => {
  it('explains the method with useful process content', () => {
    render(<StoreStory />);
    expect(screen.getByRole('heading', { name: /the work has a method/i })).toBeInTheDocument();
    expect(screen.getAllByText(/consultation/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/review progress/i)).toBeInTheDocument();
  });

  it('chooses the longest monthly option and gives a useful next step', () => {
    render(<StoreSpotlight items={[
      item({ id: 1, name: 'Eight sessions', sessions: 8, totalSessions: 8 }),
      item({ id: 2, name: 'Year program', months: 12, sessions: null, totalSessions: 96, packageType: 'monthly', displayPrice: 10000 }),
    ]} canViewPrices onInquire={vi.fn()} onAddToCart={vi.fn()} canPurchase />);
    expect(screen.getByRole('heading', { name: /year program/i })).toBeInTheDocument();
    expect(screen.getByText(/choose a rhythm that fits your calendar/i)).toBeInTheDocument();
  });

  it('renders known comparison facts and labels missing values as unavailable', () => {
    render(<StoreComparison items={[
      item({ id: 1, name: 'Known', months: 3, sessionsPerWeek: 2 }),
      item({ id: 2, name: 'Unknown', months: null, sessionsPerWeek: null, totalSessions: null, displayPrice: null }),
    ]} canViewPrices />);
    expect(screen.getByText('Known')).toBeInTheDocument();
    expect(screen.getAllByText(/details unavailable/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/price unavailable/i)).toBeInTheDocument();
  });
});

describe('StoreV3 mounted cart and media behavior', () => {
  beforeEach(() => { storeMocks.add.mockReset(); storeMocks.reduced = false; storeMocks.items = [item({ id: 1, name: 'A' }), item({ id: 2, name: 'B' })]; });
  it('serializes A B A clicks and allows the next purchase after settlement', async () => {
    let finish!: () => void;
    storeMocks.add.mockImplementationOnce(() => new Promise<void>(resolve => { finish = resolve; }));
    storeMocks.add.mockResolvedValue(undefined);
    render(<StoreV3 />);
    fireEvent.click(screen.getByRole('button', { name: 'Grid A' }));
    fireEvent.click(screen.getByRole('button', { name: 'Grid B' }));
    fireEvent.click(screen.getByRole('button', { name: 'Grid A' }));
    expect(storeMocks.add.mock.calls.map(call => call[0].id)).toEqual([1]);
    expect(screen.getByRole('button', { name: 'Add to cart', exact: true })).toBeDisabled();
    await act(async () => finish());
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('A is in your cart.'));
    expect(screen.getByRole('button', { name: 'Add to cart', exact: true })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'Grid B' }));
    await waitFor(() => expect(storeMocks.add.mock.calls.map(call => call[0].id)).toEqual([1, 2]));
  });
  it('releases the cart lock after a failed request without claiming no write occurred', async () => {
    storeMocks.add.mockRejectedValueOnce(new Error('Synthetic transport failure')).mockResolvedValue(undefined);
    render(<StoreV3 />);
    fireEvent.click(screen.getByRole('button', { name: 'Grid A' }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Review your cart before trying again.'));
    fireEvent.click(screen.getByRole('button', { name: 'Grid B' }));
    await waitFor(() => expect(storeMocks.add.mock.calls.map(call => call[0].id)).toEqual([1, 2]));
  });
  it('preserves both configured media references and provides a shared pause control', () => {
    render(<StoreV3 />);
    expect(screen.getAllByTestId('background-video').map(node => node.getAttribute('data-src'))).toEqual(['/Swans.mp4', '/swan-golden.mp4']);
    fireEvent.click(screen.getByRole('button', { name: 'Pause background motion' }));
    expect(screen.queryByTestId('background-video')).not.toBeInTheDocument();
  });
  it('does not mount ambient videos under reduced motion', () => {
    storeMocks.reduced = true;
    render(<StoreV3 />);
    expect(screen.queryByTestId('background-video')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /background motion/ })).not.toBeInTheDocument();
  });
});
