/**
 * SUB-COMPONENT: GardeningTab
 * PARENT: NutritionWorkspace
 * PURPOSE: USDA Hardiness Zone lookup, plant recommendations, and Nutrition OS garden handoff
 * API: GET /api/gardening/zone/:zip, GET /api/gardening/plants?zone=&...
 */
import React, { useState, useCallback } from 'react';
import { Sprout, Search, Leaf, Sun, Droplets, Clock, MapPin } from 'lucide-react';
import {
  Container, ZoneLookup, ZoneIcon, ZoneTitle, ZoneSubtitle,
  SearchRow, ZipInput, LookupBtn, ErrorMsg,
  ZoneResult, ZoneBadge, ZoneLabel, ZoneTemp,
  FilterRow, FilterSelect, SectionHeader,
  PlantGrid, PlantCard, PlantHeader, PlantEmoji, PlantName,
  PlantMeta, DiffBadge, HarvestDays,
  PlantDetails, DetailRow, NutritionNote, YieldNote, CompanionNote,
  EmptyState,
} from './GardeningTab.styles';
import apiService from '../../services/api.service';
import LocalFoodActionPanel from './LocalFoodActionPanel';

const GARDENING_ZONE_ERROR = 'Growing zone lookup is unavailable right now. Please try again.';
const GARDENING_PLANTS_ERROR = 'Plant recommendations are unavailable right now. Please try again.';
const GARDEN_SOURCE_NOTE = 'Garden recommendations are Swan planning guidance from zone and plant data. Confirm seeds, starts, organic practices, and local timing with a nursery or farmer.';

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

const difficultyColor = (d: string) => {
  if (d === 'easy') return 'var(--accent-primary, #60C0F0)';
  if (d === 'moderate') return 'var(--accent-gold, #C6A84B)';
  return 'var(--accent-error, #C92A54)';
};

const gardenProducts = (plants: PlantData[]) => plants
  .map(plant => plant.name)
  .filter(Boolean)
  .slice(0, 8);

const GardeningTab: React.FC = () => {
  const [zipCode, setZipCode] = useState('');
  const [zoneData, setZoneData] = useState<ZoneData | null>(null);
  const [plants, setPlants] = useState<PlantData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedPlant, setExpandedPlant] = useState<string | null>(null);
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
      const response = await apiService.get(`/api/gardening/zone/${zipCode}`);
      const data = response.data;
      if (!data.success) {
        setError(GARDENING_ZONE_ERROR);
        setLoading(false);
        return;
      }
      setZoneData({ zone: data.zone, temperatureRange: data.temperatureRange });
      const params = new URLSearchParams({ zone: data.zone });
      if (category) params.set('category', category);
      if (spaceType) params.set('spaceType', spaceType);
      if (difficulty) params.set('difficulty', difficulty);
      const plantResponse = await apiService.get(`/api/gardening/plants?${params}`);
      const plantData = plantResponse.data;
      if (plantData.success) {
        setPlants(plantData.plants);
      } else {
        setError(GARDENING_PLANTS_ERROR);
      }
    } catch {
      setError(GARDENING_ZONE_ERROR);
    } finally {
      setLoading(false);
    }
  }, [zipCode, category, spaceType, difficulty]);

  const refetchPlants = useCallback(async (cat: string, space: string, diff: string) => {
    if (!zoneData) return;
    setPlants([]);
    const params = new URLSearchParams({ zone: zoneData.zone });
    if (cat) params.set('category', cat);
    if (space) params.set('spaceType', space);
    if (diff) params.set('difficulty', diff);
    try {
      const response = await apiService.get(`/api/gardening/plants?${params}`);
      const data = response.data;
      if (data.success) {
        setPlants(data.plants);
      } else {
        setError(GARDENING_PLANTS_ERROR);
      }
    } catch {
      setError(GARDENING_PLANTS_ERROR);
    }
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

  const safeZone = zoneData?.zone?.toUpperCase() ?? '';
  const localGardenProducts = gardenProducts(plants);

  return (
    <Container>
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

      {zoneData && safeZone && (
        <ZoneResult>
          <ZoneBadge>{safeZone}</ZoneBadge>
          <div>
            <ZoneLabel>USDA Hardiness Zone {safeZone}</ZoneLabel>
            {zoneData.temperatureRange && (
              <ZoneTemp>Avg. Annual Minimum: {zoneData.temperatureRange}</ZoneTemp>
            )}
          </div>
        </ZoneResult>
      )}

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

      {zoneData && plants.length > 0 && (
        <LocalFoodActionPanel
          title="Grow foods that support your macro gaps"
          subtitle="Use garden picks as grocery, meal-plan, and local sourcing context for your Nutrition OS."
          products={localGardenProducts}
          contextType="garden"
          sourceNote={GARDEN_SOURCE_NOTE}
        />
      )}

      {plants.length > 0 && (
        <>
          <SectionHeader>{plants.length} plant{plants.length !== 1 ? 's' : ''} for zone {safeZone}</SectionHeader>
          <PlantGrid>
            {plants.map(plant => (
              <PlantCard
                key={plant.id}
                type="button"
                aria-expanded={expandedPlant === plant.id}
                aria-label={`${plant.name} - ${plant.difficulty}, ${plant.daysToHarvest} days to harvest`}
                onClick={() => setExpandedPlant(expandedPlant === plant.id ? null : plant.id)}
              >
                <PlantHeader>
                  <PlantEmoji aria-hidden="true">{plant.imageEmoji}</PlantEmoji>
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
                    <DetailRow><Clock size={14} /><span>Season: {plant.seasonStart} - {plant.seasonEnd}</span></DetailRow>
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
