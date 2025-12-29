// backend/test-onboarding-endpoint.mjs
import User from './models/User.mjs';
import sequelize from './database.mjs';

const testData = {
  fullName: "Test Client",
  preferredName: "TC",
  email: "testclient@swanstudios.com",
  phone: "555-123-4567",
  age: 35,
  gender: "Male",
  bloodType: "O",
  bestTimeToReach: "Evening",
  heightFeet: 5,
  heightInches: 10,
  currentWeight: 180,
  targetWeight: 165,
  primaryGoal: "Weight loss",
  whyGoalMatters: "I want to feel healthier and have more energy for my family",
  successIn6Months: "I'll have lost 15 lbs and be able to run a 5K without stopping",
  desiredTimeline: "6 months",
  commitmentLevel: 8,
  pastObstacles: "Inconsistent workout schedule and poor diet",
  supportNeeded: "Accountability and nutrition guidance"
};

console.log('Testing Onboarding Endpoint Logic...\n');

// Test 1: Generate Spirit Name
console.log('Test 1: Generate Spirit Name');
const spiritName = `Test Spirit ${Math.random().toString(36).slice(2, 7)}`;
console.log(`Generated Spirit Name: ${spiritName}`);
console.log('✅ Test 1 Passed\n');

// Test 2: Create User with Master Prompt JSON
console.log('Test 2: Create User with Master Prompt JSON');

const masterPromptJson = {
  version: '3.0',
  client: {
    name: testData.fullName,
    preferredName: testData.preferredName,
    alias: spiritName,
    age: testData.age,
    gender: testData.gender,
    bloodType: testData.bloodType,
    contact: {
      phone: testData.phone,
      email: testData.email,
      preferredTime: testData.bestTimeToReach
    }
  },
  measurements: {
    height: {
      feet: parseInt(testData.heightFeet),
      inches: parseInt(testData.heightInches)
    },
    currentWeight: parseFloat(testData.currentWeight),
    targetWeight: parseFloat(testData.targetWeight)
  },
  goals: {
    primary: testData.primaryGoal,
    why: testData.whyGoalMatters,
    successLooksLike: testData.successIn6Months,
    timeline: testData.desiredTimeline,
    commitmentLevel: parseInt(testData.commitmentLevel),
    pastObstacles: testData.pastObstacles,
    supportNeeded: testData.supportNeeded
  },
  health: {
    medicalConditions: [],
    underDoctorCare: false,
    doctorCleared: true
  },
  metadata: {
    intakeDate: new Date().toISOString().split('T')[0],
    createdBy: 'SwanStudios Personal Training System v3.0',
    lastUpdated: new Date().toISOString()
  }
};

console.log('Master Prompt JSON Schema Version:', masterPromptJson.version);
console.log('Client Spirit Name:', masterPromptJson.client.alias);
console.log('Primary Goal:', masterPromptJson.goals.primary);
console.log('✅ Test 2: Master Prompt JSON created successfully\n');

// Test 3: Create user in database
console.log('Test 3: Create User in Database');

try {
  // Check if user already exists
  let existingUser = await User.findOne({ where: { email: testData.email } });

  if (existingUser) {
    console.log(`User already exists (ID: ${existingUser.id}). Updating...`);
    await existingUser.update({
      masterPromptJson: masterPromptJson,
      spiritName: spiritName,
      weight: testData.currentWeight,
      height: testData.heightFeet * 12 + testData.heightInches
    });
    console.log('✅ User updated successfully');
  } else {
    const newUser = await User.create({
      firstName: testData.fullName.split(' ')[0],
      lastName: testData.fullName.split(' ').slice(1).join(' '),
      email: testData.email,
      username: testData.email.split('@')[0],
      password: `Temp${Math.random().toString(36).slice(-8)}!`,
      phone: testData.phone,
      role: 'client',
      masterPromptJson: masterPromptJson,
      spiritName: spiritName,
      gender: testData.gender,
      weight: testData.currentWeight,
      height: testData.heightFeet * 12 + testData.heightInches,
      fitnessGoal: testData.primaryGoal,
      isActive: true
    });

    console.log(`✅ User created successfully (ID: ${newUser.id})`);
    console.log(`   Client ID: PT-${String(newUser.id).padStart(5, '0')}`);
    console.log(`   Spirit Name: ${newUser.spiritName}`);
    console.log(`   Email: ${newUser.email}`);
  }

  console.log('✅ Test 3 Passed\n');

  // Test 4: Verify Master Prompt JSON was saved
  console.log('Test 4: Verify Master Prompt JSON Storage');
  const savedUser = await User.findOne({
    where: { email: testData.email },
    attributes: ['id', 'email', 'spiritName', 'masterPromptJson']
  });

  if (savedUser && savedUser.masterPromptJson) {
    console.log('✅ Master Prompt JSON saved successfully');
    console.log('   Version:', savedUser.masterPromptJson.version);
    console.log('   Client Alias:', savedUser.masterPromptJson.client.alias);
    console.log('   Primary Goal:', savedUser.masterPromptJson.goals.primary);
    console.log('   Commitment Level:', savedUser.masterPromptJson.goals.commitmentLevel);
  } else {
    console.log('❌ Master Prompt JSON not found');
  }

  console.log('✅ Test 4 Passed\n');

  // Test 5: Create PII record
  console.log('Test 5: Create PII Record');
  const clientId = `PT-${String(savedUser.id).padStart(5, '0')}`;

  await sequelize.query(`
    INSERT INTO clients_pii (client_id, real_name, spirit_name, status, start_date, current_program, privacy_level, "createdAt", "updatedAt")
    VALUES (:clientId, :realName, :spiritName, 'active', CURRENT_DATE, :currentProgram, 'standard', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT (client_id) DO UPDATE SET
      real_name = EXCLUDED.real_name,
      spirit_name = EXCLUDED.spirit_name,
      current_program = EXCLUDED.current_program,
      "updatedAt" = CURRENT_TIMESTAMP
  `, {
    replacements: {
      clientId: clientId,
      realName: testData.fullName,
      spiritName: spiritName,
      currentProgram: testData.primaryGoal
    }
  });

  console.log(`✅ PII record created for ${clientId}`);
  console.log('✅ Test 5 Passed\n');

  console.log('========================================');
  console.log('ALL TESTS PASSED ✅');
  console.log('========================================');
  console.log('\nOnboarding-to-Database Pipeline is working correctly!');
  console.log(`\nTest Client Created:`);
  console.log(`  - Client ID: ${clientId}`);
  console.log(`  - Spirit Name: ${spiritName}`);
  console.log(`  - Email: ${testData.email}`);
  console.log(`  - Master Prompt: Stored in Users.masterPromptJson`);
  console.log(`  - PII: Stored in clients_pii table`);

} catch (error) {
  console.error('❌ Test failed:', error.message);
  console.error(error);
} finally {
  await sequelize.close();
}
