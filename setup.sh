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

echo ""
echo "============================================="
echo " GitHub Personal Access Token (PAT) Setup"
echo "============================================="
echo "The system requires a GitHub PAT to interact with issues and PRs via MCP."
echo "1. Your browser will now open to generate a new token."
echo "2. Generate a token (Classic) with 'repo' scope."
echo "3. Copy the generated token."
echo "4. Open the file 'config/mcp_servers.json' in your code editor."
echo "5. Replace the placeholder 'YOUR_GITHUB_PAT' with your copied token."

# Open browser based on OS
if [[ "$OSTYPE" == "darwin"* ]]; then
    open "https://github.com/settings/tokens/new"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    xdg-open "https://github.com/settings/tokens/new"
fi

echo ""
echo "============================================="
echo " Setup Complete! 🎉"
echo " After updating your PAT, execute: ./run.sh"
echo "============================================="
