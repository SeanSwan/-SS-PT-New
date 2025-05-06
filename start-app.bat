@echo off
echo Running fix scripts to ensure all files are created...
cd backend
node fix-server.mjs
node fix-remaining-models.mjs
cd ..
echo Starting the application...
npm run start
