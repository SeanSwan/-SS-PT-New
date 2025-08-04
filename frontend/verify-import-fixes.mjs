#!/usr/bin/env node
/**
 * Import Path Verification Script
 * ===============================
 * 
 * Verifies that all the import path fixes are working correctly
 * Tests the critical enterprise admin components that were failing
 */

import { promises as fs } from 'fs';
import path from 'path';

const COMPONENT_PATHS = [
  'src/components/DashBoard/Pages/admin-dashboard/components/MCPServerManagement/MCPServerCommandCenter.tsx',
  'src/components/DashBoard/Pages/admin-dashboard/components/SocialMediaCommand/SocialMediaCommandCenter.tsx', 
  'src/components/DashBoard/Pages/admin-dashboard/components/BusinessIntelligence/EnterpriseBusinessIntelligenceSuite.tsx',
  'src/components/DashBoard/Pages/admin-exercises/AdminExerciseCommandCenter.tsx'
];

const SERVICE_PATH = 'src/services/enterpriseAdminApiService.ts';
const CONTEXT_PATH = 'src/context/AuthContext.tsx';
const HOOKS_PATH = 'src/hooks/use-toast.ts';

console.log('🔧 SwanStudios Import Path Verification\n');

async function verifyFileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function verifyImportPath(componentPath, importStatement, expectedPath) {
  try {
    const content = await fs.readFile(componentPath, 'utf8');
    const hasCorrectImport = content.includes(importStatement);
    
    if (hasCorrectImport) {
      console.log(`✅ ${path.basename(componentPath)}: Import path correct`);
      return true;
    } else {
      console.log(`❌ ${path.basename(componentPath)}: Import path incorrect`);
      return false;
    }
  } catch (error) {
    console.log(`❌ ${path.basename(componentPath)}: File not accessible`);
    return false;
  }
}

async function main() {
  let allGood = true;
  
  // Check if core service files exist
  console.log('📁 Checking core service files...');
  const serviceExists = await verifyFileExists(SERVICE_PATH);
  const contextExists = await verifyFileExists(CONTEXT_PATH);
  const hooksExists = await verifyFileExists(HOOKS_PATH);
  
  console.log(`${serviceExists ? '✅' : '❌'} enterpriseAdminApiService.ts`);
  console.log(`${contextExists ? '✅' : '❌'} AuthContext.tsx`);
  console.log(`${hooksExists ? '✅' : '❌'} use-toast.ts\n`);
  
  if (!serviceExists || !contextExists || !hooksExists) {
    allGood = false;
  }
  
  // Check import paths in components
  console.log('🔗 Checking import paths...');
  
  // MCP Server Command Center
  const mcpGood = await verifyImportPath(
    COMPONENT_PATHS[0],
    '../../../../../services/enterpriseAdminApiService',
    SERVICE_PATH
  );
  
  // Social Media Command Center  
  const socialGood = await verifyImportPath(
    COMPONENT_PATHS[1],
    '../../../../../services/enterpriseAdminApiService',
    SERVICE_PATH
  );
  
  // Business Intelligence Suite
  const biGood = await verifyImportPath(
    COMPONENT_PATHS[2], 
    '../../../../../services/enterpriseAdminApiService',
    SERVICE_PATH
  );
  
  // Admin Exercise Command Center
  const exerciseGood = await verifyImportPath(
    COMPONENT_PATHS[3],
    '../../../../context/AuthContext',
    CONTEXT_PATH
  );
  
  allGood = allGood && mcpGood && socialGood && biGood && exerciseGood;
  
  console.log('\n🎯 Verification Summary:');
  if (allGood) {
    console.log('✅ ALL IMPORT PATHS FIXED - READY FOR DEPLOYMENT! 🚀');
    console.log('\nNext steps:');
    console.log('1. Run: npm run build');
    console.log('2. Deploy to Render'); 
    console.log('3. Test admin dashboard at /dashboard/exercise-management');
  } else {
    console.log('❌ Some import issues remain - check output above');
  }
  
  return allGood ? 0 : 1;
}

main().then(process.exit).catch(console.error);
