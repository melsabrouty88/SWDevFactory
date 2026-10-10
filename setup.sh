#!/usr/bin/env bash
set -e

echo "============================================="
echo " Starting Multi-Agent Software Factory Setup "
echo "============================================="

# 1. System Requirements Check
echo "============================================="
echo " System Requirements Check"
echo "============================================="

# Check for Antigravity CLI (agy)
if ! command -v agy &> /dev/null; then
    echo "[WARNING] Antigravity CLI (agy) not found in PATH."
    echo "This is required to natively run the LLM agents inside VS Code."
    echo "Please ensure the Antigravity extension is installed and CLI is configured."
else
    echo "[OK] Antigravity CLI (agy) found."
fi

# Check for GitHub CLI (gh)
if ! command -v gh &> /dev/null; then
    echo "[WARNING] GitHub CLI (gh) not found in PATH."
    echo "This is recommended for managing GitHub authentication and PRs natively."
    echo "Install instructions: https://cli.github.com/"
else
    echo "[OK] GitHub CLI (gh) found."
fi

echo ""

# 2. Create Python virtual environment if it doesn't exist
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
    export PROTOCOL_BUFFERS_PYTHON_IMPLEMENTATION=python
    pip install --upgrade protobuf
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
echo "To grant the orchestrator access to your repositories and PRs via MCP,"
echo "please complete the following GitHub authorization steps:"
echo ""
echo "1. Your default web browser will now open to the GitHub Token generation page."
echo "2. In the 'Note' field, enter a recognizable name (e.g., 'SWDevFactory-MCP')."
echo "3. (Optional) Adjust the 'Expiration' drop-down to extend the token validity as needed."
echo "4. Under 'Select scopes', ensure the following checkboxes are selected:"
echo "   - [x] repo"
echo "   - [x] workflow"
echo "   - [x] read:user"
echo "   - [x] user:email"
echo "5. Scroll to the bottom and click 'Generate token'."
echo "6. Copy your newly generated token."
echo "7. Open 'config/mcp_servers.json' in your preferred code editor."
echo "8. Replace the 'YOUR_GITHUB_PAT' placeholder with your copied token."

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
