/**
 * P0 HOTFIX VALIDATION TEST
 * Tests that the PendingOrdersAdminPanel.tsx syntax error has been resolved
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🔍 P0 HOTFIX VALIDATION: Testing PendingOrdersAdminPanel.tsx syntax...\n');

try {
  // Read the fixed file
  const filePath = join(__dirname, 'frontend/src/components/DashBoard/Pages/admin-dashboard/components/PendingOrdersAdminPanel.tsx');
  const fileContent = readFileSync(filePath, 'utf8');
  
  // Check for the specific syntax errors that were causing the build failure
  console.log('✅ Step 1: File can be read successfully');
  
  // Check that orphaned object properties are gone
  const hasOrphanedOrderReference = fileContent.includes('orderReference: `ORD-${transaction.id}`,');
  const hasOrphanedPaymentReference = fileContent.includes('paymentReference: `SWAN-${transaction.id}`,');
  const hasOrphanedCustomer = fileContent.includes('customer: transaction.customer ||');
  
  if (hasOrphanedOrderReference || hasOrphanedPaymentReference || hasOrphanedCustomer) {
    console.log('❌ FAILED: Orphaned object properties still exist');
    console.log('  - Orphaned orderReference:', hasOrphanedOrderReference);
    console.log('  - Orphaned paymentReference:', hasOrphanedPaymentReference);
    console.log('  - Orphaned customer:', hasOrphanedCustomer);
    process.exit(1);
  }
  
  console.log('✅ Step 2: No orphaned object properties detected');
  
  // Check that the real API integration is in place
  const hasRealAPICall = fileContent.includes("authAxios.get('/api/admin/orders/pending'");
  const hasCorrectDependencyArray = fileContent.includes('}, [authAxios, statusFilter, sortBy, sortOrder, searchTerm]);');
  
  if (!hasRealAPICall) {
    console.log('❌ FAILED: Real API call to /api/admin/orders/pending not found');
    process.exit(1);
  }
  
  if (!hasCorrectDependencyArray) {
    console.log('❌ FAILED: Correct useCallback dependency array not found');
    process.exit(1);
  }
  
  console.log('✅ Step 3: Real API integration confirmed');
  console.log('✅ Step 4: Correct useCallback dependency array confirmed');
  
  // Basic syntax checks - look for common TypeScript/JS issues
  const lines = fileContent.split('\n');
  let braceCount = 0;
  let parenCount = 0;
  let bracketCount = 0;
  let inString = false;
  let stringChar = '';
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      const prevChar = j > 0 ? line[j-1] : '';
      
      // Handle string detection
      if ((char === '"' || char === "'" || char === '`') && prevChar !== '\\') {
        if (!inString) {
          inString = true;
          stringChar = char;
        } else if (char === stringChar) {
          inString = false;
          stringChar = '';
        }
      }
      
      // Count brackets only when not in strings
      if (!inString) {
        if (char === '{') braceCount++;
        if (char === '}') braceCount--;
        if (char === '(') parenCount++;
        if (char === ')') parenCount--;
        if (char === '[') bracketCount++;
        if (char === ']') bracketCount--;
      }
    }
  }
  
  if (braceCount !== 0) {
    console.log(`❌ FAILED: Unmatched braces (count: ${braceCount})`);
    process.exit(1);
  }
  
  if (parenCount !== 0) {
    console.log(`❌ FAILED: Unmatched parentheses (count: ${parenCount})`);
    process.exit(1);
  }
  
  if (bracketCount !== 0) {
    console.log(`❌ FAILED: Unmatched brackets (count: ${bracketCount})`);
    process.exit(1);
  }
  
  console.log('✅ Step 5: Basic bracket/parentheses matching passed');
  
  // Check for the specific error pattern from the build log
  const problematicPattern = /orderReference:.*\n.*paymentReference:.*SWAN-/s;
  if (problematicPattern.test(fileContent)) {
    console.log('❌ FAILED: Original problematic pattern still detected');
    process.exit(1);
  }
  
  console.log('✅ Step 6: Original error pattern successfully removed');
  
  // Summary
  console.log('\n🎉 P0 HOTFIX VALIDATION: ALL TESTS PASSED!');
  console.log('');
  console.log('Summary of fixes:');
  console.log('  ✅ Removed orphaned object properties that were causing syntax error');
  console.log('  ✅ Maintained real API integration to /api/admin/orders/pending');
  console.log('  ✅ Preserved correct useCallback dependency array');
  console.log('  ✅ No unmatched brackets, braces, or parentheses');
  console.log('  ✅ Eliminated the exact error pattern from build logs');
  console.log('');
  console.log('🚀 READY FOR DEPLOYMENT: The build should now succeed!');
  console.log('');
  console.log('Next steps:');
  console.log('  1. Run "npm run build" to confirm build success');
  console.log('  2. Test the admin dashboard locally');
  console.log('  3. Deploy to production with: git add . && git commit -m "🚨 P0 HOTFIX: Fixed syntax error in PendingOrdersAdminPanel" && git push origin main');
  
} catch (error) {
  console.log('❌ FAILED: Error during validation test');
  console.error('Error details:', error.message);
  process.exit(1);
}
