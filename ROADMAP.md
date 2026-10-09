# Implementation Roadmap

This roadmap breaks down the development of the Multi-Agent Software Factory into 5 sequential phases.

## Phase 1: Core Framework & Triggers
**Goal:** Establish the foundational Orchestrator (with prioritization), configure existing MCP servers (GitHub, CSV), define CSV schemas, and setup manual trigger entry points.

**Engineering Tasks:**
- Configure the remote GitHub MCP Server (`@modelcontextprotocol/server-github`) and document authentication (Personal Access Token).
- Configure the remote Excel/CSV MCP Server (`@ishayoyo/excel-mcp`) for robust local CSV data management.
- Define the standard CSV schemas for `requirements.csv` and `traceability_matrix.csv`.
- Create the initial `orchestrator_agent.md` definition with robust ticket prioritization, fallback mechanisms, structured execution logging (to avoid silent failures), and delegation capabilities.
- Build local CLI/API entry points to allow the IDE to manually trigger the Orchestrator for a specific ticket.

**Target File Structure:**
```text
/
├── config/
│   ├── mcp_servers.json
│   └── .env.example
├── requirements.txt
├── data/
│   ├── schemas/
│   │   ├── requirements_schema.json
│   │   └── traceability_schema.json
│   └── initial_traceability.csv
├── agents/
│   └── orchestrator_agent.md
└── triggers/
    └── run_orchestrator.py
```

## Phase 2: Requirements & Architecture Automation
**Goal:** Implement the upfront planning agents to convert tickets into actionable designs.

**Engineering Tasks:**
- Develop the `requirement_agent.md`: Prompt engineering for ambiguity detection, assumption generation, and CSV formatting.
- Develop the `architect_agent.md`: Prompt engineering for interface design, system boundaries, and keeping designs simple.
- Integrate the Requirement Agent with the CSV MCP to auto-populate `requirements.csv`.
- Establish the initial requirement-to-architecture traceability links.

**Target File Structure:**
```text
/
├── agents/
│   ├── requirement_agent.md
│   └── architect_agent.md
└── prompts/
    ├── clarification_templates.txt
    └── design_pattern_guidelines.md
```

## Phase 3: Code Generation & Unit Testing
**Goal:** Implement the agents responsible for writing and verifying the actual implementation code.

**Engineering Tasks:**
- Develop the `coding_agent.md`: Focus on adhering strictly to the Architect's interfaces.
- Develop the `unit_test_agent.md`: Setup context provision so the agent reads the code and boundaries to generate tests.
- Integrate code execution/linter verification tools into the Coding Agent's toolset.
- Automate the population of architecture-to-code traceability in the CSV store.

**Target File Structure:**
```text
/
├── agents/
│   ├── coding_agent.md
│   └── unit_test_agent.md
└── src/
    └── (generated application code will live here)
```

## Phase 4: System Verification & Traceability Engine
**Goal:** Close the loop with high-level software testing and strict bidirectional traceability.

**Engineering Tasks:**
- Develop the `sw_test_agent.md`: Create black-box tests directly mapped to `requirements.csv`.
- Build the standalone Traceability Engine script (Python/Node) to continuously validate `traceability_matrix.csv` against actual files.
- Configure the Orchestrator to reject builds/PRs if the Traceability Engine detects dangling requirements or untested code.

**Target File Structure:**
```text
/
├── agents/
│   └── sw_test_agent.md
├── scripts/
│   ├── traceability_validator.py
│   └── report_generator.py
└── tests/
    └── e2e/
```

## Phase 5: Dashboard & UI Integration
**Goal:** Provide a visual interface to monitor the factory, configure scheduling, and trigger workflows.

**Engineering Tasks:**
- Scaffold a lightweight frontend (e.g., React/Vite or Streamlit) for the Dashboard.
- Build a Job Scheduler UI to configure automated background runs of the Orchestrator.
- Implement manual ticket selection and trigger controls directly in the Dashboard UI.
- Build views to display agent execution states, rendering error/warning summaries and deep-linking to detailed execution logs when required.
- Create a visualization for the Traceability Matrix (e.g., Sankey diagram or interactive table).
- Connect the dashboard to the CSV data store and Orchestrator triggers.

**Target File Structure:**
```text
/
├── dashboard/
│   ├── package.json
│   ├── src/
│   │   ├── components/SchedulerConfig.tsx
│   │   ├── components/ManualTrigger.tsx
│   │   ├── components/TraceabilityView.tsx
│   │   ├── components/AgentStateMonitor.tsx
│   │   └── App.tsx
│   └── public/
```
