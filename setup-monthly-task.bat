@echo off
rem Register Windows scheduled task: 2nd day of every month at 04:00, hidden via silent.vbs
set K=C:\Users\aenos\Downloads\karte
schtasks /create /f /tn "karte-baikyaku-monthly" /sc monthly /d 2 /st 04:00 /tr "wscript.exe \"%K%\silent.vbs\" \"%K%\baikyaku-site\run-monthly.bat\""
echo.
echo Done. Registered task karte-baikyaku-monthly (monthly, day 2, 04:00).
pause
