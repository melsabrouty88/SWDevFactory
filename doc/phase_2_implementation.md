# Phase 2 Implementation Plan: Requirements & Architecture Automation

This document details the technical specifications and execution steps for Phase 2 of the Multi-Agent Software Factory. This phase focuses on building the "upfront planning" intelligence that converts raw tickets into formal data and system designs.

## Current Status
- [x] **Develop Requirement Agent Definition**
- [x] **Develop Architect Agent Definition**
- [x] **Implement Clarification Templates & Design Guidelines**
- [ ] **Establish Initial Traceability & CSV Integration**

---

## Step 1: Develop the Requirement Agent

The Requirement Agent translates raw GitHub issue context into formal, actionable requirements stored in the CSV database.

*   **Target File:** `agents/requirement_agent.md`
*   **Role:** Technical Business Analyst / Product Owner.
*   **Tools Available:**
    *   Excel/CSV MCP Server (to read/write `data/requirements.csv`).
    *   `ask_question` / User prompt interface (to request clarifications).
*   **Core Responsibilities (System Prompt Logic):**
    1.  **Ambiguity Detection:** Read the raw issue context passed by the Orchestrator. Identify missing acceptance criteria, edge cases, or ambiguous language.
    2.  **Assumption Generation & GitHub Sync:** If ambiguities exist, generate logical assumptions. Share these directly with the User by commenting on the GitHub ticket (via `github_create_issue_comment`). Wait for explicit approval on the ticket. Use local fallback logs and retries if GitHub communication fails.
    3.  **Formalization:** Break down the feature into atomic requirements.
    4.  **Data Persistence:** Use the CSV MCP tool to append new rows into `requirements.csv`, strictly adhering to the JSON schema defined in Phase 1 (generating unique `REQ-` IDs, setting Status to `Pending`, etc.).

---

## Step 2: Develop the Architect Agent

The Architect Agent uses the formalized requirements to design the structural blueprint and boundaries of the system.

*   **Target File:** `agents/architect_agent.md`
*   **Role:** Principal Software Architect.
*   **Tools Available:**
    *   Excel/CSV MCP Server (to read `requirements.csv` and write to `traceability_matrix.csv`).
    *   Workspace File Writer (to scaffold architecture documentation/diagrams).
*   **Core Responsibilities (System Prompt Logic):**
    1.  **Requirement Ingestion:** Use the CSV MCP to query `requirements.csv` for `Pending` requirements linked to the current ticket.
    2.  **Interface & Boundary Definition:** Define strict data models, API contracts, and internal system boundaries. 
    3.  **Simplicity Enforcement:** Actively avoid over-engineering. Enforce simple design choices, utilizing standard libraries where possible.
    4.  **Traceability Initialization:** Append new rows to `traceability_matrix.csv`, linking the `req_id` to the newly generated `architecture_doc_ref`.

---

## Step 3: Implement Supplemental Templates and Guidelines

To enforce consistency across agent runs, we will provide standardized guidelines that the agents reference during execution.

### 3.1 `clarification_templates.txt`
*   **Target File:** `prompts/clarification_templates.txt`
*   **Purpose:** Provides the Requirement Agent with standardized templates for asking the User questions.
*   **Format:** e.g., "The ticket mentions [X], but does not define [Y]. I assume [Assumption]. Please approve or provide corrections."

### 3.2 `design_pattern_guidelines.md`
*   **Target File:** `prompts/design_pattern_guidelines.md`
*   **Purpose:** Injected into the Architect Agent's context to mandate specific coding standards.
*   **Format:** Explicit rules like "Favor functional composition over deep inheritance trees," "REST over GraphQL unless deeply nested data is required," and "No new external dependencies without explicit justification."

---

## Step 4: Verification & Integration Testing
*   **Target File:** `tests/test_phase2.py`
*   **Objective:** Write a mock test suite that simulates the Orchestrator passing a raw string to the Requirement Agent, asserting that a valid row is appended to `requirements.csv` and subsequently mapped into `traceability_matrix.csv` by the Architect Agent.
