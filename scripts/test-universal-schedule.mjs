const BASE_URL = 'https://sswanstudios.com';
const ADMIN_USERNAME = 'admin';
const TRAINER_USERNAME = 'trainertest';
const CLIENT_USERNAME = 'clienttest';
const PASSWORD = 'admin123';

async function login(username, password) {
  console.log(`🔐 Logging in as ${username}...`);
  try {
    const response = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await response.json();
    if (!response.ok) {
      console.error(`❌ Login failed for ${username}:`, data.message);
      return null;
    }

    console.log(`✅ Login successful for ${username}`);
    return data.token;
  } catch (error) {
    console.error(`❌ Network error during login for ${username}:`, error.message);
    return null;
  }
}

async function testScheduleFlow() {
  const adminToken = await login(ADMIN_USERNAME, PASSWORD);
  if (!adminToken) return;

  console.log('\n🔍 Listing Trainers...');
  const trainersResponse = await fetch(`${BASE_URL}/api/auth/users/trainers`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  const trainersData = await trainersResponse.json();
  if (trainersResponse.ok) {
    console.log('✅ Trainers found:', JSON.stringify(trainersData.trainers, null, 2));
  }

  console.log('\n👤 Creating Test Client...');
  const regClientResponse = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      firstName: 'Test',
      lastName: 'Client',
      email: `testclient_${Date.now()}@test.com`,
      username: `testclient_${Date.now()}`,
      password: 'Password123!',
      role: 'client'
    })
  });
  const regClientData = await regClientResponse.json();
  const clientUsername = regClientData.user?.email;
  const clientId = regClientData.user?.id;
  const clientPassword = 'Password123!';

  if (clientId) {
    console.log('\n💳 Adding Credits to Test Client...');
    await fetch(`${BASE_URL}/api/auth/user/${clientId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        availableSessions: 10
      })
    });
  }

  console.log('\n🔍 Verifying Client Credits...');
  const clientCheckResponse = await fetch(`${BASE_URL}/api/auth/users/${clientId}`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  const clientCheckData = await clientCheckResponse.json();
  console.log(`📊 Client Credits: ${clientCheckData.user?.availableSessions}`);

  console.log('\n Testing Admin: Create Session...');
  try {
    const createResponse = await fetch(`${BASE_URL}/api/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        sessions: [{
          start: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
          duration: 60,
          location: 'Test Studio',
          status: 'available',
          trainerId: 2
        }]
      })
    });

    const createData = await createResponse.json();
    if (createResponse.ok && createData.success) {
      console.log('✅ Session created successfully');
      const sessionId = createData.sessions[0].id;

      console.log('\n📅 Testing Client: Book Session...');
      const clientToken = await login(clientUsername, clientPassword);
      if (clientToken) {
        const bookResponse = await fetch(`${BASE_URL}/api/sessions/${sessionId}/book`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${clientToken}`
          }
        });
        const bookData = await bookResponse.json();
        if (bookResponse.ok && bookData.success) {
          console.log('✅ Session booked successfully by client');
        } else {
          console.error('❌ Session booking failed:', bookData.message);
        }
      }
    } else {
      console.error('❌ Session creation failed:', createData.message);
    }
  } catch (error) {
    console.error('❌ Error during schedule flow test:', error.message);
  }
}

testScheduleFlow().catch(console.error);
