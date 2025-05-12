// Simple test to check if enhanced gamification MCP is running
// test-enhanced-mcp.mjs

import fetch from 'node-fetch';

async function testEnhancedMCP() {
    console.log('🧪 Testing Enhanced Gamification MCP Server...\n');
    
    try {
        // Test if server is running
        console.log('1. Checking if server is running...');
        const response = await fetch('http://localhost:8002');
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ Server is running!');
            console.log(`   Name: ${data.name}`);
            console.log(`   Version: ${data.version}`);
            console.log(`   Features: ${data.features.length} available`);
        } else {
            console.log('❌ Server returned error:', response.status);
        }
        
        // Test health endpoint
        console.log('\n2. Checking health endpoint...');
        const healthResponse = await fetch('http://localhost:8002/health');
        
        if (healthResponse.ok) {
            const healthData = await healthResponse.json();
            console.log('✅ Health check passed!');
            console.log(`   Status: ${healthData.status}`);
            console.log(`   Database: ${healthData.database}`);
        } else {
            console.log('❌ Health check failed');
        }
        
        // Test tools endpoint
        console.log('\n3. Checking available tools...');
        const toolsResponse = await fetch('http://localhost:8002/tools');
        
        if (toolsResponse.ok) {
            const toolsData = await toolsResponse.json();
            console.log('✅ Tools endpoint working!');
            console.log(`   Available tools: ${toolsData.tools.length}`);
            toolsData.tools.forEach(tool => {
                console.log(`   - ${tool.name}: ${tool.description}`);
            });
        } else {
            console.log('❌ Tools endpoint failed');
        }
        
    } catch (error) {
        console.log('❌ Connection failed!');
        console.log('   Error:', error.message);
        console.log('\n💡 Make sure the enhanced gamification MCP server is running:');
        console.log('   cd backend/mcp_server');
        console.log('   python start_enhanced_gamification_server.py');
    }
}

// Import node-fetch dynamically for Node.js compatibility
import('node-fetch').then(({ default: fetch }) => {
    global.fetch = fetch;
    testEnhancedMCP();
}).catch(async () => {
    // Fallback for environments without node-fetch
    const http = await import('http');
    const https = await import('https');
    
    // Simple fetch implementation
    global.fetch = function(url) {
        return new Promise((resolve, reject) => {
            const lib = url.startsWith('https') ? https : http;
            const request = lib.get(url, (response) => {
                let data = '';
                response.on('data', chunk => data += chunk);
                response.on('end', () => {
                    resolve({
                        ok: response.statusCode >= 200 && response.statusCode < 300,
                        status: response.statusCode,
                        json: () => Promise.resolve(JSON.parse(data))
                    });
                });
            });
            request.on('error', reject);
        });
    };
    
    testEnhancedMCP();
});
