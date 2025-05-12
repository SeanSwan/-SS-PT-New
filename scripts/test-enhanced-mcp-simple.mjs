// Simple test for Enhanced Gamification MCP Server
// Uses built-in fetch API (Node.js 18+)

console.log('🧪 Testing Enhanced Gamification MCP Server...\n');

async function testEnhancedMCP() {
    try {
        // Test if server is running
        console.log('1. Checking if server is running...');
        const response = await fetch('http://localhost:8002');
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ Server is running!');
            console.log(`   Name: ${data.name}`);
            console.log(`   Version: ${data.version}`);
            console.log(`   Features: ${data.features?.length || 0} available`);
        } else {
            console.log('❌ Server returned error:', response.status);
            return;
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
            return;
        }
        
        // Test tools endpoint
        console.log('\n3. Checking available tools...');
        const toolsResponse = await fetch('http://localhost:8002/tools');
        
        if (toolsResponse.ok) {
            const toolsData = await toolsResponse.json();
            console.log('✅ Tools endpoint working!');
            console.log(`   Available tools: ${toolsData.tools?.length || 0}`);
            if (toolsData.tools) {
                toolsData.tools.forEach(tool => {
                    console.log(`   - ${tool.name}: ${tool.description}`);
                });
            }
        } else {
            console.log('❌ Tools endpoint failed');
        }
        
        console.log('\n🎉 All tests passed! Enhanced Gamification MCP is working correctly.');
        
    } catch (error) {
        console.log('❌ Connection failed!');
        console.log('   Error:', error.message);
        console.log('\n💡 Make sure the enhanced gamification MCP server is running:');
        console.log('   cd backend/mcp_server');
        console.log('   python start_enhanced_gamification_server.py');
        console.log('\n   Or check if it\'s already running on port 8002');
    }
}

testEnhancedMCP();
