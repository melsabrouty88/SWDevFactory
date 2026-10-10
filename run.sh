#!/usr/bin/env bash
set -e

# Change directory to the location of this script
cd "$(dirname "$0")"

echo "============================================="
echo " Starting Multi-Agent Software Factory...    "
echo "============================================="

# Check if setup was run
if [ ! -d "venv" ]; then
    echo "[ERROR] Virtual environment 'venv' not found."
    echo "Please run ./setup.sh for first-time installation."
    exit 1
fi

# Activate the virtual environment
source venv/bin/activate

# Start the Streamlit Dashboard
echo "-> Booting up the UI Control Plane..."
streamlit run dashboard/app.py
