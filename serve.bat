@echo off
echo ========================================
echo   TypeMaster - Local Server
echo ========================================
echo.
echo Starting local server...
echo Open in browser: http://localhost:8000
echo.
echo Press Ctrl+C to stop the server
echo ========================================
echo.

REM Try Python 3 first
python -m http.server 8000 2>nul

REM If Python 3 fails, try Python 2
if errorlevel 1 (
    python -m SimpleHTTPServer 8000 2>nul
)

REM If both fail, show error
if errorlevel 1 (
    echo ERROR: Python not found!
    echo.
    echo Please install Python or use another method:
    echo - Open index.html directly in browser
    echo - Use: npx serve
    echo - Use PHP: php -S localhost:8000
    pause
)

