@echo off
rem Register Windows scheduled task: Mon/Wed/Fri 11:30, hidden via silent.vbs
set K=C:\Users\aenos\Downloads\karte
schtasks /create /f /tn "karte-baikyaku-social" /sc weekly /d MON,WED,FRI /st 11:30 /tr "wscript.exe \"%K%\silent.vbs\" \"%K%\baikyaku-site\run-social.bat\""
echo.
echo Done. Registered task karte-baikyaku-social (Mon/Wed/Fri 11:30).
pause
