@echo off
rem Monthly update: fetch -> aggregate -> generate text -> git push (ASCII only in .bat)
cd /d "%~dp0"
if not exist logs mkdir logs
echo ===== %date% %time% ===== >> logs\monthly.log
call node scripts\monthly.mjs >> logs\monthly.log 2>&1
