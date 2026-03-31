/**
 * ┌─── SUB-COMPONENT: GardeningTab ────────────────────────────┐
 * │ PARENT: NutritionWorkspace                                  │
 * │ PURPOSE: USDA Hardiness Zone lookup + plant recommendations │
 * │ WIREFRAME:                                                  │
 * │ ┌──────────────────────────────────────┐                    │
 * │ │ [Zip Input] [Look Up Zone]           │                    │
 * │ │ Zone: 7b — Avg Min: 5-10°F          │                    │
 * │ ├──────────────────────────────────────┤                    │
 * │ │ Filters: [Category] [Space] [Diff]  │                    │
 * │ ├──────────────────────────────────────┤                    │
 * │ │ 🌿 Basil — 30 days — Easy           │                    │
 * │ │ 🍅 Tomatoes — 70 days — Moderate     │                    │
 * │ └──────────────────────────────────────┘                    │
 * │ Props: none (self-contained)                                │
 * │ API: GET /api/gardening/zone/:zip, GET /api/gardening/plants│
 * └─────────────────────────────────────────────────────────────┘
 */
import React, { useState, useCallback } from 'react';
import styled from 'styled-components';
import { Sprout, Search, Leaf, Sun, Droplets, Clock, MapPin } from 'lucide-react';

// ── Types ──
interface PlantData {
  id: string;
  name: string;
  category: string;
  difficulty: string;
  spaceType: string[];
  containerFriendly: boolean;
  daysToHarvest: number;
  sunHours: number;
  waterFrequency: string;
  seasonStart: string;
  seasonEnd: string;
  nutritionHighlight: string;
  yieldPerPlant: string;
  companionPlants: string[];
  imageEmoji: string;
}

interface ZoneData {
  zone: string;
  temperatureRange: string | null;
}

const API_BASE = import.meta.env.VITE_API_BASE
  || (import.meta.env.PROD ? '' : 'http://localhost:10000');

// ── Component ──
const GardeningTab: React.FC = () => {
  const [zipCode, setZipCode] = useState('');
  const [zoneData, setZoneData] = useState<ZoneData | null>(null);
  const [plants, setPlants] = useState<PlantData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedPlant, setExpandedPlant] = useState<string | null>(null);

  // Filters
  const [category, setCategory] = useState('');
  const [spaceType, setSpaceType] = useState('');
  const [difficulty, setDifficulty] = useState('');

  const lookupZone = useCallback(async () => {
    if (!/^\d{5}$/.test(zipCode)) {
      setError('Enter a valid 5-digit US zip code');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/api/gardening/zone/${zipCode}`);
      const data = await res.json();

      if (!data.success) {
        setError(data.error || 'Zone not found');
        setLoading(false);
        return;
      }

      setZoneData({ zone: data.zone, temperatureRange: data.temperatureRange });

      // Fetch plants for this zone
      const params = new URLSearchParams({ zone: data.zone });
      if (category) params.set('category', category);
      if (spaceType) params.set('spaceType', spaceType);
      if (difficulty) params.set('difficulty', difficulty);

      const plantRes = await fetch(`${API_BASE}/api/gardening/plants?${params.toString()}`);
      const plantData = await plantRes.json();

      if (plantData.success) {
        setPlants(plantData.plants);
      }
    } catch {
      setError('Failed to look up zone. Check your connection.');
    } finally {
      setLoading(false);
    }
  }, [zipCode, category, spaceType, difficulty]);

  const refetchPlants = useCallback(async (cat: string, space: string, diff: string) => {
    if (!zoneData) return;
    const params = new URLSearchParams({ zone: zoneData.zone });
    if (cat) params.set('category', cat);
    if (space) params.set('spaceType', space);
    if (diff) params.set('difficulty', diff);

    try {
      const res = await fetch(`${API_BASE}/api/gardening/plants?${params.toString()}`);
      const data = await res.json();
      if (data.success) setPlants(data.plants);
    } catch { /* silent */ }
  }, [zoneData]);

  const handleFilterChange = (type: 'category' | 'spaceType' | 'difficulty', value: string) => {
    const newCat = type === 'category' ? value : category;
    const newSpace = type === 'spaceType' ? value : spaceType;
    const newDiff = type === 'difficulty' ? value : difficulty;
    if (type === 'category') setCategory(value);
    if (type === 'spaceType') setSpaceType(value);
    if (type === 'difficulty') setDifficulty(value);
    refetchPlants(newCat, newSpace, newDiff);
  };

  const difficultyColor = (d: string) => {
    if (d === 'easy') return 'var(--accent-primary, #60C0F0)';
    if (d === 'moderate') return '#C6A84B';
    return '#C92A54';
  };

  return (
    <Container>
      {/* Zone Lookup */}
      <ZoneLookup>
        <ZoneIcon><Sprout size={24} /></ZoneIcon>
        <div>
          <ZoneTitle>Find Your Growing Zone</ZoneTitle>
          <ZoneSubtitle>Enter your zip code to discover what thrives in your area</ZoneSubtitle>
        </div>
      </ZoneLookup>

      <SearchRow>
        <ZipInput
          type="text"
          inputMode="numeric"
          placeholder="Enter zip code (e.g., 90210)"
          value={zipCode}
          onChange={(e) => setZipCode(e.target.value.replace(/\D/g, '').slice(0, 5))}
          onKeyDown={(e) => e.key === 'Enter' && lookupZone()}
        />
        <LookupBtn onClick={lookupZone} disabled={loading || zipCode.length !== 5}>
          {loading ? 'Looking up...' : <><Search size={16} /> Look Up</>}
        </LookupBtn>
      </SearchRow>

      {error && <ErrorMsg>{error}</ErrorMsg>}

      {/* Zone Result */}
      {zoneData && (
        <ZoneResult>
          <ZoneBadge>{zoneData.zone.toUpperCase()}</ZoneBadge>
          <div>
            <ZoneLabel>USDA Hardiness Zone {zoneData.zone.toUpperCase()}</ZoneLabel>
            {zoneData.temperatureRange && (
              <ZoneTemp>Avg. Annual Minimum: {zoneData.temperatureRange}</ZoneTemp>
            )}
          </div>
        </ZoneResult>
      )}

      {/* Filters */}
      {zoneData && (
        <FilterRow>
          <FilterSelect value={category} onChange={(e) => handleFilterChange('category', e.target.value)}>
            <option value="">All Types</option>
            <option value="herb">Herbs</option>
            <option value="vegetable">Vegetables</option>
            <option value="fruit">Fruits</option>
            <option value="microgreen">Microgreens</option>
          </FilterSelect>
          <FilterSelect value={spaceType} onChange={(e) => handleFilterChange('spaceType', e.target.value)}>
            <option value="">Any Space</option>
            <option value="indoor">Indoor</option>
            <option value="balcony">Balcony</option>
            <option value="outdoor">Outdoor</option>
          </FilterSelect>
          <FilterSelect value={difficulty} onChange={(e) => handleFilterChange('difficulty', e.target.value)}>
            <option value="">Any Difficulty</option>
            <option value="easy">Easy</option>
            <option value="moderate">Moderate</option>
          </FilterSelect>
        </FilterRow>
      )}

      {/* Plant Grid */}
      {plants.length > 0 && (
        <>
          <SectionHeader>{plants.length} plant{plants.length !== 1 ? 's' : ''} for zone {zoneData?.zone.toUpperCase()}</SectionHeader>
          <PlantGrid>
            {plants.map(plant => (
              <PlantCard
                key={plant.id}
                onClick={() => setExpandedPlant(expandedPlant === plant.id ? null : plant.id)}
              >
                <PlantHeader>
                  <PlantEmoji>{plant.imageEmoji}</PlantEmoji>
                  <div style={{ flex: 1 }}>
                    <PlantName>{plant.name}</PlantName>
                    <PlantMeta>
                      <DiffBadge style={{ color: difficultyColor(plant.difficulty) }}>
                        {plant.difficulty}
                      </DiffBadge>
                      <span>{plant.category}</span>
                      {plant.containerFriendly && <span>container OK</span>}
                    </PlantMeta>
                  </div>
                  <HarvestDays>{plant.daysToHarvest}d</HarvestDays>
                </PlantHeader>

                {expandedPlant === plant.id && (
                  <PlantDetails>
                    <DetailRow><Sun size={14} /><span>{plant.sunHours}+ hours sunlight</span></DetailRow>
                    <DetailRow><Droplets size={14} /><span>Water: {plant.waterFrequency}</span></DetailRow>
                    <DetailRow><Clock size={14} /><span>Season: {plant.seasonStart} — {plant.seasonEnd}</span></DetailRow>
                    <DetailRow><MapPin size={14} /><span>Space: {plant.spaceType.join(', ')}</span></DetailRow>
                    <NutritionNote><Leaf size={14} /> {plant.nutritionHighlight}</NutritionNote>
                    <YieldNote>Yield: {plant.yieldPerPlant}</YieldNote>
                    {plant.companionPlants.length > 0 && (
                      <CompanionNote>Companion plants: {plant.companionPlants.join(', ')}</CompanionNote>
                    )}
                  </PlantDetails>
                )}
              </PlantCard>
            ))}
          </PlantGrid>
        </>
      )}

      {zoneData && plants.length === 0 && !loading && (
        <EmptyState>No plants found for these filters. Try broadening your selection.</EmptyState>
      )}
    </Container>
  );
};

export default GardeningTab;

// ── Styled Components ──
const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const ZoneLookup = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
`;

const ZoneIcon = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: linear-gradient(135deg, rgba(96, 192, 240, 0.15), rgba(139, 92, 246, 0.1));
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 15%, transparent);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--accent-primary, #60C0F0);
`;

const ZoneTitle = styled.h3`
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Plus Jakarta Sans', sans-serif;
`;

const ZoneSubtitle = styled.p`
  margin: 2px 0 0;
  font-size: 13px;
  color: var(--text-muted, rgba(224, 236, 244, 0.5));
`;

const SearchRow = styled.div`
  display: flex;
  gap: 8px;
`;

const ZipInput = styled.input`
  flex: 1;
  padding: 12px 16px;
  border-radius: 10px;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.12));
  background: var(--bg-elevated, #141419);
  color: var(--text-primary, #E0ECF4);
  font-size: 15px;
  min-height: 44px;
  &::placeholder { color: var(--text-muted, rgba(224, 236, 244, 0.4)); }
  &:focus { outline: 2px solid var(--accent-primary, #60C0F0); outline-offset: -2px; }
`;

const LookupBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 20px;
  border-radius: 10px;
  border: none;
  background: linear-gradient(135deg, var(--accent-secondary, #8B5CF6), var(--accent-primary, #60C0F0));
  color: white;
  font-weight: 600;
  font-size: 14px;
  min-height: 44px;
  cursor: pointer;
  white-space: nowrap;
  &:disabled { opacity: 0.5; cursor: not-allowed; }
  &:hover:not(:disabled) { filter: brightness(1.1); }
  &:active:not(:disabled) { transform: scale(0.97); }
`;

const ErrorMsg = styled.div`
  padding: 10px 14px;
  border-radius: 8px;
  background: rgba(201, 42, 84, 0.1);
  border-left: 3px solid #C92A54;
  color: var(--text-primary, #E0ECF4);
  font-size: 13px;
`;

const ZoneResult = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  border-radius: 12px;
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 6%, var(--bg-elevated, #141419));
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 15%, transparent);
`;

const ZoneBadge = styled.div`
  width: 52px;
  height: 52px;
  border-radius: 12px;
  background: linear-gradient(135deg, var(--accent-secondary, #8B5CF6), var(--accent-primary, #60C0F0));
  color: white;
  font-weight: 800;
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`;

const ZoneLabel = styled.div`
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary, #E0ECF4);
`;

const ZoneTemp = styled.div`
  font-size: 13px;
  color: var(--text-secondary, rgba(224, 236, 244, 0.6));
  margin-top: 2px;
`;

const FilterRow = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

const FilterSelect = styled.select`
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.12));
  background: var(--bg-elevated, #141419);
  color: var(--text-primary, #E0ECF4);
  font-size: 13px;
  min-height: 44px;
  cursor: pointer;
  &:focus { outline: 2px solid var(--accent-primary, #60C0F0); outline-offset: -2px; }
`;

const SectionHeader = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: var(--text-muted, rgba(224, 236, 244, 0.5));
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const PlantGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const PlantCard = styled.div`
  border-radius: 12px;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.08));
  background: var(--bg-surface, #1A1A24);
  overflow: hidden;
  cursor: pointer;
  transition: border-color 0.15s;
  &:hover { border-color: color-mix(in srgb, var(--accent-primary, #60C0F0) 25%, transparent); }
`;

const PlantHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
`;

const PlantEmoji = styled.div`
  font-size: 28px;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 6%, transparent);
  flex-shrink: 0;
`;

const PlantName = styled.div`
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary, #E0ECF4);
`;

const PlantMeta = styled.div`
  display: flex;
  gap: 8px;
  font-size: 12px;
  color: var(--text-muted, rgba(224, 236, 244, 0.5));
  margin-top: 2px;
  text-transform: capitalize;
`;

const DiffBadge = styled.span`
  font-weight: 600;
`;

const HarvestDays = styled.div`
  font-size: 14px;
  font-weight: 700;
  color: var(--accent-primary, #60C0F0);
  white-space: nowrap;
`;

const PlantDetails = styled.div`
  padding: 0 16px 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  border-top: 1px solid var(--border-soft, rgba(96, 192, 240, 0.06));
  padding-top: 12px;
`;

const DetailRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--text-secondary, rgba(224, 236, 244, 0.6));
  svg { color: var(--accent-primary, #60C0F0); flex-shrink: 0; }
`;

const NutritionNote = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 13px;
  color: var(--accent-gold, #C6A84B);
  background: rgba(198, 168, 75, 0.06);
  padding: 8px 12px;
  border-radius: 8px;
  svg { flex-shrink: 0; margin-top: 1px; }
`;

const YieldNote = styled.div`
  font-size: 12px;
  color: var(--text-muted, rgba(224, 236, 244, 0.5));
`;

const CompanionNote = styled.div`
  font-size: 12px;
  color: var(--text-muted, rgba(224, 236, 244, 0.5));
  font-style: italic;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 32px;
  color: var(--text-muted, rgba(224, 236, 244, 0.5));
  font-size: 14px;
`;
