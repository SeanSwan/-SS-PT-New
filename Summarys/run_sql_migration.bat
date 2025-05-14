@echo off
echo SwanStudios Database Migration
echo =============================
echo.
echo This script will run the SQL migration directly using psql.
echo.

set /p PG_USER=Enter PostgreSQL username (default: swanadmin): 
if "%PG_USER%"=="" set PG_USER=swanadmin

set /p PG_DB=Enter PostgreSQL database name (default: swanstudios): 
if "%PG_DB%"=="" set PG_DB=swanstudios

set /p PG_HOST=Enter PostgreSQL host (default: localhost): 
if "%PG_HOST%"=="" set PG_HOST=localhost

set /p PG_PORT=Enter PostgreSQL port (default: 5432): 
if "%PG_PORT%"=="" set PG_PORT=5432

echo.
echo Running SQL migration...
echo.

psql -h %PG_HOST% -p %PG_PORT% -U %PG_USER% -d %PG_DB% -f add_mcp_columns.sql

echo.
echo Migration completed. Check the output above for details.
echo.
echo If the migration was successful, please restart your servers.
echo.

pause