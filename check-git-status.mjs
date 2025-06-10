import { spawn } from 'child_process';

function runCommand(command, args = []) {
  return new Promise((resolve, reject) => {
    const process = spawn(command, args, { shell: true });
    
    let stdout = '';
    let stderr = '';
    
    process.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    process.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    process.on('close', (code) => {
      resolve({ code, stdout, stderr });
    });
  });
}

async function main() {
  console.log('🔍 Checking git status for contact form deployment...');
  
  try {
    // Check git status
    const statusResult = await runCommand('git', ['status', '--porcelain']);
    
    if (statusResult.stdout.trim()) {
      console.log('📝 Files with changes:');
      console.log(statusResult.stdout);
      
      // Check specifically for ContactForm.tsx
      const contactFormModified = statusResult.stdout.includes('ContactForm.tsx');
      
      if (contactFormModified) {
        console.log('🎯 ContactForm.tsx has uncommitted changes - NEEDS DEPLOYMENT');
        
        // Show the specific status
        const lines = statusResult.stdout.split('\n');
        lines.forEach(line => {
          if (line.includes('ContactForm.tsx')) {
            console.log('📍 ContactForm.tsx status:', line);
          }
        });
        
        console.log('\n🚀 Ready to deploy enhanced contact form!');
        console.log('Next steps:');
        console.log('1. git add frontend/src/pages/contactpage/ContactForm.tsx');
        console.log('2. git commit -m "Fix: Enhanced contact form with debugging and feedback"');
        console.log('3. git push origin main');
        
      } else {
        console.log('✅ ContactForm.tsx appears to be already committed');
      }
    } else {
      console.log('✅ Working directory is clean - ContactForm.tsx already deployed');
    }
    
    // Also check current branch
    const branchResult = await runCommand('git', ['branch', '--show-current']);
    console.log('🌿 Current branch:', branchResult.stdout.trim());
    
  } catch (error) {
    console.error('❌ Error checking git status:', error);
  }
}

main();
