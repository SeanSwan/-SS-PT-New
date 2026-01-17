import getModels from './models/associations.mjs';

const db = await getModels();
const { User, ClientOnboardingQuestionnaire, ClientBaselineMeasurements, ClientNutritionPlan, ClientPhoto, ClientNote } = db;

async function testAssociations() {
  try {
    console.log('Testing User associations...');

    const testUser = await User.findByPk(1, {
      include: [
        'onboardingQuestionnaires',
        'baselineMeasurements',
        'nutritionPlans',
        'clientPhotos',
        'clientNotes'
      ]
    });

    if (!testUser) {
      console.error('ƒ?O No user with ID 1 found. Create a test user first.');
      return;
    }

    console.log('ƒo. User associations loaded successfully');
    console.log(`  - Questionnaires: ${testUser.onboardingQuestionnaires?.length ?? 0}`);
    console.log(`  - Baseline Measurements: ${testUser.baselineMeasurements?.length ?? 0}`);
    console.log(`  - Nutrition Plans: ${testUser.nutritionPlans?.length ?? 0}`);
    console.log(`  - Photos: ${testUser.clientPhotos?.length ?? 0}`);
    console.log(`  - Notes: ${testUser.clientNotes?.length ?? 0}`);

    process.exit(0);
  } catch (error) {
    console.error('ƒ?O Association test failed:', error.message);
    process.exit(1);
  }
}

testAssociations();
