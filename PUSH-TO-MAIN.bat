@echo off
echo 🚀 PUSHING P0 FIXES TO PRODUCTION
echo =================================
git add .
git commit -m "🚀 Complete P0 fixes: UUID migration, CORS platform headers, backend recovery"
git push origin main
echo ✅ Push complete! Deployment will start automatically.
pause