@echo off
rem Post one market card to Facebook/Instagram (ASCII only in .bat)
cd /d "%~dp0"
if not exist logs mkdir logs
echo ===== %date% %time% ===== >> logs\social.log
call node scripts\social\post.mjs --count 1 >> logs\social.log 2>&1
echo exit=%errorlevel% >> logs\social.log
