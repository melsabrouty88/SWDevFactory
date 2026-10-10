#!/usr/bin/env bash
set -e

echo "============================================="
echo " Starting Multi-Agent Software Factory Setup "
echo "============================================="

# 1. Create Python virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "-> Creating Python virtual environment (venv)..."
    python3 -m venv venv
else
    echo "-> Virtual environment already exists."
fi

# 2. Activate virtual environment
source venv/bin/activate

# 3. Upgrade pip
echo "-> Upgrading pip..."
pip install --upgrade pip

# 4. Install main project dependencies
if [ -f "requirements.txt" ]; then
    echo "-> Installing main requirements..."
    pip install -r requirements.txt
else
    echo "-> No main requirements.txt found, skipping."
fi

# 5. Install dashboard specific dependencies
if [ -f "dashboard/requirements.txt" ]; then
    echo "-> Installing Dashboard UI requirements (Streamlit, Pandas)..."
    pip install -r dashboard/requirements.txt
else
    echo "-> No dashboard/requirements.txt found, skipping."
fi

# 6. Ensure scripts are executable
echo "-> Setting execution permissions on python scripts..."
chmod +x scripts/traceability_validator.py scripts/report_generator.py

echo "============================================="
echo " Setup Complete! 🎉"
echo " To start the system, simply execute: ./run.sh"
echo "============================================="
