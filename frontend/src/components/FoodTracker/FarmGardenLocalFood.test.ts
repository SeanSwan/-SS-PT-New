import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const readSource = (relativePath: string) =>
  readFileSync(resolve(process.cwd(), relativePath), 'utf8');

describe('Farm Finder and Garden local food handoff', () => {
  it('wires Farm Finder to protected zip, nearby, detail, and local-food context flows', () => {
    const farmSource = readSource('src/components/FoodTracker/FarmFinderTab.tsx');
    const farmRoutesSource = readSource('../backend/routes/farmFinderRoutes.mjs');

    expect(farmSource).toContain("import LocalFoodActionPanel from './LocalFoodActionPanel'");
    expect(farmSource).toContain('apiService.get(`/api/farms/search?zip=${zipCode}`)');
    expect(farmSource).toContain('apiService.get(`/api/farms/nearby?lat=${position.coords.latitude}&lng=${position.coords.longitude}`)');
    expect(farmSource).toContain('apiService.get(`/api/farms/detail/${marketId}`)');
    expect(farmSource).toContain('USDA market data does not guarantee organic, pesticide, or bioengineered/GMO details');
    expect(farmRoutesSource).toContain("router.get('/nearby'");
  });

  it('wires garden recommendations into Nutrition OS local-food context without certainty claims', () => {
    const gardenSource = readSource('src/components/FoodTracker/GardeningTab.tsx');
    const panelSource = readSource('src/components/FoodTracker/LocalFoodActionPanel.tsx');
    const combinedSource = `${gardenSource}\n${panelSource}`;

    expect(gardenSource).toContain("import LocalFoodActionPanel from './LocalFoodActionPanel'");
    expect(gardenSource).toContain('Grow foods that support your macro gaps');
    expect(gardenSource).toContain('Confirm seeds, starts, organic practices, and local timing with a nursery or farmer.');
    expect(panelSource).toContain('nutrition:local-food-context');
    expect(panelSource).toContain('Do you use bioengineered/GMO seeds?');

    for (const forbidden of ['GMO is unhealthy', 'certified organic by Swan', 'safe to eat', 'chemical-free']) {
      expect(combinedSource, forbidden).not.toContain(forbidden);
    }
  });
});
