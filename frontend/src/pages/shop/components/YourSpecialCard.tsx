/**
 * YourSpecialCard — client-facing "★ SwanStudios Special" surface in the store (S3).
 *
 * Self-gating + self-fetching: renders null unless the logged-in CLIENT has an active
 * per-client special (GET /api/custom-packages/my). "Claim my special" adds the hidden
 * client-scoped StorefrontItem to the cart via the SAME useCart().addToCart the regular
 * buy button uses; the server enforces ownership (S1 guards) and grants the full
 * paid+bonus sessions on payment. Fail-closed: any error/empty => renders null, never
 * blocks the store. Sticker stays $175 — the discount shows only as bonus sessions.
 */
import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { useAuth } from '../../../context/AuthContext';
import { useCart } from '../../../context/CartContext';
import apiService from '../../../services/api.service';

interface MySpecial {
  id: number;
  name: string;
  storefrontItemId: number | null;
  paidSessions: number;
  bonusSessions: number;
  totalSessions: number;
  totalPrice: number | string;
  effectiveHourlyRate: number | string;
  expiresAt: string | null;
  status: string;
}

const money = (n: number | string): string => `$${Math.round(Number(n) || 0).toLocaleString()}`;

const YourSpecialCard: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const { addToCart } = useCart();
  const [specials, setSpecials] = useState<MySpecial[]>([]);
  const [claiming, setClaiming] = useState<number | null>(null);

  const isClient = isAuthenticated && !!user && user.role === 'client';

  useEffect(() => {
    if (!isClient) return;
    let alive = true;
    (async () => {
      try {
        const res = await apiService.get('/api/custom-packages/my');
        const rows: MySpecial[] = (res?.data?.packages ?? []).filter(
          (p: MySpecial) => p.status === 'active' && p.storefrontItemId
        );
        if (alive) setSpecials(rows);
      } catch {
        if (alive) setSpecials([]); // fail-closed: never block the store
      }
    })();
    return () => {
      alive = false;
    };
  }, [isClient]);

  if (!isClient || specials.length === 0) return null;

  const claim = async (s: MySpecial) => {
    if (!s.storefrontItemId || claiming) return;
    setClaiming(s.id);
    try {
      await addToCart({ id: s.storefrontItemId, quantity: 1, name: s.name });
    } catch {
      /* addToCart surfaces its own toast on failure */
    } finally {
      setClaiming(null);
    }
  };

  return (
    <Wrap aria-label="Your SwanStudios Special offers">
      {specials.map((s) => (
        <Card key={s.id}>
          <Main>
            <Tag>★ Your SwanStudios Special</Tag>
            <Sessions>{s.totalSessions} sessions</Sessions>
            <Break>
              {s.paidSessions} paid + <strong>{s.bonusSessions} bonus free</strong>
            </Break>
            <Rows>
              <Row>
                <span>Total</span>
                <b>{money(s.totalPrice)}</b>
              </Row>
              <Row>
                <span>Effective / session</span>
                <b>{money(s.effectiveHourlyRate)}</b>
              </Row>
              {s.expiresAt && (
                <Row>
                  <span>Ends</span>
                  <b>{new Date(s.expiresAt).toLocaleDateString()}</b>
                </Row>
              )}
            </Rows>
          </Main>
          <ClaimButton
            type="button"
            disabled={!s.storefrontItemId || claiming === s.id}
            onClick={() => claim(s)}
          >
            {claiming === s.id ? 'Adding…' : 'Claim my special'}
          </ClaimButton>
        </Card>
      ))}
    </Wrap>
  );
};

export default YourSpecialCard;

/* ── styles: Crystalline Swan, Gilded-Fern "exclusive" accent, Dual-Button Glow ── */
const Wrap = styled.section`
  max-width: 1200px;
  margin: 0 auto 12px;
  padding: 0 clamp(12px, 3vw, 24px);
`;

const Card = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 18px 28px;
  padding: clamp(20px, 3vw, 30px);
  border-radius: 18px;
  color: var(--text-primary, #e0ecf4);
  background: linear-gradient(150deg, rgba(0, 48, 128, 0.92) 0%, rgba(0, 32, 96, 0.94) 55%, rgba(20, 20, 25, 0.96) 100%);
  border: 1px solid var(--gold, #c6a84b);
  box-shadow: 0 10px 34px rgba(0, 0, 0, 0.42), inset 0 0 0 1px rgba(198, 168, 75, 0.14);
  font-family: 'Plus Jakarta Sans', 'Sora', system-ui, sans-serif;
`;

const Main = styled.div`
  flex: 1 1 280px;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const Tag = styled.span`
  align-self: flex-start;
  padding: 4px 12px;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: #0a0a0f;
  background: var(--gold, #c6a84b);
`;

const Sessions = styled.div`
  font-size: clamp(1.8rem, 3.2vw, 2.6rem);
  font-weight: 800;
  line-height: 1.05;
  font-family: 'Sora', 'Plus Jakarta Sans', sans-serif;
`;

const Break = styled.div`
  font-size: 0.98rem;
  color: var(--text-secondary, #c4d6e6);
  strong {
    color: var(--gold, #c6a84b);
  }
`;

const Rows = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px 22px;
  margin-top: 6px;
`;

const Row = styled.div`
  display: inline-flex;
  align-items: baseline;
  gap: 8px;
  font-size: 0.9rem;
  color: var(--text-muted, #9fb4c8);
  b {
    color: var(--text-primary, #e0ecf4);
    font-size: 1rem;
  }
`;

const ClaimButton = styled.button`
  flex: 0 0 auto;
  min-height: 48px;
  padding: 12px 26px;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  border-radius: 12px;
  color: #ffffff;
  background: linear-gradient(135deg, var(--surface-2, #003080), var(--primary, #002060));
  border: 1px solid var(--accent-primary, #60c0f0);
  transition: box-shadow 160ms ease, transform 120ms ease, opacity 140ms ease;
  &:hover:not(:disabled) {
    box-shadow: 0 0 22px rgba(139, 92, 246, 0.55);
    transform: translateY(-1px);
  }
  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
  @media (prefers-reduced-motion: reduce) {
    transition: none;
    &:hover:not(:disabled) {
      transform: none;
    }
  }
  @media (max-width: 720px) {
    flex: 1 1 100%;
  }
`;
