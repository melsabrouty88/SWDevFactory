# Phase 4 Implementation Plan: System Verification & Traceability Engine

This document outlines the detailed technical specifications and execution steps for **Phase 4** of the Multi-Agent Software Factory. Phase 4 closes the loop on the software lifecycle by generating high-level black-box software tests (E2E), finalizing the bidirectional traceability matrix, and deploying an automated Traceability Engine to strictly validate the integrity of the entire factory output before final Orchestrator approval.

## Current Status
- [x] **Develop Software Test Agent Definition (`agents/sw_test_agent.md`)**
- [x] **Develop Traceability Validator Script (`scripts/traceability_validator.py`)**
- [x] **Develop Report Generator Script (`scripts/report_generator.py`)**
- [ ] **Update Orchestrator Pipeline for Traceability Enforcement**
- [ ] **Implement & Execute Phase 4 Verification Tests (`tests/test_phase4.py`)**

---

## Step 1: Develop the Software Test Agent

The Software Test Agent is responsible for high-level, black-box testing (End-to-End or Integration level). It explicitly maps its test cases directly back to the formalized acceptance criteria in the requirements to prove the system works exactly as requested by the user.

*   **Target File:** `agents/sw_test_agent.md`
*   **Role:** Lead QA & Systems Integration Tester.
*   **Tools Available:**
    *   Configuration Reader (`config/ProjConfig/settings.json`).
    *   Excel/CSV MCP Server (to read/write `workspace/Requirements/requirements.csv` and `workspace/Requirements/traceability_matrix.csv`).
    *   Workspace File Reader/Writer (writes to `workspace/Test/e2e/`).
    *   E2E Test Runner Tool (e.g., Playwright, Selenium, or API test execution wrapper).
    *   GitHub MCP Server.
*   **Core Responsibilities (System Prompt Logic):**
    1.  **Black-Box Test Generation:** Query `requirements.csv` for requirements marked as `Implemented`. Read the original `description` and `acceptance_criteria`. Generate high-level E2E or Integration test scripts in `workspace/Test/e2e/` without relying on internal code structures (treating `workspace/Code/` as a black box).
    2.  **Execution & Assertion:** Execute the high-level test suite. Verify that all original acceptance criteria are functionally met. 
    3.  **Traceability Finalization:** Update `workspace/Requirements/traceability_matrix.csv` by populating the `sw_test_case_id` column (e.g., linking to `workspace/Test/e2e/test_feature.py`) and setting the final `verification_status` to `"Pass"` or `"Fail"`. Update `status` to `"Tested"` in `requirements.csv`.
    4.  **GitHub Sync & Defect Feedback:** If tests fail due to system bugs, log an `[ERROR]`, set status to `"Fail"`, and immediately report the defect traceback to the Orchestrator to trigger a Coding Agent repair loop. Commit the resulting test scripts to GitHub (with `logs/github_sync_errors.log` fallbacks).

---

## Step 2: Develop the Traceability Engine Scripts

The Traceability Engine consists of standalone Python scripts that mathematically ensure the multi-agent system did not drop any requirements, orphan any code, or skip any tests.

### 2.1 Traceability Validator
*   **Target File:** `scripts/traceability_validator.py`
*   **Objective:** Continuously validate `traceability_matrix.csv` against the actual file system and `requirements.csv`.
*   **Validation Rules:**
    1.  **Requirement Coverage:** Every `req_id` in `requirements.csv` must exist in `traceability_matrix.csv`.
    2.  **Architecture Coverage:** Every requirement must have a valid `architecture_doc_ref`. The referenced file path MUST physically exist on disk.
    3.  **Code Coverage:** Every requirement must have `source_code_files`. The referenced paths MUST physically exist on disk.
    4.  **Test Coverage:** Every requirement must have `unit_test_files` and `sw_test_case_id`. The referenced paths MUST physically exist on disk.
    5.  **Status Verification:** The `verification_status` for all requirements MUST evaluate to `"Pass"`.
*   **Output:** The script must return exit code `0` if the matrix is 100% complete and valid. It must return exit code `1` with a detailed standard error report detailing missing files, missing tests, or failing statuses.

### 2.2 Report Generator
*   **Target File:** `scripts/report_generator.py`
*   **Objective:** Consume the CSV matrices and output a structured Markdown or HTML summary report of the traceability matrix for the user and future Dashboard UI integration.

---

## Step 3: Update Orchestrator Pipeline for Traceability Enforcement

Update `agents/orchestrator_agent.md` to incorporate the new `sw_test_agent` and enforce the `traceability_validator.py` script as the final project gatekeeper.

*   **Pipeline Update:** The sequence expands to: Requirement $\rightarrow$ Architect $\rightarrow$ Coding $\rightarrow$ Unit Test $\rightarrow$ **SW Test**.
*   **Traceability Gate:** After the SW Test Agent finishes, the Orchestrator MUST securely execute `python3 scripts/traceability_validator.py`.
*   **Rejection Logic:** 
    *   If the validator returns exit code `0`, the Orchestrator proceeds to approve the implementation, posts a final success comment to the GitHub ticket, and logs `SUCCESS` in the Execution Summary.
    *   If the validator returns exit code `1` (detecting dangling requirements, missing tests, or fake file paths), the Orchestrator MUST intercept the failure, post the validator's explicit failure report to the GitHub ticket as a comment, and log a critical `[ERROR]`, causing the pipeline to halt.

---

## Step 4: Verification & Integration Testing

*   **Target File:** `tests/test_phase4.py`
*   **Test Report Archive:** `doc/test/phase4_test_report.md`
*   **Objectives:**
    1.  Validate the `sw_test_agent.md` definition constraints and prompt rules.
    2.  Execute `scripts/traceability_validator.py` against a perfectly populated mock CSV matrix and file structure, ensuring it passes (Exit Code 0).
    3.  Execute `scripts/traceability_validator.py` against corrupted matrices (e.g., missing test files, dangling requirements, mismatched statuses) and ensure it accurately catches the specific errors and fails (Exit Code 1).
