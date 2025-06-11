#!/usr/bin/env node

/**
 * SENDGRID & TWILIO DIAGNOSTIC TOOL
 * =================================
 * Let's find out exactly what's wrong with your external services
 */

console.log('🔍 SENDGRID & TWILIO DIAGNOSTIC TOOL');
console.log('===================================');
console.log(`📅 Test Date: ${new Date().toISOString()}`);
console.log('');

async function diagnoseSendGridAndTwilio() {
  console.log('🧪 CHECKING ENVIRONMENT VARIABLES');
  console.log('=================================');
  
  // Check all required environment variables
  const requiredEnvVars = {
    'SENDGRID_API_KEY': process.env.SENDGRID_API_KEY,
    'SENDGRID_FROM_EMAIL': process.env.SENDGRID_FROM_EMAIL,
    'OWNER_EMAIL': process.env.OWNER_EMAIL,
    'OWNER_WIFE_EMAIL': process.env.OWNER_WIFE_EMAIL,
    'TWILIO_ACCOUNT_SID': process.env.TWILIO_ACCOUNT_SID,
    'TWILIO_AUTH_TOKEN': process.env.TWILIO_AUTH_TOKEN,
    'TWILIO_PHONE_NUMBER': process.env.TWILIO_PHONE_NUMBER,
    'OWNER_PHONE': process.env.OWNER_PHONE,
    'OWNER_WIFE_PHONE': process.env.OWNER_WIFE_PHONE
  };

  let missingVars = [];
  let invalidVars = [];

  for (const [key, value] of Object.entries(requiredEnvVars)) {
    if (!value) {
      console.log(`❌ MISSING: ${key}`);
      missingVars.push(key);
    } else {
      // Check if values look valid (without exposing them)
      let isValid = true;
      let reason = '';
      
      if (key === 'SENDGRID_API_KEY' && !value.startsWith('SG.')) {
        isValid = false;
        reason = 'Should start with "SG."';
      } else if (key === 'TWILIO_ACCOUNT_SID' && !value.startsWith('AC')) {
        isValid = false;
        reason = 'Should start with "AC"';
      } else if (key.includes('EMAIL') && !value.includes('@')) {
        isValid = false;
        reason = 'Should contain "@"';
      } else if (key.includes('PHONE') && value.length < 10) {
        isValid = false;
        reason = 'Phone number too short';
      }
      
      if (isValid) {
        console.log(`✅ FOUND: ${key} = ${value.substring(0, 4)}...${value.slice(-4)} (${value.length} chars)`);
      } else {
        console.log(`⚠️ INVALID: ${key} - ${reason}`);
        invalidVars.push({ key, reason });
      }
    }
  }

  if (missingVars.length > 0) {
    console.log('');
    console.log('💥 MISSING ENVIRONMENT VARIABLES:');
    console.log('These need to be set in your Render environment:');
    missingVars.forEach(varName => {
      console.log(`• ${varName}`);
    });
    console.log('');
    console.log('🔧 TO FIX: Go to Render Dashboard → Your Service → Environment → Add these variables');
  }

  if (invalidVars.length > 0) {
    console.log('');
    console.log('⚠️ INVALID ENVIRONMENT VARIABLES:');
    invalidVars.forEach(({ key, reason }) => {
      console.log(`• ${key}: ${reason}`);
    });
  }

  console.log('');
  console.log('🧪 TESTING SENDGRID CONNECTION');
  console.log('==============================');

  if (!process.env.SENDGRID_API_KEY) {
    console.log('❌ Cannot test SendGrid - SENDGRID_API_KEY missing');
  } else {
    try {
      const sgMail = await import('@sendgrid/mail');
      sgMail.default.setApiKey(process.env.SENDGRID_API_KEY);
      
      console.log('✅ SendGrid module imported and API key set');
      
      // Test API key validity (this doesn't send an email, just validates the key)
      try {
        // We'll do a test that validates the API key without sending
        console.log('🔍 Testing SendGrid API key validity...');
        
        if (!process.env.SENDGRID_FROM_EMAIL || !process.env.OWNER_EMAIL) {
          console.log('⚠️ Cannot test email sending - missing FROM or TO email addresses');
        } else {
          console.log('✅ SendGrid configuration looks valid');
          console.log(`📧 Would send FROM: ${process.env.SENDGRID_FROM_EMAIL}`);
          console.log(`📧 Would send TO: ${process.env.OWNER_EMAIL}`);
          
          // Actually test sending a real email
          console.log('');
          console.log('📤 ATTEMPTING TO SEND TEST EMAIL...');
          
          const testEmailMsg = {
            to: process.env.OWNER_EMAIL,
            from: process.env.SENDGRID_FROM_EMAIL,
            subject: '🧪 SwanStudios Contact System Test Email',
            text: \`This is a test email from your SwanStudios contact system diagnostic.

Test Details:
• Date: \${new Date().toISOString()}
• Environment: \${process.env.NODE_ENV || 'development'}
• Server: Render Production

If you received this email, your SendGrid integration is working correctly!

Your SwanStudios Contact System\`,
            html: \`
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #00ffff;">🧪 SwanStudios Contact System Test</h2>
              <p>This is a test email from your SwanStudios contact system diagnostic.</p>
              
              <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h3>Test Details:</h3>
                <ul>
                  <li><strong>Date:</strong> \${new Date().toISOString()}</li>
                  <li><strong>Environment:</strong> \${process.env.NODE_ENV || 'development'}</li>
                  <li><strong>Server:</strong> Render Production</li>
                </ul>
              </div>
              
              <p style="color: #28a745;"><strong>✅ If you received this email, your SendGrid integration is working correctly!</strong></p>
              
              <hr style="margin: 30px 0;">
              <p style="color: #666; font-size: 14px;">Your SwanStudios Contact System</p>
            </div>
            \`
          };

          await sgMail.default.send(testEmailMsg);
          console.log('✅ SUCCESS! Test email sent via SendGrid');
          console.log('📧 Check your email inbox for the test message');
        }
        
      } catch (emailError) {
        console.log('❌ SendGrid email test FAILED:');
        console.log(\`💥 Error: \${emailError.message}\`);
        
        if (emailError.response) {
          console.log(\`📊 Status Code: \${emailError.response.status}\`);
          console.log(\`📊 Response Body: \${JSON.stringify(emailError.response.body, null, 2)}\`);
        }
        
        // Common SendGrid issues
        if (emailError.message.includes('401')) {
          console.log('🔧 LIKELY ISSUE: Invalid API key');
        } else if (emailError.message.includes('403')) {
          console.log('🔧 LIKELY ISSUE: Sender identity not verified in SendGrid');
        } else if (emailError.message.includes('400')) {
          console.log('🔧 LIKELY ISSUE: Invalid email addresses or message format');
        }
      }
      
    } catch (sgError) {
      console.log(\`❌ SendGrid import/setup failed: \${sgError.message}\`);
    }
  }

  console.log('');
  console.log('🧪 TESTING TWILIO CONNECTION');
  console.log('============================');

  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    console.log('❌ Cannot test Twilio - missing ACCOUNT_SID or AUTH_TOKEN');
  } else {
    try {
      const twilio = await import('twilio');
      const client = twilio.default(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      
      console.log('✅ Twilio client created successfully');
      
      // Test Twilio account validity
      try {
        console.log('🔍 Testing Twilio account validity...');
        
        const account = await client.api.accounts(process.env.TWILIO_ACCOUNT_SID).fetch();
        console.log(\`✅ Twilio account verified: \${account.friendlyName}\`);
        console.log(\`📊 Account status: \${account.status}\`);
        
        if (!process.env.TWILIO_PHONE_NUMBER || !process.env.OWNER_PHONE) {
          console.log('⚠️ Cannot test SMS sending - missing phone numbers');
        } else {
          console.log('✅ Twilio configuration looks valid');
          console.log(\`📱 Would send FROM: \${process.env.TWILIO_PHONE_NUMBER}\`);
          console.log(\`📱 Would send TO: \${process.env.OWNER_PHONE}\`);
          
          // Actually test sending a real SMS
          console.log('');
          console.log('📤 ATTEMPTING TO SEND TEST SMS...');
          
          const testSmsMessage = \`🧪 SwanStudios Test SMS

This is a test message from your contact system diagnostic.

Date: \${new Date().toLocaleString()}
Server: Render Production

If you received this SMS, your Twilio integration is working correctly!

- SwanStudios Contact System\`;

          const message = await client.messages.create({
            body: testSmsMessage,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: process.env.OWNER_PHONE
          });
          
          console.log(\`✅ SUCCESS! Test SMS sent via Twilio\`);
          console.log(\`📱 Message SID: \${message.sid}\`);
          console.log(\`📱 Check your phone for the test message\`);
        }
        
      } catch (smsError) {
        console.log('❌ Twilio SMS test FAILED:');
        console.log(\`💥 Error: \${smsError.message}\`);
        console.log(\`📊 Error Code: \${smsError.code}\`);
        
        // Common Twilio issues
        if (smsError.code === 20003) {
          console.log('🔧 LIKELY ISSUE: Invalid Twilio credentials');
        } else if (smsError.code === 21211) {
          console.log('🔧 LIKELY ISSUE: Invalid phone number format');
        } else if (smsError.code === 21608) {
          console.log('🔧 LIKELY ISSUE: Phone number not verified for trial account');
        }
      }
      
    } catch (twilioError) {
      console.log(\`❌ Twilio import/setup failed: \${twilioError.message}\`);
    }
  }

  console.log('');
  console.log('📋 DIAGNOSTIC SUMMARY & NEXT STEPS');
  console.log('==================================');
  
  if (missingVars.length === 0 && invalidVars.length === 0) {
    console.log('🎉 ALL ENVIRONMENT VARIABLES LOOK GOOD!');
    console.log('');
    console.log('📧 If email test succeeded: SendGrid is working perfectly');
    console.log('📱 If SMS test succeeded: Twilio is working perfectly');
    console.log('');
    console.log('🔧 NEXT: Update your contact route to use these services properly');
  } else {
    console.log('❌ ISSUES FOUND - HERE\'S HOW TO FIX THEM:');
    console.log('');
    
    if (missingVars.includes('SENDGRID_API_KEY')) {
      console.log('📧 SENDGRID SETUP:');
      console.log('1. Go to https://sendgrid.com → Login → Settings → API Keys');
      console.log('2. Create new API key with "Mail Send" permissions');
      console.log('3. Copy the key (starts with SG.)');
      console.log('4. Add to Render: Environment → SENDGRID_API_KEY');
      console.log('');
    }
    
    if (missingVars.includes('SENDGRID_FROM_EMAIL')) {
      console.log('📧 SENDGRID SENDER VERIFICATION:');
      console.log('1. Go to SendGrid → Settings → Sender Authentication');
      console.log('2. Verify your sending email address');
      console.log('3. Add verified email to: SENDGRID_FROM_EMAIL');
      console.log('');
    }
    
    if (missingVars.includes('TWILIO_ACCOUNT_SID')) {
      console.log('📱 TWILIO SETUP:');
      console.log('1. Go to https://twilio.com → Login → Console Dashboard');
      console.log('2. Copy Account SID (starts with AC)');
      console.log('3. Copy Auth Token');
      console.log('4. Get your Twilio phone number');
      console.log('5. Add all to Render environment variables');
      console.log('');
    }
    
    console.log('🔧 RENDER ENVIRONMENT SETUP:');
    console.log('1. Go to Render Dashboard → Your Service');
    console.log('2. Click "Environment" in left sidebar');
    console.log('3. Add each missing variable with "Add Environment Variable"');
    console.log('4. Click "Save Changes" (this will restart your service)');
    console.log('');
    console.log('5. Run this diagnostic again after setting variables');
  }
}

// Run the diagnostic
diagnoseSendGridAndTwilio().catch(error => {
  console.error('💥 Diagnostic failed:', error);
});
