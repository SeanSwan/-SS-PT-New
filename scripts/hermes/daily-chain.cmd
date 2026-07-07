@echo off
rem daily-chain.cmd - the HermesOS-Daily task action. Kept as a wrapper because
rem schtasks /TR is hard-capped at 261 characters (caught live by Sean's first
rem activation run). Runs the 06:00 chain from the PINNED runtime this file
rem lives in, logging to ~/.hermes/daily-task.log. Every command re-reads its
rem kill switches fresh (fail closed) - this clock carries no authority.
setlocal
set "REPO=%~dp0..\.."
set "LOG=%USERPROFILE%\.hermes\daily-task.log"
cd /d "%REPO%"
echo === chain start %date% %time% >> "%LOG%"
node scripts\hermes\hermes-doctor.mjs >> "%LOG%" 2>&1
node scripts\hermes\health-sweep.mjs >> "%LOG%" 2>&1
node scripts\hermes\receipt-digest.mjs >> "%LOG%" 2>&1
node scripts\hermes\morning-briefing.mjs >> "%LOG%" 2>&1
node scripts\hermes\status-page.mjs >> "%LOG%" 2>&1
echo === chain end %date% %time% >> "%LOG%"
