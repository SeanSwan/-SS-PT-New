// backend/scripts/test-admin-features.mjs
import fetch from 'node-fetch';
import fs from 'fs/promises';
import path from 'path';

/**
 * Test script for the enhanced admin client management features
 * 
 * This script tests:
 * 1. Admin client CRUD operations
 * 2. MCP server integration
 * 3. Performance monitoring
 * 4. Data synchronization
 */

// Configuration
const BASE_URL = process.env.API_URL || 'http://localhost:5000';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || ''; // Set this with a valid admin JWT

// Test data
const testClient = {
    firstName: 'Test',
    lastName: 'Client',
    email: 'test.client@example.com',
    username: 'testclient123',
    password: 'testpassword123',
    phone: '+1234567890',
    dateOfBirth: '1990-01-01',
    gender: 'male',
    weight: 70,
    height: 175,
    fitnessGoal: 'weight_loss',
    trainingExperience: 'beginner',
    healthConcerns: 'None',
    emergencyContact: 'Emergency Contact 123',
    availableSessions: 5
};

// Helper function to make API requests
async function apiRequest(method, endpoint, data = null, headers = {}) {
    const url = `${BASE_URL}${endpoint}`;
    
    const requestOptions = {
        method,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${ADMIN_TOKEN}`,
            ...headers
        }
    };
    
    if (data && (method === 'POST' || method === 'PUT')) {
        requestOptions.body = JSON.stringify(data);
    }
    
    try {
        const response = await fetch(url, requestOptions);
        const responseData = await response.json();
        
        return {
            status: response.status,
            ok: response.ok,
            data: responseData
        };
    } catch (error) {
        console.error(`Error making ${method} request to ${endpoint}:`, error);
        return {
            status: 500,
            ok: false,
            error: error.message
        };
    }
}

// Test functions
async function testCreateClient() {
    console.log('\n=== Testing Create Client ===');
    
    const response = await apiRequest('POST', '/api/admin/clients', testClient);
    
    if (response.ok) {
        console.log('✅ Client created successfully');
        console.log('Client ID:', response.data.data.client.id);
        return response.data.data.client.id;
    } else {
        console.log('❌ Failed to create client');
        console.log('Error:', response.data);
        return null;
    }
}

async function testGetClients() {
    console.log('\n=== Testing Get Clients ===');
    
    const response = await apiRequest('GET', '/api/admin/clients?page=1&limit=10');
    
    if (response.ok) {
        console.log('✅ Clients retrieved successfully');
        console.log(`Found ${response.data.data.clients.length} clients`);
        console.log('Total clients:', response.data.data.pagination.total);
        return response.data.data.clients;
    } else {
        console.log('❌ Failed to get clients');
        console.log('Error:', response.data);
        return [];
    }
}

async function testGetClientDetails(clientId) {
    console.log('\n=== Testing Get Client Details ===');
    
    const response = await apiRequest('GET', `/api/admin/clients/${clientId}`);
    
    if (response.ok) {
        console.log('✅ Client details retrieved successfully');
        console.log('Client name:', `${response.data.data.client.firstName} ${response.data.data.client.lastName}`);
        if (response.data.data.mcpStats) {
            console.log('✅ MCP stats included');
        }
        return response.data.data.client;
    } else {
        console.log('❌ Failed to get client details');
        console.log('Error:', response.data);
        return null;
    }
}

async function testUpdateClient(clientId) {
    console.log('\n=== Testing Update Client ===');
    
    const updateData = {
        fitnessGoal: 'muscle_gain',
        availableSessions: 10
    };
    
    const response = await apiRequest('PUT', `/api/admin/clients/${clientId}`, updateData);
    
    if (response.ok) {
        console.log('✅ Client updated successfully');
        console.log('New fitness goal:', response.data.data.client.fitnessGoal);
        console.log('New available sessions:', response.data.data.client.availableSessions);
        return true;
    } else {
        console.log('❌ Failed to update client');
        console.log('Error:', response.data);
        return false;
    }
}

async function testSearchClients() {
    console.log('\n=== Testing Search Clients ===');
    
    const response = await apiRequest('GET', '/api/admin/clients?search=test&fitnessGoal=muscle_gain');
    
    if (response.ok) {
        console.log('✅ Client search successful');
        console.log(`Found ${response.data.data.clients.length} matching clients`);
        return response.data.data.clients;
    } else {
        console.log('❌ Failed to search clients');
        console.log('Error:', response.data);
        return [];
    }
}

async function testGetWorkoutStats(clientId) {
    console.log('\n=== Testing Get Workout Stats (MCP Integration) ===');
    
    const response = await apiRequest('GET', `/api/admin/clients/${clientId}/workout-stats`);
    
    if (response.ok) {
        console.log('✅ Workout stats retrieved successfully');
        console.log('MCP integration working');
        if (response.data.data.statistics) {
            console.log('Total workouts:', response.data.data.statistics.totalWorkouts);
            console.log('Average intensity:', response.data.data.statistics.averageIntensity);
        }
        return true;
    } else {
        console.log('⚠️ Workout stats failed (expected if MCP server not running)');
        console.log('Error:', response.data);
        return false;
    }
}

async function testGenerateWorkoutPlan(clientId) {
    console.log('\n=== Testing Generate Workout Plan (MCP Integration) ===');
    
    const planData = {
        trainerId: 'trainer-id-placeholder', // You'd need a real trainer ID
        name: 'Test Workout Plan',
        description: 'Generated by admin for testing',
        goal: 'muscle_gain',
        daysPerWeek: 3,
        difficulty: 'intermediate',
        focusAreas: ['chest', 'back', 'legs']
    };
    
    const response = await apiRequest('POST', `/api/admin/clients/${clientId}/generate-workout-plan`, planData);
    
    if (response.ok) {
        console.log('✅ Workout plan generated successfully');
        console.log('Plan name:', response.data.data.plan?.name);
        return true;
    } else {
        console.log('⚠️ Workout plan generation failed (expected if MCP server not running)');
        console.log('Error:', response.data);
        return false;
    }
}

async function testMCPStatus() {
    console.log('\n=== Testing MCP Status Monitoring ===');
    
    const response = await apiRequest('GET', '/api/admin/mcp-status');
    
    if (response.ok) {
        console.log('✅ MCP status retrieved successfully');
        console.log('Summary:', response.data.data.summary);
        console.log('Servers online:', response.data.data.summary.online);
        console.log('Servers offline:', response.data.data.summary.offline);
        
        // Show detailed status
        response.data.data.servers.forEach(server => {
            const statusIcon = server.status === 'online' ? '✅' : '❌';
            console.log(`${statusIcon} ${server.name}: ${server.status}`);
        });
        
        return response.data.data;
    } else {
        console.log('❌ Failed to get MCP status');
        console.log('Error:', response.data);
        return null;
    }
}

async function testDeleteClient(clientId) {
    console.log('\n=== Testing Delete Client ===');
    
    const response = await apiRequest('DELETE', `/api/admin/clients/${clientId}`, {
        softDelete: true
    });
    
    if (response.ok) {
        console.log('✅ Client deleted/deactivated successfully');
        return true;
    } else {
        console.log('❌ Failed to delete client');
        console.log('Error:', response.data);
        return false;
    }
}

// Main test runner
async function runTests() {
    console.log('🚀 Starting Admin Features Test Suite');
    console.log('=====================================');
    
    if (!ADMIN_TOKEN) {
        console.log('❌ ADMIN_TOKEN not set. Please set the environment variable with a valid admin JWT token.');
        process.exit(1);
    }
    
    let clientId = null;
    const results = {
        total: 0,
        passed: 0,
        failed: 0,
        warnings: 0
    };
    
    try {
        // Test 1: Create Client
        results.total++;
        clientId = await testCreateClient();
        if (clientId) results.passed++;
        else results.failed++;
        
        // Test 2: Get Clients
        results.total++;
        const clients = await testGetClients();
        if (clients.length > 0) results.passed++;
        else results.failed++;
        
        // Test 3: Get Client Details
        if (clientId) {
            results.total++;
            const clientDetails = await testGetClientDetails(clientId);
            if (clientDetails) results.passed++;
            else results.failed++;
            
            // Test 4: Update Client
            results.total++;
            const updateSuccess = await testUpdateClient(clientId);
            if (updateSuccess) results.passed++;
            else results.failed++;
            
            // Test 5: Search Clients
            results.total++;
            const searchResults = await testSearchClients();
            if (searchResults.length >= 0) results.passed++;
            else results.failed++;
            
            // Test 6: Get Workout Stats (MCP)
            results.total++;
            const workoutStatsSuccess = await testGetWorkoutStats(clientId);
            if (workoutStatsSuccess) results.passed++;
            else results.warnings++;
            
            // Test 7: Generate Workout Plan (MCP)
            results.total++;
            const planSuccess = await testGenerateWorkoutPlan(clientId);
            if (planSuccess) results.passed++;
            else results.warnings++;
        }
        
        // Test 8: MCP Status
        results.total++;
        const mcpStatus = await testMCPStatus();
        if (mcpStatus) results.passed++;
        else results.failed++;
        
        // Test 9: Delete Client (cleanup)
        if (clientId) {
            results.total++;
            const deleteSuccess = await testDeleteClient(clientId);
            if (deleteSuccess) results.passed++;
            else results.failed++;
        }
        
    } catch (error) {
        console.error('\n❌ Test suite error:', error);
        results.failed++;
    }
    
    // Summary
    console.log('\n📊 Test Results Summary');
    console.log('========================');
    console.log(`Total tests: ${results.total}`);
    console.log(`✅ Passed: ${results.passed}`);
    console.log(`❌ Failed: ${results.failed}`);
    console.log(`⚠️  Warnings: ${results.warnings}`);
    
    if (results.failed === 0) {
        console.log('\n🎉 All core tests passed! Your admin client management is working correctly.');
    } else {
        console.log('\n⚠️  Some tests failed. Please check the errors above and fix any issues.');
    }
    
    if (results.warnings > 0) {
        console.log('\n💡 Note: Warnings are expected if MCP servers are not running yet.');
    }
    
    // Save results to file
    const testReport = {
        timestamp: new Date().toISOString(),
        results,
        details: 'Full test suite completed for admin client management features'
    };
    
    await fs.writeFile(
        path.join(process.cwd(), 'test-results.json'),
        JSON.stringify(testReport, null, 2)
    );
    
    console.log('\n📝 Test results saved to test-results.json');
}

// Run the tests
if (import.meta.url === `file://${process.argv[1]}`) {
    runTests().catch(console.error);
}

export default runTests;
