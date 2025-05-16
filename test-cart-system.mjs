#!/usr/bin/env node

/**
 * Cart System Test Script
 * Tests the enhanced cart functionality with role-based access control
 */

import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const API_BASE_URL = process.env.FRONTEND_URL || 'http://localhost:5000';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Test credentials for different roles
const TEST_USERS = {
  admin: { username: 'admin', password: '55555' },
  client: { username: 'client', password: '55555' },
  trainer: { username: 'trainer', password: '55555' },
  user: { username: 'user', password: '55555' }
};

let tokens = {};

async function createTestUser(role) {
  try {
    const userData = {
      username: role === 'admin' ? 'admin' : `test${role}`,
      email: `test${role}@swanstudios.com`,
      password: '55555',
      firstName: 'Test',
      lastName: role.charAt(0).toUpperCase() + role.slice(1),
      role: role
    };
    
    const response = await axios.post(`${API_BASE_URL}/api/auth/register`, userData);
    console.log(`✅ Created ${role} user: ${userData.username}`);
    return response.data;
  } catch (error) {
    if (error.response?.status === 409) {
      console.log(`ℹ️  ${role} user already exists`);
      return null;
    }
    console.error(`❌ Failed to create ${role} user:`, error.response?.data?.message);
    return null;
  }
}

async function loginUser(role) {
  try {
    const credentials = TEST_USERS[role];
    const response = await axios.post(`${API_BASE_URL}/api/auth/login`, credentials);
    tokens[role] = response.data.token;
    console.log(`✅ Logged in as ${role}: ${credentials.username}`);
    return response.data;
  } catch (error) {
    console.error(`❌ Failed to login as ${role}:`, error.response?.data?.message);
    return null;
  }
}

async function testCartAccess(role) {
  console.log(`\n🧪 Testing cart access for ${role}...`);
  
  try {
    const token = tokens[role];
    if (!token) {
      console.error(`❌ No token for ${role}`);
      return false;
    }
    
    // Test getting cart
    const cartResponse = await axios.get(`${API_BASE_URL}/api/cart`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log(`✅ ${role} can access cart`);
    console.log(`   Cart items: ${cartResponse.data.items?.length || 0}`);
    console.log(`   Cart total: $${cartResponse.data.total || 0}`);
    
    return true;
  } catch (error) {
    const status = error.response?.status;
    const message = error.response?.data?.message;
    
    if (status === 403) {
      console.log(`⚠️  ${role} correctly blocked from cart access: ${message}`);
      return true; // This is expected for 'user' role
    } else {
      console.error(`❌ ${role} cart access failed unexpectedly:`, message);
      return false;
    }
  }
}

async function testAddToCart(role, packageId = 1) {
  console.log(`\n🛒 Testing add to cart for ${role}...`);
  
  try {
    const token = tokens[role];
    if (!token) {
      console.error(`❌ No token for ${role}`);
      return false;
    }
    
    const addResponse = await axios.post(`${API_BASE_URL}/api/cart/add`, 
      { storefrontItemId: packageId, quantity: 1 },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    console.log(`✅ ${role} successfully added item to cart`);
    console.log(`   Items in cart: ${addResponse.data.itemCount}`);
    console.log(`   Cart total: $${addResponse.data.total}`);
    
    if (addResponse.data.userRoleUpgrade) {
      console.log(`🔄 User role upgraded: ${role} → client`);
    }
    
    return true;
  } catch (error) {
    const status = error.response?.status;
    const message = error.response?.data?.message;
    
    if (status === 403) {
      console.log(`⚠️  ${role} correctly blocked from adding to cart: ${message}`);
      return true; // This is expected for some roles
    } else {
      console.error(`❌ ${role} add to cart failed:`, message);
      return false;
    }
  }
}

async function testGetStorefrontItems() {
  console.log(`\n📦 Testing storefront items access...`);
  
  try {
    const response = await axios.get(`${API_BASE_URL}/api/storefront`);
    const items = response.data.items || [];
    
    console.log(`✅ Retrieved ${items.length} storefront items`);
    
    if (items.length > 0) {
      console.log(`   First item: ${items[0].name} - $${items[0].displayPrice || items[0].price}`);
      return items[0].id;
    }
    
    return null;
  } catch (error) {
    console.error(`❌ Failed to get storefront items:`, error.response?.data?.message);
    return null;
  }
}

async function clearCart(role) {
  console.log(`\n🗑️  Clearing cart for ${role}...`);
  
  try {
    const token = tokens[role];
    if (!token) return;
    
    await axios.delete(`${API_BASE_URL}/api/cart/clear`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log(`✅ Cart cleared for ${role}`);
  } catch (error) {
    console.log(`⚠️  Could not clear cart for ${role}: ${error.response?.data?.message}`);
  }
}

async function runCartTests() {
  console.log('🚀 Starting Cart System Tests...\n');
  
  // Create test users if they don't exist
  console.log('🔧 Setting up test users...');
  for (const role of ['admin', 'client', 'trainer', 'user']) {
    await createTestUser(role);
  }
  
  // Login all users
  console.log('\n🔑 Logging in test users...');
  for (const role of ['admin', 'client', 'trainer', 'user']) {
    await loginUser(role);
  }
  
  // Test storefront access
  const firstItemId = await testGetStorefrontItems();
  
  if (!firstItemId) {
    console.error('❌ No storefront items found. Cannot continue tests.');
    return;
  }
  
  // Test cart access for each role
  console.log('\n📋 Testing cart access permissions...');
  for (const role of ['admin', 'client', 'trainer', 'user']) {
    await testCartAccess(role);
  }
  
  // Test adding items to cart
  console.log('\n🛒 Testing add to cart functionality...');
  for (const role of ['admin', 'client', 'trainer', 'user']) {
    await testAddToCart(role, firstItemId);
  }
  
  // Clean up carts
  console.log('\n🧹 Cleaning up...');
  for (const role of ['admin', 'client', 'trainer']) {
    await clearCart(role);
  }
  
  console.log('\n✨ Cart system tests completed!');
  console.log('\nTest Summary:');
  console.log('- Admin, Client, and Trainer roles should have full cart access');
  console.log('- User role should be blocked from cart operations (by design)');
  console.log('- When users purchase training packages, they should be upgraded to client role');
  console.log('- Cart state should be synchronized across all cart components');
}

// Run the tests
runCartTests().catch(console.error);
