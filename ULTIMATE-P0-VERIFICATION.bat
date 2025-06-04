@echo off
echo ========================================
echo FINAL P0 FIX VERIFICATION AND TEST
echo ========================================
echo.
echo We have fixed the major UUID to INTEGER mismatches:
echo - SocialLike: id, userId, targetId
echo - Challenge: id, creatorId, badgeId  
echo - ChallengeParticipant: id, challengeId, userId, teamId
echo - ChallengeTeam: id, challengeId, captainId
echo - SocialComment: id, postId, userId
echo - Exercise: id (UUID to INTEGER)
echo - SocialPost: workoutSessionId (removed FK to MongoDB)
echo.
echo Step 1: Killing any processes on port 10000...
echo.

REM Kill any Node.js processes on port 10000
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :10000') do (
    echo Killing process %%a
    taskkill /f /pid %%a 2>nul
)

REM Alternative method - kill all node processes to be sure
echo Killing all node.exe processes to ensure clean start...
taskkill /f /im node.exe 2>nul

echo.
echo Step 2: Waiting 5 seconds for complete cleanup...
timeout /t 5 /nobreak >nul

echo.
echo Step 3: Running final diagnostic to check model count...
echo.
cd backend
node diagnostic-p0-fixes.mjs

echo.
echo Step 4: Starting server to verify 43/43 models and clean DB sync...
echo.
echo Target: 43/43 models loaded with clean database sync
echo Expected: All FK constraints should work now
echo.
node server.mjs
