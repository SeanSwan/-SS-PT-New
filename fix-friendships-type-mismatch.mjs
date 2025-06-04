// FIX FRIENDSHIPS FOREIGN KEY TYPE MISMATCH
// Resolves UUID vs INTEGER FK constraint issues

import dotenv from 'dotenv';
import sequelize from './backend/database.mjs';
import { QueryTypes } from 'sequelize';

dotenv.config();

const fixFriendshipsTypeMismatch = async () => {
  try {
    console.log('🔧 FIXING FRIENDSHIPS FOREIGN KEY TYPE MISMATCH');
    console.log('===============================================');
    
    await sequelize.authenticate();
    console.log('✅ Database connected');
    
    // Check User table ID type
    console.log('\n🔍 STEP 1: Checking User table ID type');
    console.log('======================================');
    
    const userIdType = await sequelize.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'Users' AND column_name = 'id'
    `, { type: QueryTypes.SELECT });
    
    if (userIdType.length > 0) {
      console.log(`User.id type: ${userIdType[0].data_type}`);
      console.log(`User.id nullable: ${userIdType[0].is_nullable}`);
    } else {
      console.log('❌ Could not find User.id column info');
      return { success: false, issue: 'user_id_not_found' };
    }
    
    // Check if Friendships table exists
    console.log('\n🔍 STEP 2: Checking Friendships table');
    console.log('====================================');
    
    const friendshipsExists = await sequelize.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_name = 'Friendships'
    `, { type: QueryTypes.SELECT });
    
    if (friendshipsExists.length === 0) {
      console.log('ℹ️ Friendships table does not exist yet');
      console.log('Will check model definition for potential issues');
    } else {
      console.log('✅ Friendships table exists');
      
      // Check foreign key column types
      const friendshipsColumns = await sequelize.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'Friendships' 
        AND column_name IN ('requesterId', 'recipientId')
        ORDER BY column_name
      `, { type: QueryTypes.SELECT });
      
      console.log('Friendships FK columns:');
      friendshipsColumns.forEach(col => {
        console.log(`  ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
      });
    }
    
    // Check Friendships model definition
    console.log('\n🔍 STEP 3: Analyzing Friendships model definition');
    console.log('===============================================');
    
    try {
      const Friendship = await import('./backend/models/Friendship.mjs');
      console.log('✅ Friendship.mjs imports successfully');
      
      if (Friendship.default && Friendship.default.rawAttributes) {
        const attrs = Friendship.default.rawAttributes;
        
        console.log('Model attributes:');
        Object.keys(attrs).forEach(key => {
          const attr = attrs[key];
          console.log(`  ${key}: ${attr.type?.constructor?.name || attr.type} (${attr.allowNull ? 'nullable' : 'not null'})`);
        });
        
        // Check foreign key definitions
        if (attrs.requesterId) {
          const requesterType = attrs.requesterId.type?.constructor?.name || attrs.requesterId.type;
          console.log(`\n🔍 requesterId type in model: ${requesterType}`);
          
          if (requesterType.includes('UUID') && userIdType[0].data_type === 'integer') {
            console.log('❌ TYPE MISMATCH FOUND:');
            console.log('  User.id: INTEGER');
            console.log('  Friendship.requesterId: UUID');
            console.log('  This prevents foreign key constraint creation');
          } else {
            console.log('✅ Types appear compatible');
          }
        }
        
        if (attrs.recipientId) {
          const recipientType = attrs.recipientId.type?.constructor?.name || attrs.recipientId.type;
          console.log(`🔍 recipientId type in model: ${recipientType}`);
        }
      }
    } catch (friendshipError) {
      console.log('❌ Friendship model import error:', friendshipError.message);
    }
    
    // Provide fix recommendations
    console.log('\n🔧 FIX RECOMMENDATIONS');
    console.log('======================');
    
    const userType = userIdType[0]?.data_type;
    
    if (userType === 'integer') {
      console.log('RECOMMENDED FIX: Update Friendship model to use INTEGER FKs');
      console.log('');
      console.log('In backend/models/Friendship.mjs, change:');
      console.log('  requesterId: { type: DataTypes.UUID, ... }');
      console.log('  recipientId: { type: DataTypes.UUID, ... }');
      console.log('');
      console.log('To:');
      console.log('  requesterId: { type: DataTypes.INTEGER, ... }');
      console.log('  recipientId: { type: DataTypes.INTEGER, ... }');
      console.log('');
      console.log('This makes the FK types match User.id (INTEGER)');
    } else if (userType === 'uuid') {
      console.log('INFO: User.id is UUID, Friendship FKs should also be UUID');
      console.log('The current model definition might be correct');
      console.log('Check if there are other issues preventing FK creation');
    }
    
    // Check for existing foreign key constraints
    console.log('\n🔍 STEP 4: Checking existing foreign key constraints');
    console.log('==================================================');
    
    const existingConstraints = await sequelize.query(`
      SELECT 
        tc.constraint_name,
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM 
        information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
      WHERE constraint_type = 'FOREIGN KEY' 
        AND tc.table_name = 'Friendships'
    `, { type: QueryTypes.SELECT });
    
    if (existingConstraints.length > 0) {
      console.log('Existing Friendships foreign key constraints:');
      existingConstraints.forEach(fk => {
        console.log(`  ${fk.constraint_name}: ${fk.table_name}.${fk.column_name} -> ${fk.foreign_table_name}.${fk.foreign_column_name}`);
      });
    } else {
      console.log('No foreign key constraints found for Friendships table');
    }
    
    return {
      success: true,
      userIdType: userType,
      friendshipsTableExists: friendshipsExists.length > 0,
      typeMismatchDetected: userType === 'integer' // Assuming FK is UUID based on error
    };
    
  } catch (error) {
    console.error('💥 Error checking Friendships type mismatch:', error.message);
    return { success: false, error: error.message };
  } finally {
    await sequelize.close();
  }
};

fixFriendshipsTypeMismatch().then(result => {
  console.log('\n🎯 FRIENDSHIPS TYPE ANALYSIS RESULT:');
  console.log('====================================');
  console.log(JSON.stringify(result, null, 2));
  
  if (result.typeMismatchDetected) {
    console.log('\n🔧 NEXT STEPS:');
    console.log('==============');
    console.log('1. Edit backend/models/Friendship.mjs');
    console.log('2. Change requesterId and recipientId from UUID to INTEGER');
    console.log('3. Restart backend server');
    console.log('4. Foreign key constraints should now work');
  }
});
