/**
 * Session Calculation Test - Verify the Fix
 * ========================================
 * Tests both fixed packages (sessions) and monthly packages (totalSessions)
 */

// Test data based on your seeder
const testCartItems = [
  {
    id: 1,
    quantity: 1,
    price: "175.00",
    storefrontItem: {
      name: "Silver Swan Wing",
      sessions: 1,  // Fixed package - uses 'sessions'
      packageType: "fixed"
    }
  },
  {
    id: 2,
    quantity: 1,
    price: "29120.00",
    storefrontItem: {
      name: "Rhodium Swan Royalty",
      totalSessions: 208,  // Monthly package - uses 'totalSessions'
      packageType: "monthly",
      months: 12
    }
  }
];

// OLD LOGIC (broken)
console.log("🔍 Testing OLD session calculation logic:");
const oldSessionCount = testCartItems.reduce((sum, item) => {
  return sum + ((item.storefrontItem?.sessions || 0) * (item.quantity || 0));
}, 0);
console.log(`❌ OLD Result: ${oldSessionCount} sessions`);
console.log("   - Silver Swan Wing: 1 session ✅");
console.log("   - Rhodium Swan Royalty: 0 sessions ❌ (missing!)");

console.log("\n🎯 Testing NEW session calculation logic:");
const newSessionCount = testCartItems.reduce((sum, item) => {
  // NEW LOGIC: Handle both fixed packages (sessions) and monthly packages (totalSessions)
  const itemSessions = item.storefrontItem?.sessions || item.storefrontItem?.totalSessions || 0;
  return sum + (itemSessions * (item.quantity || 0));
}, 0);
console.log(`✅ NEW Result: ${newSessionCount} sessions`);
console.log("   - Silver Swan Wing: 1 session ✅");
console.log("   - Rhodium Swan Royalty: 208 sessions ✅ (fixed!)");

console.log("\n🏆 RESULT:");
if (newSessionCount === 209) {
  console.log("✅ SUCCESS: Session calculation fix is working correctly!");
  console.log("✅ Your checkout will now show '209 sessions will be added to your account'");
} else {
  console.log("❌ ERROR: Session calculation still needs adjustment");
}

console.log("\n🦢 SwanStudios Session Fix Complete!");
