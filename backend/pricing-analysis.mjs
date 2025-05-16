#!/usr/bin/env node

// Simple pricing analysis and recommendation script

console.log('📊 SWANSTUDIOS PRICING ANALYSIS & RECOMMENDATIONS\n');

// Our new graduated pricing structure
const packages = [
  { name: 'Single Session', sessions: 1, pricePerSession: 175, totalCost: 175 },
  { name: 'Gold Glimmer', sessions: 8, pricePerSession: 170, totalCost: 1360 },
  { name: 'Platinum Pulse', sessions: 20, pricePerSession: 165, totalCost: 3300 },
  { name: 'Silver Storm', sessions: 48, pricePerSession: 160, totalCost: 7680 },
  { name: 'Rhodium Rise', sessions: 50, pricePerSession: 158, totalCost: 7900 },
  { name: 'Gold Grandeur', sessions: 96, pricePerSession: 150, totalCost: 14400 },
  { name: 'Platinum Prestige', sessions: 144, pricePerSession: 145, totalCost: 20880 },
  { name: 'Rhodium Reign', sessions: 192, pricePerSession: 140, totalCost: 26880 }
];

console.log('🎯 PRICING STRUCTURE ANALYSIS:');
console.log('=====================================');

packages.forEach((pkg, index) => {
  const discount = 175 - pkg.pricePerSession;
  const discountPercent = ((discount / 175) * 100).toFixed(1);
  const savingsVsSingle = (pkg.sessions * 175) - pkg.totalCost;
  
  console.log(`${index + 1}. ${pkg.name}`);
  console.log(`   └─ ${pkg.sessions} sessions @ $${pkg.pricePerSession}/session = $${pkg.totalCost}`);
  console.log(`   └─ Discount: $${discount}/session (${discountPercent}% off single)`);
  console.log(`   └─ Total Savings vs. Single Sessions: $${savingsVsSingle}`);
  console.log('');
});

console.log('💡 BUSINESS INSIGHTS:');
console.log('======================');

// Calculate some business metrics
const averagePerSession = packages.reduce((sum, pkg) => sum + pkg.pricePerSession, 0) / packages.length;
const totalRevenuePotential = packages.reduce((sum, pkg) => sum + pkg.totalCost, 0);
const maxDiscount = Math.max(...packages.map(pkg => 175 - pkg.pricePerSession));

console.log(`• Average price per session across all packages: $${averagePerSession.toFixed(2)}`);
console.log(`• Maximum discount offered: $${maxDiscount}/session (${((maxDiscount/175)*100).toFixed(1)}%)`);
console.log(`• Total revenue potential: $${totalRevenuePotential.toLocaleString()}`);
console.log(`• Price range: $${packages[packages.length-1].pricePerSession} - $${packages[0].pricePerSession} per session`);

console.log('\n🚀 CUSTOMER PSYCHOLOGY:');
console.log('========================');
console.log('• Single session at $175 establishes premium value anchor');
console.log('• Graduated discounts incentivize larger commitments');
console.log('• 3-month package offers first "bulk discount" entry point');
console.log('• 12-month package provides maximum value (20% savings)');
console.log('• Sweet spot appears to be 6-9 month packages for committed clients');

console.log('\n✅ RECOMMENDATIONS:');
console.log('====================');
console.log('• Monitor conversion rates between package levels');
console.log('• Consider seasonal promotions on longer packages');
console.log('• Track which packages lead to highest client retention');
console.log('• Test A/B pricing within 5-10% ranges for optimization');

console.log('\n🎉 Pricing structure updated successfully!');
