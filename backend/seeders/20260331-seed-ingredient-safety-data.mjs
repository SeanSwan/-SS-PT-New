/**
 * ============================================================================
 * FILE: 20260331-seed-ingredient-safety-data.mjs
 * PURPOSE: Seed FoodIngredient table with IARC Group 1 carcinogens,
 *          EU-banned additives, and common concerning additives
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-31
 * ============================================================================
 *
 * Sources:
 * - IARC Monographs (Group 1 confirmed carcinogens found in food/additives)
 * - EU Regulation (EC) No 1333/2008 on food additives
 * - FDA Generally Recognized as Safe (GRAS) vs. non-GRAS list
 * - EWG Food Scores database
 *
 * Run: node backend/seeders/20260331-seed-ingredient-safety-data.mjs
 */
import sequelize from '../database.mjs';
import FoodIngredient from '../models/FoodIngredient.mjs';

const SAFETY_DATA = [
  // ── IARC Group 1 (Confirmed Carcinogens in Food Context) ──
  {
    name: 'Aflatoxins',
    healthRating: 'bad',
    category: 'contaminant',
    iarcGroup: '1',
    isEUBanned: false,
    bannedRegions: [],
    isProcessed: false,
    healthConcerns: ['Liver cancer', 'Found in improperly stored grains, peanuts, tree nuts'],
    healthierAlternatives: ['Properly stored nuts and grains'],
    description: 'Naturally occurring mycotoxins from Aspergillus molds. FDA action level: 20 ppb.',
  },
  {
    name: 'Acetaldehyde',
    healthRating: 'bad',
    category: 'flavoring',
    iarcGroup: '1',
    isEUBanned: false,
    bannedRegions: [],
    isProcessed: true,
    healthConcerns: ['Carcinogenic when associated with alcohol consumption', 'Upper digestive tract cancer'],
    healthierAlternatives: ['Natural fruit flavors'],
    description: 'Used as flavoring in some processed foods. IARC Group 1 in context of alcoholic beverages.',
  },
  {
    name: 'Processed Meat',
    healthRating: 'bad',
    category: 'food_type',
    iarcGroup: '1',
    isEUBanned: false,
    bannedRegions: [],
    isProcessed: true,
    healthConcerns: ['Colorectal cancer', 'Each 50g/day increases risk ~18%'],
    healthierAlternatives: ['Fresh unprocessed meat', 'Plant-based protein', 'Fish'],
    description: 'IARC classified processed meat (hot dogs, bacon, sausage, deli meat) as Group 1 carcinogen.',
  },

  // ── EU-Banned Food Additives (Still Legal in US) ──
  {
    name: 'Red Dye 3',
    healthRating: 'bad',
    category: 'artificial_color',
    iarcGroup: '2B',
    isEUBanned: true,
    bannedRegions: ['EU'],
    isProcessed: true,
    healthConcerns: ['Thyroid tumors in animal studies', 'Banned in EU cosmetics, restricted in food'],
    healthierAlternatives: ['Beet juice', 'Paprika extract', 'Carmine'],
    description: 'Erythrosine (E127). FDA announced phase-out in US by Jan 2027.',
  },
  {
    name: 'Red 40',
    healthRating: 'okay',
    category: 'artificial_color',
    iarcGroup: null,
    isEUBanned: false,
    bannedRegions: [],
    isProcessed: true,
    healthConcerns: ['Requires warning label in EU', 'May cause hyperactivity in children'],
    healthierAlternatives: ['Beet juice', 'Lycopene', 'Anthocyanins'],
    description: 'Allura Red AC (E129). Most common food dye in US. EU requires warning label.',
  },
  {
    name: 'Yellow 5',
    healthRating: 'okay',
    category: 'artificial_color',
    iarcGroup: null,
    isEUBanned: false,
    bannedRegions: [],
    isProcessed: true,
    healthConcerns: ['Requires warning label in EU', 'Hyperactivity in children', 'Allergic reactions'],
    healthierAlternatives: ['Turmeric', 'Annatto', 'Saffron'],
    description: 'Tartrazine (E102). EU requires "may have adverse effect on activity and attention in children" label.',
  },
  {
    name: 'Yellow 6',
    healthRating: 'okay',
    category: 'artificial_color',
    iarcGroup: null,
    isEUBanned: false,
    bannedRegions: [],
    isProcessed: true,
    healthConcerns: ['Requires warning label in EU', 'Hyperactivity link', 'Allergic reactions'],
    healthierAlternatives: ['Paprika oleoresin', 'Beta-carotene'],
    description: 'Sunset Yellow FCF (E110). EU warning label required.',
  },
  {
    name: 'Blue 1',
    healthRating: 'okay',
    category: 'artificial_color',
    iarcGroup: null,
    isEUBanned: false,
    bannedRegions: [],
    isProcessed: true,
    healthConcerns: ['Possible chromosomal damage', 'Allergic reactions'],
    healthierAlternatives: ['Spirulina extract', 'Butterfly pea flower'],
    description: 'Brilliant Blue FCF (E133). Banned in some EU countries for certain food uses.',
  },
  {
    name: 'Titanium Dioxide',
    healthRating: 'bad',
    category: 'whitening_agent',
    iarcGroup: '2B',
    isEUBanned: true,
    bannedRegions: ['EU'],
    isProcessed: true,
    healthConcerns: ['Genotoxicity concerns', 'Banned as food additive in EU since 2022'],
    healthierAlternatives: ['Calcium carbonate', 'Rice starch'],
    description: 'E171. Banned in EU food since Aug 2022. Still FDA-approved in US.',
  },
  {
    name: 'Potassium Bromate',
    healthRating: 'bad',
    category: 'flour_treatment',
    iarcGroup: '2B',
    isEUBanned: true,
    bannedRegions: ['EU', 'UK', 'Canada', 'Brazil', 'China', 'India'],
    isProcessed: true,
    healthConcerns: ['Kidney tumors in animals', 'Thyroid tumors', 'Banned in most countries'],
    healthierAlternatives: ['Ascorbic acid (vitamin C)', 'Enzymes'],
    description: 'Used in some US bread flour. Banned in EU, UK, Canada, and many other countries.',
  },
  {
    name: 'Brominated Vegetable Oil',
    healthRating: 'bad',
    category: 'emulsifier',
    iarcGroup: null,
    isEUBanned: true,
    bannedRegions: ['EU', 'Japan', 'India'],
    isProcessed: true,
    healthConcerns: ['Bromine accumulation', 'Thyroid disruption', 'Neurological effects'],
    healthierAlternatives: ['Sucrose acetate isobutyrate', 'Glycerol ester of rosin'],
    description: 'BVO. FDA revoked authorization in July 2024. Was used in citrus-flavored sodas.',
  },
  {
    name: 'Azodicarbonamide',
    healthRating: 'bad',
    category: 'flour_bleaching',
    iarcGroup: null,
    isEUBanned: true,
    bannedRegions: ['EU', 'UK', 'Australia', 'Singapore'],
    isProcessed: true,
    healthConcerns: ['Respiratory sensitizer', 'Linked to asthma', 'Decomposes to semicarbazide (possible carcinogen)'],
    healthierAlternatives: ['Ascorbic acid', 'Enzyme-based improvers'],
    description: 'ADA. Used as dough conditioner in US bread. Banned in EU and many countries.',
  },
  {
    name: 'BHA',
    healthRating: 'bad',
    category: 'preservative',
    iarcGroup: '2B',
    isEUBanned: false,
    bannedRegions: ['Japan'],
    isProcessed: true,
    healthConcerns: ['Possible carcinogen (IARC 2B)', 'Endocrine disruptor', 'Stomach cancer in animal studies'],
    healthierAlternatives: ['Rosemary extract', 'Vitamin E (tocopherols)'],
    description: 'Butylated hydroxyanisole (E320). IARC Group 2B. Restricted in some countries.',
  },
  {
    name: 'BHT',
    healthRating: 'okay',
    category: 'preservative',
    iarcGroup: '3',
    isEUBanned: false,
    bannedRegions: [],
    isProcessed: true,
    healthConcerns: ['Possible endocrine effects', 'Conflicting study results'],
    healthierAlternatives: ['Rosemary extract', 'Vitamin E'],
    description: 'Butylated hydroxytoluene (E321). IARC Group 3 (not classifiable). Less concern than BHA.',
  },
  {
    name: 'TBHQ',
    healthRating: 'okay',
    category: 'preservative',
    iarcGroup: null,
    isEUBanned: false,
    bannedRegions: [],
    isProcessed: true,
    healthConcerns: ['Nausea at high doses', 'May affect immune system', 'Found in fast food'],
    healthierAlternatives: ['Rosemary extract', 'Natural tocopherols'],
    description: 'Tert-butylhydroquinone. Common in processed/fast food oils. FDA limit: 0.02% of fat.',
  },
  {
    name: 'Propylparaben',
    healthRating: 'bad',
    category: 'preservative',
    iarcGroup: null,
    isEUBanned: true,
    bannedRegions: ['EU'],
    isProcessed: true,
    healthConcerns: ['Endocrine disruptor', 'Estrogenic activity', 'Banned in EU food since 2006'],
    healthierAlternatives: ['Potassium sorbate', 'Sodium benzoate'],
    description: 'E216. Banned as food preservative in EU. Still FDA-approved in US.',
  },

  // ── Controversial Sweeteners ──
  {
    name: 'Aspartame',
    healthRating: 'okay',
    category: 'artificial_sweetener',
    iarcGroup: '2B',
    isEUBanned: false,
    bannedRegions: [],
    isProcessed: true,
    healthConcerns: ['IARC Group 2B (possibly carcinogenic) since July 2023', 'WHO/JECFA maintained safe intake level at 40mg/kg/day'],
    healthierAlternatives: ['Stevia', 'Monk fruit extract', 'Erythritol'],
    description: 'E951. IARC classified as 2B in 2023. WHO says safe at current intake levels. Fibromyalgia patients should avoid.',
  },
  {
    name: 'Sucralose',
    healthRating: 'okay',
    category: 'artificial_sweetener',
    iarcGroup: null,
    isEUBanned: false,
    bannedRegions: [],
    isProcessed: true,
    healthConcerns: ['May alter gut microbiome', 'Produces harmful compounds when heated', 'DNA damage concerns at high doses'],
    healthierAlternatives: ['Stevia', 'Monk fruit', 'Erythritol'],
    description: 'E955. Splenda. Generally considered safe but emerging research raises concerns about gut health.',
  },
  {
    name: 'Acesulfame Potassium',
    healthRating: 'okay',
    category: 'artificial_sweetener',
    iarcGroup: null,
    isEUBanned: false,
    bannedRegions: [],
    isProcessed: true,
    healthConcerns: ['May affect gut microbiome', 'Some studies show metabolic effects'],
    healthierAlternatives: ['Stevia', 'Monk fruit'],
    description: 'Ace-K (E950). Often combined with aspartame. FDA-approved since 1988.',
  },

  // ── MSG and Related ──
  {
    name: 'Monosodium Glutamate',
    healthRating: 'okay',
    category: 'flavor_enhancer',
    iarcGroup: null,
    isEUBanned: false,
    bannedRegions: [],
    isProcessed: true,
    healthConcerns: ['Can trigger headaches in sensitive individuals', 'Fibromyalgia patients should avoid', 'FDA GRAS but controversial'],
    healthierAlternatives: ['Nutritional yeast', 'Mushroom powder', 'Seaweed'],
    description: 'E621. FDA recognizes as GRAS. Some individuals report sensitivity. Fibromyalgia trigger.',
  },

  // ── Trans Fat Sources ──
  {
    name: 'Partially Hydrogenated Oil',
    healthRating: 'bad',
    category: 'fat',
    iarcGroup: null,
    isEUBanned: true,
    bannedRegions: ['EU', 'US', 'Canada'],
    isProcessed: true,
    healthConcerns: ['Primary dietary source of trans fat', 'Heart disease', 'FDA banned in US (2018, enforced 2020)'],
    healthierAlternatives: ['Olive oil', 'Avocado oil', 'Coconut oil'],
    description: 'Major source of artificial trans fat. Banned in US since 2020 and EU since 2021.',
  },

  // ── Nitrates/Nitrites ──
  {
    name: 'Sodium Nitrite',
    healthRating: 'bad',
    category: 'preservative',
    iarcGroup: '2A',
    isEUBanned: false,
    bannedRegions: [],
    isProcessed: true,
    healthConcerns: ['Forms nitrosamines (IARC Group 2A: probably carcinogenic)', 'Colorectal cancer risk', 'Found in cured/processed meats'],
    healthierAlternatives: ['Celery juice powder (natural nitrate)', 'Fresh unprocessed meat'],
    description: 'E250. Used in bacon, hot dogs, deli meat. Nitrosamines formed during cooking are IARC 2A.',
  },
  {
    name: 'Sodium Nitrate',
    healthRating: 'okay',
    category: 'preservative',
    iarcGroup: '2A',
    isEUBanned: false,
    bannedRegions: [],
    isProcessed: true,
    healthConcerns: ['Converts to nitrite in body', 'Same nitrosamine concerns as sodium nitrite'],
    healthierAlternatives: ['Celery powder', 'Fresh meat'],
    description: 'E251. Less direct concern than nitrite but converts to nitrite during digestion.',
  },

  // ── Common Concerning Additives ──
  {
    name: 'Carrageenan',
    healthRating: 'okay',
    category: 'thickener',
    iarcGroup: null,
    isEUBanned: false,
    bannedRegions: [],
    isProcessed: true,
    healthConcerns: ['Gastrointestinal inflammation in some studies', 'Degraded form is IARC Group 2B'],
    healthierAlternatives: ['Gellan gum', 'Locust bean gum', 'Agar'],
    description: 'E407. Derived from seaweed. Food-grade is generally safe; degraded (poligeenan) is concerning.',
  },
  {
    name: 'High Fructose Corn Syrup',
    healthRating: 'bad',
    category: 'sweetener',
    iarcGroup: null,
    isEUBanned: false,
    bannedRegions: [],
    isProcessed: true,
    isGMO: true,
    healthConcerns: ['Metabolic syndrome', 'Obesity', 'Non-alcoholic fatty liver disease', 'Insulin resistance'],
    healthierAlternatives: ['Honey', 'Maple syrup', 'Date syrup', 'Coconut sugar'],
    description: 'HFCS. Major source of added sugar in US processed food. Typically from GMO corn.',
  },
  {
    name: 'Sodium Benzoate',
    healthRating: 'okay',
    category: 'preservative',
    iarcGroup: null,
    isEUBanned: false,
    bannedRegions: [],
    isProcessed: true,
    healthConcerns: ['Forms benzene when combined with vitamin C', 'ADHD link in some studies'],
    healthierAlternatives: ['Potassium sorbate', 'Citric acid'],
    description: 'E211. Common in beverages. Benzene formation risk when combined with ascorbic acid.',
  },
  {
    name: 'Polysorbate 80',
    healthRating: 'okay',
    category: 'emulsifier',
    iarcGroup: null,
    isEUBanned: false,
    bannedRegions: [],
    isProcessed: true,
    healthConcerns: ['May alter gut microbiome', 'Intestinal inflammation in animal studies'],
    healthierAlternatives: ['Lecithin', 'Gum arabic'],
    description: 'E433. Common emulsifier in ice cream, sauces. Emerging gut health concerns.',
  },

  // ── Glyphosate-Associated (EWG Dirty Dozen context) ──
  {
    name: 'Glyphosate Residue',
    healthRating: 'bad',
    category: 'contaminant',
    iarcGroup: '2A',
    isEUBanned: false,
    bannedRegions: [],
    isProcessed: false,
    healthConcerns: ['IARC Group 2A: probably carcinogenic', 'Non-Hodgkin lymphoma association', 'Found in oats, wheat, cereals'],
    healthierAlternatives: ['Organic grains', 'Organic oats'],
    description: 'Herbicide residue. IARC classified as 2A in 2015. Common in non-organic grains.',
  },

  // ── Safe/Good Common Ingredients (for contrast) ──
  {
    name: 'Citric Acid',
    healthRating: 'good',
    category: 'acidulant',
    iarcGroup: null,
    isEUBanned: false,
    bannedRegions: [],
    isProcessed: false,
    healthConcerns: [],
    description: 'E330. Naturally occurring in citrus fruits. FDA GRAS. Very safe.',
  },
  {
    name: 'Ascorbic Acid',
    healthRating: 'good',
    category: 'antioxidant',
    iarcGroup: null,
    isEUBanned: false,
    bannedRegions: [],
    isProcessed: false,
    healthConcerns: [],
    description: 'E300. Vitamin C. Essential nutrient and safe preservative.',
  },
  {
    name: 'Tocopherols',
    healthRating: 'good',
    category: 'antioxidant',
    iarcGroup: null,
    isEUBanned: false,
    bannedRegions: [],
    isProcessed: false,
    healthConcerns: [],
    description: 'E306-309. Vitamin E. Natural antioxidant used as preservative.',
  },
  {
    name: 'Pectin',
    healthRating: 'good',
    category: 'thickener',
    iarcGroup: null,
    isEUBanned: false,
    bannedRegions: [],
    isProcessed: false,
    healthConcerns: [],
    description: 'E440. Natural fiber from fruits. Used as gelling agent. Prebiotic benefits.',
  },
  {
    name: 'Lecithin',
    healthRating: 'good',
    category: 'emulsifier',
    iarcGroup: null,
    isEUBanned: false,
    bannedRegions: [],
    isProcessed: false,
    healthConcerns: [],
    description: 'E322. Natural emulsifier from soy or sunflower. Very safe.',
  },
  {
    name: 'Stevia',
    healthRating: 'good',
    category: 'natural_sweetener',
    iarcGroup: null,
    isEUBanned: false,
    bannedRegions: [],
    isProcessed: false,
    healthConcerns: [],
    healthierAlternatives: [],
    description: 'E960. Natural sweetener from Stevia rebaudiana plant. Zero calories. FDA GRAS.',
  },
  {
    name: 'Monk Fruit Extract',
    healthRating: 'good',
    category: 'natural_sweetener',
    iarcGroup: null,
    isEUBanned: false,
    bannedRegions: [],
    isProcessed: false,
    healthConcerns: [],
    description: 'Luo han guo. Natural zero-calorie sweetener. FDA GRAS.',
  },
];

async function seed() {
  try {
    await sequelize.authenticate();
    console.log('Connected to database');

    let created = 0;
    let updated = 0;

    for (const item of SAFETY_DATA) {
      const [record, wasCreated] = await FoodIngredient.findOrCreate({
        where: { name: item.name },
        defaults: item,
      });

      if (!wasCreated) {
        // Update existing with safety data
        await record.update({
          iarcGroup: item.iarcGroup,
          isEUBanned: item.isEUBanned,
          bannedRegions: item.bannedRegions,
          healthRating: item.healthRating,
          healthConcerns: item.healthConcerns,
          healthierAlternatives: item.healthierAlternatives,
          category: item.category,
          description: item.description,
        });
        updated++;
      } else {
        created++;
      }
    }

    console.log(`Ingredient safety seeder: ${created} created, ${updated} updated (${SAFETY_DATA.length} total)`);
    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err.message);
    process.exit(1);
  }
}

seed();
