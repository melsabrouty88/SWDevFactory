# Phase 1 Implementation Plan: Core Framework & Triggers

This document outlines the detailed technical specifications for the remaining tasks in Phase 1 of the Multi-Agent Software Factory.

## Current Status
- [x] Configure GitHub MCP Server (`mcp_servers.json`, `.env.example`)
- [x] Configure CSV MCP Server (`@ishayoyo/excel-mcp`)
- [ ] **Define CSV Data Schemas**
- [ ] **Create Orchestrator Agent Definition**
- [ ] **Build Local Trigger Entry Points**

---

## Step 1: Define CSV Data Schemas

To ensure strict formatting for our AI workers and traceability engine, we will define JSON schemas for our CSV files.

### 1.1 `requirements.csv`
This file will store formalized requirements derived from GitHub tickets.
*   **Target File:** `data/schemas/requirements_schema.json`
*   **Columns Required:**
    *   `req_id` (String): Generated requirement ID (unique identifier, e.g., `REQ-001`).
    *   `github_issue_id` (Integer): The parent ticket ID this requirement originated from.
    *   `title` (String): High-level summary of the requirement.
    *   `description` (String): Formal, testable description.
    *   `acceptance_criteria` (String): Bulleted list of criteria.
    *   `priority` (String): `High`, `Medium`, or `Low`.
    *   `status` (String): `Pending`, `Designed`, `Implemented`, or `Tested`.
    *   `creation_date` (String): ISO 8601 timestamp of when the requirement was created.
    *   `last_modification_date` (String): ISO 8601 timestamp of the most recent update.
    *   `comment` (String): Additional context, agent notes, or user clarifications.

### 1.2 `traceability_matrix.csv`
This file maps the lifecycle of a requirement down to the exact code files and test cases.
*   **Target File:** `data/schemas/traceability_schema.json`
*   **Columns Required:**
    *   `req_id` (String): Foreign key to `requirements.csv`.
    *   `architecture_doc_ref` (String): Link to the design section/diagram.
    *   `source_code_files` (String): Comma-separated list of implemented files (e.g., `src/auth.py`).
    *   `unit_test_files` (String): Comma-separated list of unit tests (e.g., `tests/test_auth.py`).
    *   `sw_test_case_id` (String): Reference to the high-level black-box test ID.
    *   `verification_status` (String): `Pass`, `Fail`, or `Missing`.

---

## Step 2: Develop the Orchestrator Agent

The Orchestrator acts as the "Manager" of the factory. It does not write code; it routes work.

*   **Target File:** `agents/orchestrator_agent.md`
*   **Agent Configuration:**
    *   **Role:** Lead Technical Product Manager / Orchestrator.
    *   **Tools Available:** 
        *   GitHub MCP (`github_read_issue`, `github_search_issues`).
        *   Agent Invocation Tool (to spawn/delegate to Requirement, Architect, etc.).
    *   **Core Responsibilities (System Prompt Logic):**
        1.  **Prioritization Logic:** When triggered in `auto` mode, query open GitHub issues. Analyze labels (e.g., `bug`, `critical`), creation dates, and descriptions to determine the single most critical issue to tackle.
        2.  **Context Assembly:** Read the selected issue's full conversation history via GitHub MCP.
        3.  **Delegation:** Formulate a structured prompt containing the issue context and invoke the `Requirement Agent` to begin Phase 2 workflow. Wait for successful requirement extraction before continuing.

---

## Step 3: Build the Trigger Entry Points

We need a way for the IDE, the dashboard, or a scheduled cron job to reliably wake up the Orchestrator.

*   **Target File:** `triggers/run_orchestrator.py`
*   **Architecture & Libraries:** 
    *   Uses Python's `argparse` for CLI commands.
    *   Uses the Antigravity/SDK (or Claude API) to programmatically spawn the `Orchestrator Agent`.
*   **CLI Arguments:**
    *   `--auto`: Tells the orchestrator to fetch all open issues, score them, and pick the highest priority automatically.
    *   `--ticket <ID>`: Manually forces the orchestrator to ignore priority queues and strictly process the specified GitHub issue ID.
*   **Execution Flow:**
    1.  Load `.env` (ensuring GitHub PAT is available).
    2.  Initialize the Agent Framework.
    3.  Inject the run argument (`--auto` or `--ticket 123`) into the Orchestrator's starting prompt.
    4.  Stream the Orchestrator's internal reasoning and delegation states back to `stdout` (so the Dashboard/IDE can capture and display the logs).
