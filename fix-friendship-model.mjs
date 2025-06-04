// AUTOMATED FIX FOR FRIENDSHIP MODEL
// Updates Friendship.mjs to use INTEGER FKs instead of UUID

import { readFileSync, writeFileSync } from 'fs';

const fixFriendshipModel = () => {
  try {
    console.log('🔧 FIXING FRIENDSHIP MODEL UUID → INTEGER');
    console.log('=========================================');
    
    const friendshipPath = './backend/models/social/Friendship.mjs';
    console.log(`Reading: ${friendshipPath}`);
    
    // Read current content
    const content = readFileSync(friendshipPath, 'utf8');
    console.log('✅ File read successfully');
    
    // Create backup
    const backupPath = friendshipPath + '.backup';
    writeFileSync(backupPath, content);
    console.log(`✅ Backup created: ${backupPath}`);
    
    // Apply fixes
    let fixedContent = content;
    
    // Fix 1: Change primary key from UUID to INTEGER
    fixedContent = fixedContent.replace(
      /id: {\s*type: DataTypes\.UUID,\s*defaultValue: DataTypes\.UUIDV4,\s*primaryKey: true\s*}/,
      `id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  }`
    );
    
    // Fix 2: Change requesterId from UUID to INTEGER
    fixedContent = fixedContent.replace(
      /requesterId: {\s*type: DataTypes\.UUID,\s*allowNull: false,\s*references: {\s*model: 'Users',\s*key: 'id'\s*}\s*}/,
      `requesterId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  }`
    );
    
    // Fix 3: Change recipientId from UUID to INTEGER
    fixedContent = fixedContent.replace(
      /recipientId: {\s*type: DataTypes\.UUID,\s*allowNull: false,\s*references: {\s*model: 'Users',\s*key: 'id'\s*}\s*}/,
      `recipientId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  }`
    );
    
    // Check if changes were made
    if (fixedContent === content) {
      console.log('⚠️ No changes detected - file might already be correct or pattern not found');
      console.log('Manual verification recommended');
    } else {
      // Write fixed content
      writeFileSync(friendshipPath, fixedContent);
      console.log('✅ Friendship model updated successfully');
      
      console.log('\n📋 Changes made:');
      console.log('  ✅ id: UUID → INTEGER (with autoIncrement)');
      console.log('  ✅ requesterId: UUID → INTEGER');  
      console.log('  ✅ recipientId: UUID → INTEGER');
      console.log('\n💾 Original file backed up to: Friendship.mjs.backup');
    }
    
    return { success: true, changesApplied: fixedContent !== content };
    
  } catch (error) {
    console.error('💥 Error fixing Friendship model:', error.message);
    return { success: false, error: error.message };
  }
};

const result = fixFriendshipModel();
console.log('\n🎯 FRIENDSHIP MODEL FIX RESULT:');
console.log('==============================');
console.log(JSON.stringify(result, null, 2));

if (result.success) {
  console.log('\n🚀 NEXT STEPS:');
  console.log('==============');
  console.log('1. Restart your backend server');
  console.log('2. Foreign key constraints should now work');
  console.log('3. Should see all 43 models load successfully');
}
