@echo off
REM Windows batch script to switch network configurations
echo.
echo PHILIX Finance - Network Configuration Switcher
echo =============================================
echo.

if "%1"=="" goto show_help
if "%1"=="help" goto show_help
if "%1"=="list" goto list_networks
if "%1"=="current" goto show_current

REM Apply configuration
node network-config.js apply %1
if %errorlevel% equ 0 (
    echo.
    echo ⚠️  Important: Restart your development servers for changes to take effect:
    echo    1. Stop backend server (Ctrl+C in backend terminal)
    echo    2. Stop frontend server (Ctrl+C in frontend terminal) 
    echo    3. Restart backend: cd backend ^&^& npm run dev
    echo    4. Restart frontend: npm run dev
    goto end
)
goto end

:show_help
echo Usage: switch-network.bat [command]
echo.
echo Commands:
echo   help                    - Show this help
echo   list                    - Show available network configurations
echo   current                 - Show current configuration and IP
echo   localhost              - Switch to localhost configuration
echo   home_wifi              - Switch to home WiFi configuration
echo   office_wifi            - Switch to office WiFi configuration  
echo   mobile_hotspot         - Switch to mobile hotspot configuration
echo   custom                 - Setup custom IP configuration
echo.
echo Examples:
echo   switch-network.bat mobile_hotspot
echo   switch-network.bat localhost
echo   switch-network.bat current
goto end

:list_networks
node network-config.js list
goto end

:show_current
node network-config.js current
goto end

:end