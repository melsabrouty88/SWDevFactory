# Phase 3 Implementation Plan: Code Generation & Unit Testing

This document outlines the detailed technical specifications and execution steps for **Phase 3** of the Multi-Agent Software Factory. Phase 3 focuses on translating the Architect Agent's blueprints and the Requirement Agent's formalized specifications into production code and automated unit tests, while maintaining strict bidirectional traceability and GitHub synchronization.

## Current Status
- [x] **Develop Coding Agent Definition (`agents/coding_agent.md`)**
- [x] **Develop Unit Test Agent Definition (`agents/unit_test_agent.md`)**
- [x] **Update Orchestrator Pipeline for Phase 3 Delegation & Self-Healing Loop**
- [x] **Automate Architecture-to-Code & Unit-Test Traceability Integration**
- [x] **Implement & Execute Phase 3 Verification Tests (`tests/test_phase3.py`)**

---

## Step 1: Develop the Coding Agent

The Coding Agent is responsible for implementing modular, production-ready code strictly within the boundaries and directory structure established by the Architect Agent.

*   **Target File:** `agents/coding_agent.md`
*   **Role:** Principal/Senior Software Engineer.
*   **Tools Available:**
    *   Configuration Reader (`config/ProjConfig/settings.json`).
    *   Excel/CSV MCP Server (`@ishayoyo/excel-mcp` to read/update `workspace/Requirements/requirements.csv` and `workspace/Requirements/traceability_matrix.csv`).
    *   Workspace File Reader/Writer (reads `workspace/Architecture/` and writes to `workspace/Code/`).
    *   Code Execution / Linter Tools (for syntax and static verification).
    *   GitHub MCP Server (`@modelcontextprotocol/server-github` to commit implemented code).
*   **Core Responsibilities (System Prompt Logic):**
    1.  **Configuration & Blueprint Ingestion:**
        *   Read `config/ProjConfig/settings.json` to resolve workspace paths.
        *   Query `workspace/Requirements/requirements.csv` and `workspace/Requirements/traceability_matrix.csv` for requirements ready for implementation (`status: Pending` or `Designed` with a valid `architecture_doc_ref`).
        *   Read the corresponding architectural blueprint and Mermaid.js diagrams from `workspace/Architecture/`.
    2.  **Strict Principle & Boundary Enforcement:**
        *   Follow all 7 core principles in `prompts/design_pattern_guidelines.md` (SoC, SRP, Loose Coupling, High Cohesion, DRY, KISS, Design for Change).
        *   Implement code strictly inside the scaffolded directories under `workspace/Code/` matching the proposed architecture.
        *   Embed traceability metadata (e.g., `@req_id: REQ-XXX`) in module and function docstrings.
    3.  **Static Verification & Linting:**
        *   Run syntax compilation and linter checks on all generated files in `workspace/Code/`. Fix any syntax or static errors before handoff.
    4.  **Traceability & CSV Persistence:**
        *   Update `workspace/Requirements/traceability_matrix.csv` by populating `source_code_files` with the comma-separated list of created/modified files (e.g., `workspace/Code/auth/service.py`).
        *   Update `workspace/Requirements/requirements.csv` by setting `status` to `"Implemented"` and updating `last_modification_date` (ISO 8601).
    5.  **GitHub Sync & Fallback Handling:**
        *   Commit the generated code files under `workspace/Code/` to the GitHub repository via the GitHub MCP Server.
        *   **Fallback Mechanism:** If GitHub communication fails, log the error to `logs/github_sync_errors.log` and retry at least twice. Never fail silently.
        *   Emit structured logs (`[INFO]`, `[WARN]`, `[ERROR]`) and return a structured execution summary to the Orchestrator so it can update the GitHub issue via `github_create_issue_comment`.

---

## Step 2: Develop the Unit Test Agent

The Unit Test Agent automatically designs, implements, and executes white-box unit tests targeting the Coding Agent's implementation and the Architect Agent's structural boundaries.

*   **Target File:** `agents/unit_test_agent.md`
*   **Role:** Senior QA Automation & White-Box Testing Engineer.
*   **Tools Available:**
    *   Configuration Reader (`config/ProjConfig/settings.json`).
    *   Excel/CSV MCP Server (reads/updates `requirements.csv` and `traceability_matrix.csv`).
    *   Workspace File Reader/Writer (reads `workspace/Code/` and `workspace/Architecture/`, writes to `workspace/Test/`).
    *   Test Runner / Command Execution Tool (executes unit tests and captures output).
    *   GitHub MCP Server (commits unit test suites to the repository).
*   **Core Responsibilities (System Prompt Logic):**
    1.  **Context & Code Ingestion:**
        *   Resolve paths via `config/ProjConfig/settings.json`.
        *   Read `workspace/Requirements/traceability_matrix.csv` to identify `req_id` entries that have `source_code_files` populated.
        *   Inspect both the source code in `workspace/Code/` and the interface contracts in `workspace/Architecture/`.
    2.  **White-Box Unit Test Generation:**
        *   Create comprehensive, isolated unit test files under `workspace/Test/` (e.g., `workspace/Test/unit/test_<module>.py`).
        *   Test happy paths, boundary conditions, invalid inputs, and exception handling.
        *   Leverage Loose Coupling by mocking external dependencies (databases, network calls, file systems).
        *   Annotate test cases with the corresponding `req_id` for clear traceability.
    3.  **Test Execution & Verification:**
        *   Execute the unit test suite and capture pass/fail results.
        *   If a test fails due to a test-authoring mistake, self-correct the test.
        *   If a test fails due to a defect in `workspace/Code/`, log an explicit `[ERROR]`, set `verification_status` to `"Fail"` in `traceability_matrix.csv`, document the failure in `requirements.csv` (`comment`), and report the defect back to the Orchestrator to trigger a Coding Agent fix loop.
    4.  **Traceability & CSV Persistence:**
        *   Update `workspace/Requirements/traceability_matrix.csv` by populating `unit_test_files` (comma-separated paths under `workspace/Test/`).
        *   Update `workspace/Requirements/requirements.csv` (`last_modification_date` and `comment` summarizing unit test coverage).
    5.  **GitHub Sync & Fallback Handling:**
        *   Commit the generated unit test files under `workspace/Test/` to GitHub via the GitHub MCP Server.
        *   **Fallback Mechanism:** On GitHub API failure, log to `logs/github_sync_errors.log` and retry at least twice.
        *   Output structured logs (`[INFO]`, `[WARN]`, `[ERROR]`) and hand off a structured execution summary to the Orchestrator.

---

## Step 3: Orchestrator Pipeline & Self-Healing Loop Update

To connect Phase 2 and Phase 3 seamlessly, the Orchestrator Agent (`agents/orchestrator_agent.md`) will be updated to:
1.  Delegate sequentially from `Requirement Agent` $\rightarrow$ `Architect Agent` $\rightarrow$ `Coding Agent` $\rightarrow$ `Unit Test Agent`.
2.  Commit status updates to the GitHub ticket (`github_create_issue_comment`) after each subagent completes.
3.  **Self-Healing Code/Test Loop:** If the `Unit Test Agent` reports a code defect, re-invoke the `Coding Agent` with the unit test failure traceback (up to 2 repair iterations) before halting and escalating in the Execution Summary.

---

## Step 4: Verification & Integration Testing

*   **Target File:** `tests/test_phase3.py`
*   **Test Report Archive:** `doc/test/phase3_test_report.md`
*   **Objectives:**
    1.  **Agent Definition Validation:** Verify `agents/coding_agent.md` and `agents/unit_test_agent.md` exist and enforce workspace config usage, architectural principles, structured logging (`[INFO]`, `[WARN]`, `[ERROR]`), GitHub commits, and `logs/github_sync_errors.log` fallbacks.
    2.  **End-to-End Traceability & Workspace Simulation:**
        *   Safely back up and restore live CSV files in `workspace/Requirements/`.
        *   Simulate the Coding Agent reading an architected requirement, generating a Python module in `workspace/Code/`, validating against `requirements_schema.json` and `traceability_schema.json`, and updating `source_code_files` and `status = "Implemented"`.
        *   Simulate the Unit Test Agent reading the updated traceability row, generating a real unit test in `workspace/Test/`, executing the unit test against the generated module in `workspace/Code/`, and updating `unit_test_files` in `traceability_matrix.csv`.
