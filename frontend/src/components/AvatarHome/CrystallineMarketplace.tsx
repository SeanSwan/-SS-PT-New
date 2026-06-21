import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ShoppingBag, Diamond, Check, Shirt, Home, Dog,
  AlertTriangle,
} from 'lucide-react';
import apiService from '../../services/api.service';
import {
  BuyBtn,
  CrystalBadge,
  FilterBtn,
  FilterRow,
  Grid,
  Header,
  ItemCard,
  ItemMeta,
  ItemName,
  LoadingSpinner,
  LoadingState,
  Panel,
  PriceTag,
  RarityTag,
  StatusMsg,
  Title,
} from './CrystallineMarketplace.styles';

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

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const asNonEmptyString = (value: unknown): string | null => (
  typeof value === 'string' && value.trim() ? value : null
);

const asFiniteCrystalAmount = (value: unknown): number | null => (
  typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null
);

const normalizeCatalogItem = (value: unknown): CatalogItem | null => {
  if (!isRecord(value)) return null;
  const id = asNonEmptyString(value.id);
  const type = asNonEmptyString(value.type);
  const name = asNonEmptyString(value.name);
  const price = asFiniteCrystalAmount(value.price);
  if (!id || !type || !name || price === null) return null;

  return {
    id,
    type,
    name,
    price,
    rarity: asNonEmptyString(value.rarity) ?? 'common',
    room: asNonEmptyString(value.room) ?? undefined,
    slot: asNonEmptyString(value.slot) ?? undefined,
    species: asNonEmptyString(value.species) ?? undefined,
  };
};

const normalizeOwnedItem = (value: unknown): OwnedItem | null => {
  if (!isRecord(value)) return null;
  const id = asNonEmptyString(value.id);
  const type = asNonEmptyString(value.type);
  const name = asNonEmptyString(value.name);
  if (!id || !type || !name) return null;

  return {
    id,
    type,
    name,
    rarity: asNonEmptyString(value.rarity) ?? 'common',
    equippedIn: asNonEmptyString(value.equippedIn),
  };
};

const normalizeCatalog = (value: unknown): CatalogItem[] => (
  Array.isArray(value) ? value.map(normalizeCatalogItem).filter((item): item is CatalogItem => item !== null) : []
);

const normalizeOwnedItems = (value: unknown): OwnedItem[] => (
  Array.isArray(value) ? value.map(normalizeOwnedItem).filter((item): item is OwnedItem => item !== null) : []
);

const isFulfilled = <T,>(result: PromiseSettledResult<T>): result is PromiseFulfilledResult<T> =>
  result.status === 'fulfilled';

const TYPE_ICONS: Record<string, React.ReactNode> = {
  furniture: <Home size={12} />,
  pet_skin: <Dog size={12} />,
  outfit: <Shirt size={12} />,
};

const MARKETPLACE_LOAD_ERROR = 'Marketplace balances are unavailable. Please try again later.';
const MARKETPLACE_PURCHASE_ERROR = 'Unable to complete purchase. Check your crystals and try again.';
const MARKETPLACE_NETWORK_ERROR = 'Marketplace service is temporarily unavailable. Please try again.';

const CrystallineMarketplace: React.FC = () => {
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [owned, setOwned] = useState<OwnedItem[]>([]);
  const [balance, setBalance] = useState<number | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const purchasingRef = useRef<string | null>(null);

  const fetchData = useCallback(async () => {
    const [catalogResult, crystalResult] = await Promise.allSettled([
      apiService.get<{ success: boolean; data: unknown }>('/api/avatar-home/marketplace'),
      apiService.get<{ success: boolean; data: unknown }>('/api/avatar-home/crystals'),
    ]);
    let readFailed = false;

    if (isFulfilled(catalogResult) && catalogResult.value.data.success) {
      setCatalog(normalizeCatalog(catalogResult.value.data.data));
    } else {
      readFailed = true;
    }

    if (isFulfilled(crystalResult) && crystalResult.value.data.success && isRecord(crystalResult.value.data.data)) {
      const nextBalance = asFiniteCrystalAmount(crystalResult.value.data.data.balance);
      if (nextBalance === null) {
        setBalance(null);
        setOwned([]);
        readFailed = true;
      } else {
        setBalance(nextBalance);
        setOwned(normalizeOwnedItems(crystalResult.value.data.data.ownedItems));
      }
    } else {
      setBalance(null);
      setOwned([]);
      readFailed = true;
    }

    if (readFailed) setStatus({ type: 'error', text: MARKETPLACE_LOAD_ERROR });
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = filter === 'all' ? catalog : catalog.filter(i => i.type === filter);
  const ownedIds = new Set(owned.map(i => i.id));

  const handlePurchase = async (itemId: string) => {
    if (purchasingRef.current || ownedIds.has(itemId)) return;
    purchasingRef.current = itemId;
    setPurchasing(itemId);
    setStatus(null);
    try {
      const res = await apiService.post<{
        success: boolean;
        data?: unknown;
      }>('/api/avatar-home/marketplace/purchase', {
        itemId,
      }, {
        validateStatus: status => status < 500,
      });
      const d = res.data;
      if (d.success && isRecord(d.data)) {
        const purchasedItem = normalizeOwnedItem(d.data.item);
        const crystalBalance = asFiniteCrystalAmount(d.data.crystalBalance);
        if (!purchasedItem || crystalBalance === null) {
          setStatus({ type: 'error', text: MARKETPLACE_PURCHASE_ERROR });
          return;
        }
        setBalance(crystalBalance);
        setOwned(prev => [...prev, purchasedItem]);
        setStatus({ type: 'success', text: `Purchased ${purchasedItem.name}!` });
      } else {
        setStatus({ type: 'error', text: MARKETPLACE_PURCHASE_ERROR });
      }
    } catch {
      setStatus({ type: 'error', text: MARKETPLACE_NETWORK_ERROR });
    } finally {
      purchasingRef.current = null;
      setPurchasing(null);
    }
  };

  if (loading) {
    return (
      <LoadingState role="status" aria-live="polite">
        <LoadingSpinner size={18} aria-hidden="true" /> Loading marketplace...
      </LoadingState>
    );
  }

  return (
    <Panel>
      <Header>
        <Title><ShoppingBag size={18} /> Crystalline Marketplace</Title>
        <CrystalBadge>
          <Diamond size={14} /> {balance === null ? 'Balance unavailable' : `${balance.toLocaleString()} Crystals`}
        </CrystalBadge>
      </Header>

      {status && (
        <StatusMsg $type={status.type} role="status" aria-live="polite">
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
                disabled={isOwned || Boolean(purchasing) || balance === null || balance < item.price}
              >
                {isOwned ? <><Check size={14} /> Owned</> :
                 purchasing === item.id ? 'Purchasing...' :
                 balance === null ? 'Balance unavailable' :
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
