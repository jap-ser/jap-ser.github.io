@echo off
rem Generate town explanations with Claude Code (resumable). Runs until done or usage limit.
cd /d "%~dp0"
if not exist logs mkdir logs
echo ===== %date% %time% ===== >> logs\text-gen.log
call node scripts\generate-text.mjs >> logs\text-gen.log 2>&1
echo exit=%errorlevel% >> logs\text-gen.log
