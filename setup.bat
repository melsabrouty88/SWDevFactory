@echo off
echo =============================================
echo  Starting Multi-Agent Software Factory Setup 
echo =============================================

:: 1. Create Python virtual environment if it doesn't exist
IF NOT EXIST venv (
    echo -^> Creating Python virtual environment (venv)...
    python -m venv venv
) ELSE (
    echo -^> Virtual environment already exists.
)

:: 2. Activate virtual environment
call venv\Scripts\activate.bat

:: 3. Upgrade pip
echo -^> Upgrading pip...
python -m pip install --upgrade pip

:: 4. Install main project dependencies
IF EXIST requirements.txt (
    echo -^> Installing main requirements...
    pip install -r requirements.txt
) ELSE (
    echo -^> No main requirements.txt found, skipping.
)

:: 5. Install dashboard specific dependencies
IF EXIST dashboard\requirements.txt (
    echo -^> Installing Dashboard UI requirements (Streamlit, Pandas)...
    pip install -r dashboard\requirements.txt
) ELSE (
    echo -^> No dashboard\requirements.txt found, skipping.
)

echo =============================================
echo  Setup Complete! 
echo  To start the system, simply double-click run.bat
echo =============================================
pause
