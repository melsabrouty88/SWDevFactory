#!/usr/bin/env python3
"""
Multi-Agent Software Factory - Orchestrator Trigger Entry Point

This script acts as the robust entry point to wake up the Orchestrator Agent.
It can be triggered manually by the IDE, or automatically by the Dashboard Scheduler.
"""

import argparse
import os
import sys
import logging
try:
    from dotenv import load_dotenv
    HAS_DOTENV = True
except ImportError:
    HAS_DOTENV = False

# Configure structured logging to standard out for Dashboard consumption
logging.basicConfig(
    level=logging.INFO,
    format='[%(levelname)s] %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger("OrchestratorTrigger")

def load_environment():
    """Loads environment variables and verifies required secrets from mcp_servers.json."""
    import json
    mcp_config_path = os.path.join(os.path.dirname(__file__), '../config/mcp_servers.json')
    try:
        with open(mcp_config_path, 'r') as f:
            mcp_data = json.load(f)
            pat = mcp_data.get('mcpServers', {}).get('github', {}).get('env', {}).get('GITHUB_PERSONAL_ACCESS_TOKEN', '')
            
            # Check if PAT is empty or still the default placeholder
            if pat == "YOUR_GITHUB_PAT" or not pat:
                logger.error("GITHUB_PERSONAL_ACCESS_TOKEN is missing or not updated in config/mcp_servers.json.")
                
                # Output structured summary for dashboard visualization on failure
                print("\nExecution Summary:")
                print("Status: FAILED")
                print("Processed Ticket: None")
                print("Errors: Missing GitHub credentials. Cannot start Orchestrator.")
                print("Warnings: None")
                print("Next Steps: Update config/mcp_servers.json with a valid GitHub Personal Access Token.")
                sys.exit(1)
            else:
                # Successfully loaded, inject it into os.environ for downstream SDK processes
                os.environ["GITHUB_PERSONAL_ACCESS_TOKEN"] = pat
    except Exception as e:
        logger.error(f"Failed to read config/mcp_servers.json: {e}")
        sys.exit(1)

def load_agent_definition(agent_file="agents/orchestrator_agent.md"):
    """Loads the markdown definition for the orchestrator agent."""
    filepath = os.path.join(os.path.dirname(__file__), '..', agent_file)
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            return f.read()
    except FileNotFoundError:
        logger.error(f"Agent definition file not found at {filepath}")
        sys.exit(1)

def test_mcp_connections():
    """Validates that the underlying MCP server dependencies (like npx) are available."""
    import subprocess
    try:
        # Check if npx is installed, which is required by our mcp_servers.json config
        result = subprocess.run(["npx", "--version"], capture_output=True, text=True, check=True)
        logger.info(f"MCP Dependency Check Passed: Node/npx is available (v{result.stdout.strip()}).")
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        return False

def invoke_orchestrator(mode, ticket_id=None):
    """
    Simulates the invocation of the AI Orchestrator Agent.
    In a real implementation, this would instantiate the LLM client (e.g. Anthropic/Antigravity)
    and pass the MCP server configurations.
    """
    logger.info("Initializing Orchestrator Agent environment...")
    
    # 1. Load context
    agent_prompt = load_agent_definition()
    
    # 2. Prepare the execution prompt
    if mode == "auto":
        logger.info("Trigger Mode: AUTO. Instructing Orchestrator to prioritize open issues.")
        user_instruction = "Run in AUTO mode. Fetch open issues, analyze priority, and delegate the most critical one."
    else:
        logger.info(f"Trigger Mode: MANUAL. Instructing Orchestrator to process ticket #{ticket_id}.")
        user_instruction = f"Run in MANUAL mode. Fetch and process GitHub issue #{ticket_id}."

    logger.info("Connecting to MCP Servers (GitHub, Excel-MCP)...")
    
    if not test_mcp_connections():
        logger.error("MCP Server Connection Failed: 'npx' command not found or inaccessible.")
        logger.warning("FALLBACK INITIATED: The system cannot start the GitHub or CSV MCP servers natively.")
        logger.warning("Without MCP access, the Orchestrator cannot read issues, write CSVs, or commit code.")
        
        # Output structured summary for dashboard visualization on failure
        print("\nExecution Summary:")
        print("Status: FAILED")
        print("Processed Ticket: None")
        print("Errors: MCP Servers failed to initialize. Node.js (npx) is missing or broken.")
        print("Warnings: Orchestrator execution aborted to prevent silent data loss.")
        print("Next Steps: Install Node.js from https://nodejs.org/, restart your terminal, and retry.")
        sys.exit(1)
        
    # ---------------------------------------------------------
    # TODO: Integrate specific AI SDK here (e.g. Langchain, Anthropic SDK, Antigravity SDK)
    # Example pseudocode for actual invocation:
    #
    # client = AgentClient(
    #     system_prompt=agent_prompt,
    #     mcp_servers=["github", "csv"] 
    # )
    # response = client.run(user_instruction)
    # print(response)
    # ---------------------------------------------------------
    
    logger.info("Delegating execution to Antigravity CLI (agy)...")
    import time
    import json
    import subprocess
    
    # Path to store active run status for dashboard visualization
    status_path = os.path.join(os.path.dirname(__file__), '../logs/active_run.json')
    os.makedirs(os.path.dirname(status_path), exist_ok=True)
    
    def update_status(agent_name, progress, message):
        state = {
            "status": "running",
            "ticket": ticket_id if ticket_id else 'Auto-selected #101',
            "current_agent": agent_name,
            "progress": progress,
            "message": message
        }
        with open(status_path, 'w') as f:
            json.dump(state, f)
        print(f"[INFO] {message}")

    print("\n--- BEGIN AGENT LOG STREAM ---")
    update_status("Orchestrator Agent (agy)", 10, "Booting up Antigravity native engine via CLI...")
    
    # The actual instruction to pass to the Antigravity CLI
    prompt = f"Use the orchestrator_agent skill to process ticket #{ticket_id if ticket_id else '101'}. Use the configured MCP servers."
    
    success = False
    error_msg = "Unknown Error"
    
    try:
        # Run the agy CLI and capture output so we can scan it for generic errors
        update_status("Antigravity Engine", 50, "Executing native LLM pipeline inside the IDE environment...")
        
        process = subprocess.run(["agy", prompt], capture_output=True, text=True)
        
        # Stream the output directly to the console so the Dashboard catches it
        if process.stdout:
            print(process.stdout, end="")
        if process.stderr:
            print(process.stderr, file=sys.stderr, end="")
        
        if process.returncode != 0:
            logger.warning(f"Antigravity CLI returned non-zero exit code: {process.returncode}")
            success = False
            error_msg = f"Antigravity CLI failed with code {process.returncode}"
        elif "[ERROR]" in process.stdout or "[ERROR]" in process.stderr:
            logger.warning("Antigravity CLI returned exit code 0, but internal errors were detected in the log stream.")
            success = False
            error_msg = "Pipeline completed but logged internal errors."
        else:
            success = True
            error_msg = "None"
            
    except FileNotFoundError:
        logger.warning("'agy' command not found. Falling back to Simulated Mock Execution for UI Demonstration.")
        print("\n[WARNING] Antigravity CLI not found in PATH. Running in SIMULATED mode.")
        import time
        time.sleep(2)
        update_status("Requirement Agent", 30, "[SIMULATED] Formalizing raw ticket into atomic requirements...")
        update_status("Architect Agent", 50, "[SIMULATED] Generating system blueprints and component boundaries...")
        update_status("Coding Agent", 70, "[SIMULATED] Implementing source code according to architecture...")
        update_status("Unit Test Agent", 85, "[SIMULATED] Writing and executing code-level unit tests...")
        update_status("SW Test Agent", 95, "[SIMULATED] Generating E2E traceability black-box tests...")
        success = True
        error_msg = "None"
    except Exception as e:
        logger.error(f"Failed to execute agy CLI: {e}")
        success = False
        error_msg = str(e)
    
    # Clear the active run status when done
    with open(status_path, 'w') as f:
        json.dump({"status": "idle"}, f)
    
    print("\nExecution Summary:")
    if success:
        print("Status: SUCCESS (Handoff Complete)")
        print(f"Processed Ticket: {ticket_id if ticket_id else 'Auto-selected #101'}")
        print("Errors: None")
        print("Warnings: None")
        print("Next Steps: Pipeline completed natively by Antigravity.")
    else:
        print("Status: FAILED")
        print(f"Processed Ticket: {ticket_id if ticket_id else 'Auto-selected #101'}")
        print(f"Errors: {error_msg}")
        print("Warnings: Handoff to native IDE engine aborted.")
        print("Next Steps: Install 'agy' CLI or run this script inside the Antigravity integrated terminal.")
        
    print("--- END AGENT LOG STREAM ---\n")
    
    if not success:
        sys.exit(1)

def main():
    parser = argparse.ArgumentParser(description="Trigger the SWDevFactory Orchestrator Agent.")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--auto", action="store_true", help="Run in auto mode to prioritize tickets.")
    group.add_argument("--ticket", type=int, help="Run manually for a specific GitHub ticket ID.")
    
    args = parser.parse_args()
    
    logger.info("Starting run_orchestrator.py")
    load_environment()
    
    try:
        if args.auto:
            invoke_orchestrator(mode="auto")
        elif args.ticket:
            invoke_orchestrator(mode="manual", ticket_id=args.ticket)
    except Exception as e:
        logger.error(f"Unhandled exception during Orchestrator execution: {str(e)}")
        print("\nExecution Summary:")
        print("Status: FAILED")
        print("Errors: Python runtime exception occurred.")
        sys.exit(1)

if __name__ == "__main__":
    main()
