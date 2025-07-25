@echo off
echo Creating backup branch before Universal Master Schedule fixes...
cd /d "C:\Users\ogpsw\Desktop\quick-pt\SS-PT"
git checkout -b backup-before-universal-schedule-fix
git add .
git commit -m "BACKUP: Before Universal Master Schedule completion and routing fixes"
git push origin backup-before-universal-schedule-fix
echo Backup branch created successfully!
pause
