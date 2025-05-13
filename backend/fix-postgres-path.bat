@echo off
echo Adding PostgreSQL to PATH...
setx PATH "C:\Program Files\PostgreSQL\17\bin;%PATH%" /M
echo PostgreSQL added to system PATH!
echo Please restart your command prompt/IDE and try again.
pause