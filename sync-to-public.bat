@echo off
echo ========================================
echo   Syncing Frontend to Public Folder
echo ========================================
echo.

echo [1/4] Copying Frontend files...
xcopy /E /I /Y "frontend" "public"

echo [2/4] Copying Tool 2 files...
xcopy /E /I /Y "tool2\frontend" "public\tool2"

echo.
echo ========================================
echo   Sync Complete!
echo ========================================
echo.
pause
