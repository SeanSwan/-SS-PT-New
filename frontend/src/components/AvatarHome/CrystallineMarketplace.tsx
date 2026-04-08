/**
 * ┌─── COMPONENT: CrystallineMarketplace ───────────────────────┐
 * │ PURPOSE: In-app marketplace for furniture, pet skins, and   │
 * │ outfits. Uses crystal currency earned through gameplay.     │
 * │ PHASE 3: Crystalline Marketplace.                           │
 * │ CEO RULING: No real-money IAP — crystals from XP/gameplay.  │
 * └─────────────────────────────────────────────────────────────┘
 */

import React, { useState, useEffect, useCallback } from 'react';
import styled, { keyframes } from 'styled-components';
import {
  ShoppingBag, Diamond, Check, Shirt, Home, Dog,
  Loader, AlertTriangle,
} from 'lucide-react';

interface CatalogItem {
  id: string;
  type: string;
  name: string;
  price: number;
  rarity: string;
  room?: string;
  slot?: string;
  species?: string;
}

interface OwnedItem {
  id: string;
  type: string;
  name: string;
  rarity: string;
  equippedIn: string | null;
}

const RARITY_COLORS: Record<string, string> = {
  common: '#4070C0',
  rare: '#C6A84B',
  epic: '#8B5CF6',
  legendary: '#60C0F0',
};

const legendaryGlow = keyframes`
  0% { box-shadow: 0 0 6px rgba(198, 168, 75, 0.3); }
  33% { box-shadow: 0 0 6px rgba(139, 92, 246, 0.3); }
  66% { box-shadow: 0 0 6px rgba(96, 192, 240, 0.3); }
  100% { box-shadow: 0 0 6px rgba(198, 168, 75, 0.3); }
`;

const Panel = styled.div`padding: 0;`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 8px;
`;

const Title = styled.h3`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary, #E0ECF4);
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const CrystalBadge = styled.div`
  padding: 6px 14px;
  border-radius: 8px;
  background: rgba(96, 192, 240, 0.08);
  border: 1px solid rgba(96, 192, 240, 0.2);
  font-family: 'Fira Code', monospace;
  font-size: 13px;
  color: var(--accent-primary, #60C0F0);
  display: flex;
  align-items: center;
  gap: 6px;
`;

const FilterRow = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  flex-wrap: wrap;
`;

const FilterBtn = styled.button<{ $active: boolean }>`
  min-height: 36px;
  padding: 6px 14px;
  border-radius: 8px;
  border: 1px solid ${({ $active }) => $active ? 'var(--accent-primary, #60C0F0)' : 'rgba(96, 192, 240, 0.15)'};
  background: ${({ $active }) => $active ? 'rgba(96, 192, 240, 0.1)' : 'transparent'};
  color: ${({ $active }) => $active ? 'var(--accent-primary, #60C0F0)' : 'var(--text-secondary, rgba(224, 236, 244, 0.65))'};
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  &:hover { border-color: var(--accent-primary, #60C0F0); }
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 14px;
`;

const ItemCard = styled.div<{ $rarity: string; $owned: boolean }>`
  padding: 16px;
  border-radius: 12px;
  background: var(--bg-elevated, #141419);
  border: 2px solid ${({ $rarity }) => RARITY_COLORS[$rarity] || RARITY_COLORS.common}40;
  ${({ $rarity }) => $rarity === 'legendary' ? `animation: ${legendaryGlow} 3s ease-in-out infinite;` : ''}
  opacity: ${({ $owned }) => $owned ? 0.7 : 1};
  transition: transform 0.15s;
  &:hover { transform: translateY(-2px); }
`;

const ItemName = styled.div`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 13px;
  font-weight: 700;
  color: var(--text-primary, #E0ECF4);
  margin-bottom: 4px;
`;

const ItemMeta = styled.div`
  font-family: 'Fira Code', monospace;
  font-size: 10px;
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
`;

const RarityTag = styled.span<{ $rarity: string }>`
  color: ${({ $rarity }) => RARITY_COLORS[$rarity] || '#4070C0'};
  text-transform: uppercase;
  font-weight: 700;
`;

const PriceTag = styled.span`
  color: var(--accent-primary, #60C0F0);
  display: flex;
  align-items: center;
  gap: 3px;
`;

const BuyBtn = styled.button<{ $owned: boolean }>`
  min-height: 44px;
  width: 100%;
  border: none;
  border-radius: 8px;
  background: ${({ $owned }) => $owned ? 'rgba(16, 185, 129, 0.1)' : 'linear-gradient(135deg, #002060, #8B5CF6)'};
  color: ${({ $owned }) => $owned ? '#10B981' : '#E0ECF4'};
  ${({ $owned }) => $owned ? 'border: 1px solid rgba(16, 185, 129, 0.2);' : ''}
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  font-weight: 600;
  cursor: ${({ $owned }) => $owned ? 'default' : 'pointer'};
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  &:disabled { opacity: 0.4; cursor: not-allowed; }
  &:hover:not(:disabled) { opacity: 0.85; }
`;

const StatusMsg = styled.div<{ $type: 'success' | 'error' }>`
  padding: 10px 14px;
  border-radius: 8px;
  margin-bottom: 16px;
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  background: ${({ $type }) => $type === 'success' ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)'};
  border: 1px solid ${({ $type }) => $type === 'success' ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)'};
  color: ${({ $type }) => $type === 'success' ? '#10B981' : '#EF4444'};
`;

const TYPE_ICONS: Record<string, React.ReactNode> = {
  furniture: <Home size={12} />,
  pet_skin: <Dog size={12} />,
  outfit: <Shirt size={12} />,
};

const CrystallineMarketplace: React.FC = () => {
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [owned, setOwned] = useState<OwnedItem[]>([]);
  const [balance, setBalance] = useState(0);
  const [filter, setFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const token = localStorage.getItem('token');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const fetchData = useCallback(async () => {
    try {
      const [catalogRes, crystalRes] = await Promise.all([
        fetch('/api/avatar-home/marketplace', { headers }),
        fetch('/api/avatar-home/crystals', { headers }),
      ]);
      const catalogD = await catalogRes.json();
      const crystalD = await crystalRes.json();
      if (catalogD.success) setCatalog(catalogD.data);
      if (crystalD.success) {
        setBalance(crystalD.data.balance);
        setOwned(crystalD.data.ownedItems);
      }
    } catch { /* best-effort */ }
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handlePurchase = async (itemId: string) => {
    setPurchasing(itemId);
    setStatus(null);
    try {
      const res = await fetch('/api/avatar-home/marketplace/purchase', {
        method: 'POST',
        headers,
        body: JSON.stringify({ itemId }),
      });
      const d = await res.json();
      if (d.success) {
        setBalance(d.data.crystalBalance);
        setOwned(prev => [...prev, d.data.item]);
        setStatus({ type: 'success', text: `Purchased ${d.data.item.name}!` });
      } else {
        setStatus({ type: 'error', text: d.message || 'Purchase failed' });
      }
    } catch {
      setStatus({ type: 'error', text: 'Network error' });
    }
    setPurchasing(null);
  };

  const filtered = filter === 'all' ? catalog : catalog.filter(i => i.type === filter);
  const ownedIds = new Set(owned.map(i => i.id));

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 48, gap: 8, color: 'rgba(224,236,244,0.7)' }}>
        <Loader size={18} style={{ animation: 'spin 1s linear infinite' }} /> Loading marketplace...
      </div>
    );
  }

  return (
    <Panel>
      <Header>
        <Title><ShoppingBag size={18} /> Crystalline Marketplace</Title>
        <CrystalBadge><Diamond size={14} /> {balance.toLocaleString()} Crystals</CrystalBadge>
      </Header>

      {status && (
        <StatusMsg $type={status.type}>
          {status.type === 'success' ? <Check size={14} /> : <AlertTriangle size={14} />}
          {status.text}
        </StatusMsg>
      )}

      <FilterRow>
        {[
          ['all', 'All'],
          ['furniture', 'Furniture'],
          ['pet_skin', 'Pet Skins'],
          ['outfit', 'Outfits'],
        ].map(([key, label]) => (
          <FilterBtn key={key} $active={filter === key} onClick={() => setFilter(key)}>
            {TYPE_ICONS[key]} {label}
          </FilterBtn>
        ))}
      </FilterRow>

      <Grid>
        {filtered.map(item => {
          const isOwned = ownedIds.has(item.id);
          return (
            <ItemCard key={item.id} $rarity={item.rarity} $owned={isOwned}>
              <ItemName>{item.name}</ItemName>
              <ItemMeta>
                <RarityTag $rarity={item.rarity}>{item.rarity}</RarityTag>
                {TYPE_ICONS[item.type]}
                <PriceTag><Diamond size={10} /> {item.price}</PriceTag>
              </ItemMeta>
              <BuyBtn
                $owned={isOwned}
                onClick={() => !isOwned && handlePurchase(item.id)}
                disabled={isOwned || purchasing === item.id || balance < item.price}
              >
                {isOwned ? <><Check size={14} /> Owned</> :
                 purchasing === item.id ? 'Purchasing...' :
                 balance < item.price ? 'Not enough crystals' :
                 <><Diamond size={14} /> Buy for {item.price}</>}
              </BuyBtn>
            </ItemCard>
          );
        })}
      </Grid>
    </Panel>
  );
};

export default CrystallineMarketplace;
