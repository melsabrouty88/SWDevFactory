@echo off
:: Change directory to the location of this script
cd /d "%~dp0"

echo =============================================
echo  Starting Multi-Agent Software Factory...    
echo =============================================

:: Check if setup was run
IF NOT EXIST venv (
    echo [ERROR] Virtual environment 'venv' not found.
    echo Please double-click setup.bat for first-time installation.
    pause
    exit /b 1
)

:: Activate the virtual environment
call venv\Scripts\activate.bat

:: Start the Streamlit Dashboard
echo -^> Booting up the UI Control Plane...
streamlit run dashboard\app.py
pause
