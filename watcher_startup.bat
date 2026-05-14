@echo off
cd /d C:\AttendanceAutomation
REM use D:\python.exe here
start "" /min "D:\python.exe" -u "C:\AttendanceAutomation\watcher.py"
exit /b 0
