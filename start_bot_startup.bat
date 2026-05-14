@echo off
REM start_bot_startup.bat  (put a shortcut or the file itself in shell:startup)
REM Edit PY_EXE if needed
set PY_EXE=D:\python.exe
set BASE_DIR=C:\AttendanceAutomation
set RUN_SUPERVISOR=%BASE_DIR%\run_supervisor.bat
set LOG=%BASE_DIR%\startup_netwait.log

echo [%date% %time%] start_bot_startup.bat invoked (Startup folder) >> "%LOG%"

REM initial delay to allow Windows to settle
timeout /t 10 /nobreak >nul
echo [%date% %time%] initial delay 10 seconds... >> "%LOG%"

REM Wait up to 5 minutes for network (30 attempts x 10s)
set /a tries=0
:NETCHECK
set /a tries+=1
ping -n 1 8.8.8.8 >nul 2>&1
if %errorlevel%==0 (
    echo [%date% %time%] network available after %tries% attempts. Launching supervisor... >> "%LOG%"
    start "" /min cmd /c "%RUN_SUPERVISOR%"
    goto :EOF
) else (
    if %tries% geq 30 (
        echo [%date% %time%] network wait timed out after %tries% attempts. Not launching. >> "%LOG%"
        goto :EOF
    )
    timeout /t 10 /nobreak >nul
    goto :NETCHECK
)
