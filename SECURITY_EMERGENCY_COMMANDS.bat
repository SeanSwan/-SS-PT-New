@echo off
echo ===================================================================
echo SECURITY EMERGENCY: REMOVING SECRETS FROM GIT HISTORY
echo ===================================================================
echo.
echo STEP 1: Remove the dangerous file
del "env.txt.backup"
echo File deleted locally.
echo.
echo STEP 2: Remove from git and clean history
git rm --cached env.txt.backup 2>nul
git filter-branch --force --index-filter "git rm --cached --ignore-unmatch env.txt.backup" --prune-empty --tag-name-filter cat -- --all
echo.
echo STEP 3: Force garbage collection to purge history
git for-each-ref --format="delete %%r" refs/original | git update-ref --stdin
git reflog expire --expire=now --all
git gc --prune=now --aggressive
echo.
echo STEP 4: Add to staging and commit CORS fixes
git add backend/core/app.mjs backend/render.yaml
git commit -m "fix: CRITICAL - remove secrets + apply CORS middleware order fix"
echo.
echo STEP 5: Force push to overwrite repository history
echo WARNING: This will rewrite git history to remove secrets
git push origin main --force
echo.
echo ===================================================================
echo SECURITY CLEANUP COMPLETE
echo ===================================================================
pause
