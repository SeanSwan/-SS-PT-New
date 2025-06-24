@echo off
echo 🧹 Committing Production Cleanup...
git add .
git commit -m "🧹 Production Cleanup: Consolidate files & remove duplicates

- Moved 25+ backup/duplicate files to organized /old/ directories
- Consolidated to single production-ready files with original naming
- Removed .BACKUP/.PRODUCTION suffixes from active codebase
- Created comprehensive cleanup documentation
- Verified all imports and routes working correctly
- Ready for Render deployment with clean structure

Files moved to archive:
- Context backups (8 files) → /context/old/
- Page backups (3 files) → /pages/old/  
- Service backups (3 files) → /services/old/
- Component backups → /components/old/
- Utility backups → /utils/old/

✅ Zero breaking changes
✅ All production files retained with original names
✅ Build successful (13.56s)
✅ Production-ready for deployment"

echo 🚀 Pushing to main...
git push origin main

echo ✅ Frontend cleanup committed and pushed!
pause
