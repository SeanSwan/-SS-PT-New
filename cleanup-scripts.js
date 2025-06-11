const fs = require('fs');
const path = require('path');

const ROOT_DIR = 'C:\\Users\\ogpsw\\Desktop\\quick-pt\\SS-PT';
const ARCHIVE_DIR = path.join(ROOT_DIR, 'ARCHIVED_SCRIPTS');

// Essential scripts to keep (relative to ROOT_DIR)
const KEEP_SCRIPTS = [
  'START-DEV-SERVERS.bat',
  'START-BACKEND-ONLY.bat',
  'START-FRONTEND-ONLY.bat', 
  'QUICK-DEV-START.bat',
  'DEPLOY-TO-RENDER.bat',
  'PUSH-TO-MAIN.bat',
  'FINAL-PUSH-NO-SECRETS.bat',
  'CHECK-STATUS.bat',
  'VERIFY-PRODUCTION.bat',
  'GET-DATABASE-INFO.bat',
  'SHOW-ALL-USERS.bat',
  'START-ALL-MCP-SERVERS.bat',
  'package.json',
  'file-tree.js',
  '.gitignore',
  '.env.example'
];

// Patterns to archive (will archive files matching these patterns)
const ARCHIVE_PATTERNS = [
  /^FIX-.+\.(bat|mjs|sh|js|cjs)$/,
  /^fix-.+\.(bat|mjs|sh|js|cjs)$/,
  /^TEST-.+\.(bat|mjs|sh|js|cjs)$/,
  /^test-.+\.(bat|mjs|sh|js|cjs)$/,
  /^CHECK-.+\.(bat|mjs|sh|js|cjs)$/,
  /^check-.+\.(bat|mjs|sh|js|cjs)$/,
  /^DEPLOY-.+\.(bat|mjs|sh|js|cjs)$/,
  /^deploy-.+\.(bat|mjs|sh|js|cjs)$/,
  /^QUICK-.+\.(bat|mjs|sh|js|cjs)$/,
  /^quick-.+\.(bat|mjs|sh|js|cjs)$/,
  /^EMERGENCY-.+\.(bat|mjs|sh|js|cjs|md)$/,
  /^emergency-.+\.(bat|mjs|sh|js|cjs|md)$/,
  /^CRITICAL-.+\.(bat|mjs|sh|js|cjs|md)$/,
  /^critical-.+\.(bat|mjs|sh|js|cjs|md)$/,
  /^COMPLETE-.+\.(bat|mjs|sh|js|cjs|md)$/,
  /^complete-.+\.(bat|mjs|sh|js|cjs|md)$/,
  /^COMPREHENSIVE-.+\.(bat|mjs|sh|js|cjs|md)$/,
  /^comprehensive-.+\.(bat|mjs|sh|js|cjs|md)$/,
  /^MANUAL-.+\.(bat|mjs|sh|js|cjs|md)$/,
  /^manual-.+\.(bat|mjs|sh|js|cjs|md)$/,
  /^VERIFY-.+\.(bat|mjs|sh|js|cjs)$/,
  /^verify-.+\.(bat|mjs|sh|js|cjs)$/,
  /^DIAGNOSE-.+\.(bat|mjs|sh|js|cjs)$/,
  /^diagnose-.+\.(bat|mjs|sh|js|cjs)$/,
  /^SIMPLE-.+\.(bat|mjs|sh|js|cjs)$/,
  /^simple-.+\.(bat|mjs|sh|js|cjs)$/,
  /^IMMEDIATE-.+\.(bat|mjs|sh|js|cjs)$/,
  /^immediate-.+\.(bat|mjs|sh|js|cjs)$/,
  /^ULTIMATE-.+\.(bat|mjs|sh|js|cjs|md)$/,
  /^ultimate-.+\.(bat|mjs|sh|js|cjs|md)$/,
  /^FINAL-.+\.(bat|mjs|sh|js|cjs|md)$/,
  /^final-.+\.(bat|mjs|sh|js|cjs|md)$/,
  /^TARGETED-.+\.(bat|mjs|sh|js|cjs|md)$/,
  /^targeted-.+\.(bat|mjs|sh|js|cjs|md)$/,
  /^ROBUST-.+\.(bat|mjs|sh|js|cjs|md)$/,
  /^robust-.+\.(bat|mjs|sh|js|cjs|md)$/,
  /^VISIBLE-.+\.(bat|mjs|sh|js|cjs)$/,
  /^visible-.+\.(bat|mjs|sh|js|cjs)$/,
  /^RENDER-.+\.(bat|mjs|sh|js|cjs|md)$/,
  /^render-.+\.(bat|mjs|sh|js|cjs|md)$/,
  /^DEBUG-.+\.(bat|mjs|sh|js|cjs)$/,
  /^debug-.+\.(bat|mjs|sh|js|cjs)$/,
  /^URGENT-.+\.(bat|mjs|sh|js|cjs)$/,
  /^urgent-.+\.(bat|mjs|sh|js|cjs)$/,
  /^PRODUCTION-.+\.(bat|mjs|sh|js|cjs|md)$/,
  /^production-.+\.(bat|mjs|sh|js|cjs|md)$/,
  /^SESSION-.+\.(bat|mjs|sh|js|cjs|md)$/,
  /^session-.+\.(bat|mjs|sh|js|cjs|md)$/,
  /^MIGRATION-.+\.(bat|mjs|sh|js|cjs|sql|md)$/,
  /^migration-.+\.(bat|mjs|sh|js|cjs|sql|md)$/,
  /^DIRECT-.+\.(bat|mjs|sh|js|cjs)$/,
  /^direct-.+\.(bat|mjs|sh|js|cjs)$/,
  /^FORCE-.+\.(bat|mjs|sh|js|cjs)$/,
  /^force-.+\.(bat|mjs|sh|js|cjs)$/,
  /^KILL-.+\.(bat|mjs|sh|js|cjs)$/,
  /^kill-.+\.(bat|mjs|sh|js|cjs)$/,
  /^SETUP-.+\.(bat|mjs|sh|js|cjs)$/,
  /^setup-.+\.(bat|mjs|sh|js|cjs)$/,
  /^EXECUTE-.+\.(bat|mjs|sh|js|cjs)$/,
  /^execute-.+\.(bat|mjs|sh|js|cjs)$/,
  /^ROOT-.+\.(bat|mjs|sh|js|cjs)$/,
  /^root-.+\.(bat|mjs|sh|js|cjs)$/,
  /^master-.+\.(bat|mjs|sh|js|cjs)$/,
  /^run-.+\.(bat|mjs|sh|js|cjs)$/,
  /^auth-.+\.(bat|mjs|sh|js|cjs|html)$/,
  /^CONTACT-.+\.(bat|mjs|sh|js|cjs|md)$/,
  /^contact-.+\.(bat|mjs|sh|js|cjs|md)$/,
  /^CORS-.+\.(bat|mjs|sh|js|cjs|md)$/,
  /^cors-.+\.(bat|mjs|sh|js|cjs|md)$/,
  /^DATABASE-.+\.(bat|mjs|sh|js|cjs|md)$/,
  /^database-.+\.(bat|mjs|sh|js|cjs|md)$/,
  /^FOREIGN-.+\.(bat|mjs|sh|js|cjs|md)$/,
  /^foreign-.+\.(bat|mjs|sh|js|cjs|md)$/,
  /^FK-.+\.(bat|mjs|sh|js|cjs|md)$/,
  /^fk-.+\.(bat|mjs|sh|js|cjs|md)$/,
  /^UUID-.+\.(bat|mjs|sh|js|cjs|md|sql)$/,
  /^uuid-.+\.(bat|mjs|sh|js|cjs|md|sql)$/,
  /^SPA-.+\.(bat|mjs|sh|js|cjs|md)$/,
  /^spa-.+\.(bat|mjs|sh|js|cjs|md)$/,
  /^VIDEO-.+\.(bat|mjs|sh|js|cjs|md)$/,
  /^video-.+\.(bat|mjs|sh|js|cjs|md)$/,
  /^STORE-.+\.(bat|mjs|sh|js|cjs|md)$/,
  /^store-.+\.(bat|mjs|sh|js|cjs|md)$/,
  /^CLIENT-.+\.(bat|mjs|sh|js|cjs|md)$/,
  /^client-.+\.(bat|mjs|sh|js|cjs|md)$/,
  /^PROXY-.+\.(bat|mjs|sh|js|cjs|md)$/,
  /^proxy-.+\.(bat|mjs|sh|js|cjs|md)$/,
  /^WEBPACK-.+\.(bat|mjs|sh|js|cjs|md)$/,
  /^webpack-.+\.(bat|mjs|sh|js|cjs|md)$/,
  /^CLEAN-.+\.(bat|mjs|sh|js|cjs)$/,
  /^clean-.+\.(bat|mjs|sh|js|cjs)$/,
  /^CLEAR-.+\.(bat|mjs|sh|js|cjs)$/,
  /^clear-.+\.(bat|mjs|sh|js|cjs)$/,
  /^RESTART-.+\.(bat|mjs|sh|js|cjs)$/,
  /^restart-.+\.(bat|mjs|sh|js|cjs)$/,
  /^TROUBLESHOOT-.+\.(bat|mjs|sh|js|cjs)$/,
  /^troubleshoot-.+\.(bat|mjs|sh|js|cjs)$/,
  /^VALIDATE-.+\.(bat|mjs|sh|js|cjs)$/,
  /^validate-.+\.(bat|mjs|sh|js|cjs)$/,
  /^TRACE-.+\.(bat|mjs|sh|js|cjs)$/,
  /^trace-.+\.(bat|mjs|sh|js|cjs)$/,
  /^INSPECT-.+\.(bat|mjs|sh|js|cjs)$/,
  /^inspect-.+\.(bat|mjs|sh|js|cjs)$/,
  /^cleanup-.+\.(bat|mjs|sh|js|cjs)$/,
  /^CLEANUP-.+\.(bat|mjs|sh|js|cjs)$/,
  /.*-FIXES?-.+\.(bat|mjs|sh|js|cjs|md)$/,
  /.*-fixes?-.+\.(bat|mjs|sh|js|cjs|md)$/,
  /.*-SUMMARY\.(bat|mjs|sh|js|cjs|md)$/,
  /.*-summary\.(bat|mjs|sh|js|cjs|md)$/,
  /.*-GUIDE\.(bat|mjs|sh|js|cjs|md)$/,
  /.*-guide\.(bat|mjs|sh|js|cjs|md)$/,
  /.*-DOCUMENTATION\.(bat|mjs|sh|js|cjs|md)$/,
  /.*-documentation\.(bat|mjs|sh|js|cjs|md)$/,
  /.*-REPORT\.(bat|mjs|sh|js|cjs|md)$/,
  /.*-report\.(bat|mjs|sh|js|cjs|md)$/,
  /.*-HANDOFF\.(bat|mjs|sh|js|cjs|md)$/,
  /.*-handoff\.(bat|mjs|sh|js|cjs|md)$/,
  /.*-CHECKLIST\.(bat|mjs|sh|js|cjs|md)$/,
  /.*-checklist\.(bat|mjs|sh|js|cjs|md)$/,
  /.*-INSTRUCTIONS\.(bat|mjs|sh|js|cjs|md)$/,
  /.*-instructions\.(bat|mjs|sh|js|cjs|md)$/,
  /.*-STATUS\.(bat|mjs|sh|js|cjs|md)$/,
  /.*-status\.(bat|mjs|sh|js|cjs|md)$/,
  /.*-ANALYSIS\.(bat|mjs|sh|js|cjs|md)$/,
  /.*-analysis\.(bat|mjs|sh|js|cjs|md)$/,
  /.*-DIAGNOSTIC\.(bat|mjs|sh|js|cjs|md)$/,
  /.*-diagnostic\.(bat|mjs|sh|js|cjs|md)$/,
  /.*-EXPLANATION\.(bat|mjs|sh|js|cjs|md)$/,
  /.*-explanation\.(bat|mjs|sh|js|cjs|md)$/,
  /.*-COMPLETE\.(bat|mjs|sh|js|cjs|md)$/,
  /.*-complete\.(bat|mjs|sh|js|cjs|md)$/,
  /.*-APPLIED\.(bat|mjs|sh|js|cjs|md)$/,
  /.*-applied\.(bat|mjs|sh|js|cjs|md)$/,
  /.*-SOLUTION\.(bat|mjs|sh|js|cjs|md)$/,
  /.*-solution\.(bat|mjs|sh|js|cjs|md)$/,
  /.*-RECOVERY\.(bat|mjs|sh|js|cjs|md)$/,
  /.*-recovery\.(bat|mjs|sh|js|cjs|md)$/,
  /.*-DEPLOYMENT\.(bat|mjs|sh|js|cjs|md)$/,
  /.*-deployment\.(bat|mjs|sh|js|cjs|md)$/,
  /.*-TOOLKIT\.(bat|mjs|sh|js|cjs|md)$/,
  /.*-toolkit\.(bat|mjs|sh|js|cjs|md)$/,
  /.*-WIZARD\.(bat|mjs|sh|js|cjs|md)$/,
  /.*-wizard\.(bat|mjs|sh|js|cjs|md)$/,
  /.*-TRACER\.(bat|mjs|sh|js|cjs|md)$/,
  /.*-tracer\.(bat|mjs|sh|js|cjs|md)$/,
  /.*-SUCCESS\.(bat|mjs|sh|js|cjs|md)$/,
  /.*-success\.(bat|mjs|sh|js|cjs|md)$/,
  /.*-RESOLVED\.(bat|mjs|sh|js|cjs|md)$/,
  /.*-resolved\.(bat|mjs|sh|js|cjs|md)$/,
  /.*-VERIFICATION\.(bat|mjs|sh|js|cjs|md)$/,
  /.*-verification\.(bat|mjs|sh|js|cjs|md)$/,
  /.*-EMERGENCY\.(bat|mjs|sh|js|cjs|md)$/,
  /.*-emergency\.(bat|mjs|sh|js|cjs|md)$/,
  // Log files and other temporary files
  /.*\.log$/,
  /.*\.backup$/,
  /.*\.old$/,
  /error\.log$/,
  /combined\.log$/,
  // Specific files with emoji/special prefixes
  /^⚡-.+\.(bat|mjs|sh|js|cjs|md)$/,
  /^🎯-.+\.(bat|mjs|sh|js|cjs|md)$/,
  /^🚨-.+\.(bat|mjs|sh|js|cjs|md)$/,
  /^💡-.+\.(bat|mjs|sh|js|cjs|md)$/,
  /^🔧-.+\.(bat|mjs|sh|js|cjs|md)$/,
  /^🎉-.+\.(bat|mjs|sh|js|cjs|md)$/,
  // Files that start with browser- or specific tools
  /^browser-.+\.(bat|mjs|sh|js|cjs)$/,
  /^BROWSER-.+\.(bat|mjs|sh|js|cjs)$/,
  /^nginx-.+\.(bat|mjs|sh|js|cjs|conf)$/,
  /^NGINX-.+\.(bat|mjs|sh|js|cjs|conf)$/,
  // File conflict files like ProfileContainer-fix.tsx (in root)
  /^ProfileContainer-fix\.(tsx|jsx|ts|js)$/,
  /^.*-fix\.(tsx|jsx|ts|js)$/,
  /^.*-Fix\.(tsx|jsx|ts|js)$/,
  /^.*-FIX\.(tsx|jsx|ts|js)$/,
  // Other temporary files in root
  /^STARTUP-FAILURE-PATTERNS\.txt$/,
  /^WORST-ISSUES\.md$/,
  /^MISSION-ACCOMPLISHED\.md$/,
  /^LOGIN-DIAGNOSIS\.md$/,
  /^ENVIRONMENT-CLEANUP-PLAN\.md$/,
  /^P0-CRISIS-RESOLUTION-COMPLETE\.md$/,
  /^README-DIAGNOSTIC-REQUIRED\.md$/,
  /^SUCCESS-.+\.(bat|mjs|sh|js|cjs|md)$/,
  /^MCP_.+\.(bat|mjs|sh|js|cjs|md)$/,
  /^MINIMAL-.+\.(bat|mjs|sh|js|cjs|sql|md)$/,
  /^DIAGNOSTIC-.+\.(bat|mjs|sh|js|cjs|sql|md)$/,
  /^SECURITY_.+\.(bat|mjs|sh|js|cjs|md)$/,
  /^SERVER-.+\.(bat|mjs|sh|js|cjs|md)$/,
  /^SERVICE_.+\.(bat|mjs|sh|js|cjs|md)$/,
  /^SCROLL_.+\.(bat|mjs|sh|js|cjs|md)$/,
  /^ROLE-.+\.(bat|mjs|sh|js|cjs|md)$/,
  /^RARE-.+\.(bat|mjs|sh|js|cjs|md)$/,
  /^PROJECT-.+\.(bat|mjs|sh|js|cjs|md)$/,
  /^STELLAR_.+\.(bat|mjs|sh|js|cjs|md)$/,
  /^STYLED_.+\.(bat|mjs|sh|js|cjs|md)$/,
  /^SWANSTUDIOS-.+\.(bat|mjs|sh|js|cjs|md)$/,
  /^USER_.+\.(bat|mjs|sh|js|cjs|md)$/,
  /^USERDASHBOARD-.+\.(bat|mjs|sh|js|cjs|md)$/,
  /^CONNECTION-.+\.(bat|mjs|sh|js|cjs|md)$/,
  /^CRISIS-.+\.(bat|mjs|sh|js|cjs|md)$/,
  /^DEFINITIVE_.+\.(bat|mjs|sh|js|cjs|md)$/,
  /^DEPLOYMENT-.+\.(bat|mjs|sh|js|cjs|md)$/,
  /^ES_.+\.(bat|mjs|sh|js|cjs|md)$/,
  /^ENHANCED_.+\.(bat|mjs|sh|js|cjs|md)$/,
  /^ENHANCEMENT_.+\.(bat|mjs|sh|js|cjs|md)$/,
  /^FAVICON-.+\.(bat|mjs|sh|js|cjs|md)$/,
  /^FRONTEND-.+\.(bat|mjs|sh|js|cjs|md)$/,
  /^GIT_.+\.(bat|mjs|sh|js|cjs|md)$/,
  /^INFINITE_.+\.(bat|mjs|sh|js|cjs|md)$/,
  /^LOCAL-.+\.(bat|mjs|sh|js|cjs|md)$/,
  /^LUXURY_.+\.(bat|mjs|sh|js|cjs|md)$/,
  /^COSMIC_.+\.(bat|mjs|sh|js|cjs|md)$/,
  /^{$/,
  // Files starting with analyze-
  /^analyze-.+\.(bat|mjs|sh|js|cjs)$/,
  /^ANALYZE-.+\.(bat|mjs|sh|js|cjs)$/
];

function shouldArchiveFile(fileName) {
  // Keep essential scripts
  if (KEEP_SCRIPTS.includes(fileName)) {
    return false;
  }
  
  // Check if file matches any archive pattern
  return ARCHIVE_PATTERNS.some(pattern => pattern.test(fileName));
}

function archiveClutterFiles() {
  try {
    const files = fs.readdirSync(ROOT_DIR);
    const archivedFiles = [];
    const keptFiles = [];
    
    for (const file of files) {
      const filePath = path.join(ROOT_DIR, file);
      const stat = fs.statSync(filePath);
      
      // Only process files, not directories
      if (stat.isFile()) {
        if (shouldArchiveFile(file)) {
          const archivePath = path.join(ARCHIVE_DIR, file);
          try {
            fs.renameSync(filePath, archivePath);
            archivedFiles.push(file);
          } catch (error) {
            console.error(`Failed to archive ${file}:`, error.message);
          }
        } else {
          keptFiles.push(file);
        }
      }
    }
    
    // Create summary report
    const summary = `# 🧹 SCRIPT CLEANUP SUMMARY

## Files Archived: ${archivedFiles.length}
${archivedFiles.map(f => `- ${f}`).join('\n')}

## Essential Files Kept: ${keptFiles.filter(f => f.endsWith('.bat') || f.endsWith('.mjs') || f.endsWith('.sh')).length}
${keptFiles.filter(f => f.endsWith('.bat') || f.endsWith('.mjs') || f.endsWith('.sh')).map(f => `- ${f}`).join('\n')}

## Cleanup Date: ${new Date().toISOString()}

All archived files are safely stored in /ARCHIVED_SCRIPTS/ and can be restored if needed.
`;
    
    fs.writeFileSync(path.join(ARCHIVE_DIR, 'CLEANUP_SUMMARY.md'), summary);
    
    console.log(`✅ Cleanup complete! Archived ${archivedFiles.length} files.`);
    console.log(`📋 Summary saved to ARCHIVED_SCRIPTS/CLEANUP_SUMMARY.md`);
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  }
}

// Execute cleanup
archiveClutterFiles();
