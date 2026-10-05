@echo off
echo ========================================================
echo  Majh ^& Aaron Wedding Invitation Web Application
echo  Laravel 13 + SQLite / MySQL / SQL Server
echo ========================================================
echo.
cd /d "%~dp0"

echo [1/2] Checking PHP and Composer dependencies...
php -v >nul 2>&1
if errorlevel 1 (
    echo [ERROR] PHP is not found in PATH. Please ensure PHP 8.2+ is installed.
    pause
    exit /b 1
)

echo [2/2] Starting Laravel Local Development Server...
echo.
echo Application URL: http://localhost:8000
echo Admin Portal:    http://localhost:8000/admin/
echo Admin Login:     admin / WeddingAdmin2026!
echo.
echo Press Ctrl+C to stop the server at any time.
echo --------------------------------------------------------
php artisan serve --port=8000
