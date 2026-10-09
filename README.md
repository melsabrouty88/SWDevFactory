# SWDevFactory
A multi-agent orchestrator framework that automates the software development lifecycle from issue tickets—handling requirements, architecture, coding, unit testing, and SW testing with built-in MCP integration, CSV-based traceability, and a dashboard interface.

## Overview
The Multi-Agent Software Factory is an autonomous, agent-driven software development system built on the Orchestrator-Worker pattern. It is designed to autonomously drive software development directly from issue tickets, ensuring rigorous bidirectional traceability across all work products (Requirements ↔ Architecture ↔ Code ↔ Tests).

## Architecture

```mermaid
flowchart TD
    User(["User / Product Owner"]) -->|Creates Issue/Ticket| GitHub["GitHub Issues via MCP"]
    
    IDE(["IDE"]) -.->|"Manual Trigger / Select Ticket"| Orchestrator
    Scheduler(["Job Scheduler"]) -.->|"Scheduled Execution"| Orchestrator
    
    subgraph AgentEcosystem ["Agent Ecosystem (.md definitions)"]
        Orchestrator["Orchestrator Agent"]
        ReqAgent["Requirement Agent"]
        ArchAgent["Architect Agent"]
        CodeAgent["Coding Agent"]
        UTAgent["Unit Test Agent"]
        SWTestAgent["SW Test Agent"]
        
        Orchestrator -->|"Prioritizes Tickets & Delegates"| ReqAgent
        Orchestrator -->|Delegates| ArchAgent
        Orchestrator -->|Delegates| CodeAgent
        Orchestrator -->|Delegates| UTAgent
        Orchestrator -->|Delegates| SWTestAgent
    end

    subgraph MCPIntegration ["Model Context Protocol Server"]
        GitHubMCP["GitHub Integration (Issues, PRs)"]
        CSVMCP["CSV Data Store (Requirements, Traceability)"]
    end
    
    Orchestrator <--> MCPIntegration
    ReqAgent <--> MCPIntegration
    ArchAgent <--> MCPIntegration
    CodeAgent <--> MCPIntegration
    
    Dashboard["Dashboard UI"] --> CSVMCP
    Dashboard -->|Configures| Scheduler
    Dashboard -->|"Manual Trigger / Select Ticket"| Orchestrator
```

## Agent Roles
Our ecosystem consists of specialized agents defined in agnostic Markdown format (`.md`), making them interoperable and compatible with Antigravity, Codex, or standard setups.

1. **Orchestrator Agent**: Ingests issue tickets, parses context, builds the execution plan, delegates subtasks to workers, and aggregates results.
2. **Requirement Agent**: Translates raw tickets into formal, testable requirements. breakdown the requirements into testable units. Interacts with the user to clarify ambiguities and explicitly shares assumptions for approval.
3. **Architect Agent**: Defines interfaces, system boundaries, and static/dynamic analysis expectations. Ensures requirement traceability, enforces simple design choices as a priority, and guides the Coding Agent.
4. **Coding Agent**: Implements the codebase based on the Architect's blueprints and the Requirement Agent's specifications.
5. **Unit Test Agent**: Automatically generates and implements unit tests based on the available code and structural boundaries.
6. **SW Test Agent**: Develops high-level, black-box software test cases mapped directly back to the formalized requirements.

## Core Features
- **MCP Integration**: Relies on standardized remote Model Context Protocol (MCP) servers—like the official `@modelcontextprotocol/server-github`—to interact natively with GitHub (reading issues, writing PRs), avoiding the need to build custom integrations.
- **CSV Data Store**: All requirements and traceability matrices are strictly documented, versioned, and stored in structured CSV formats.
- **Traceability Engine**: Enforces strict bidirectional traceability linking Requirements ↔ Architecture ↔ Code ↔ Tests. 
- **Execution Logging & Fallbacks**: The Orchestrator strictly logs all operations, failures, and fallbacks into structured execution logs to prevent silent failures and provide transparent summaries.
- **Dashboard Interface**: A visual UI to monitor agent execution states, configure scheduling for the Orchestrator, manually trigger ticket processing, track the end-to-end traceability matrix, and visualize execution logs (including errors and warning summaries with prompts to check detailed logs).

## Workflow
1. **Trigger & Prioritization**: The system can be started via a scheduled job configured in the Dashboard, or triggered manually from the IDE or Dashboard (where a specific ticket can also be selected). When running autonomously, the Orchestrator checks open GitHub Issues via MCP and decides on implementation priority.
2. **Requirements**: Requirement Agent processes the issue into formal CSV requirements, seeking user clarifications if needed.
3. **Design**: Architect Agent generates system blueprints and interface definitions.
4. **Implementation**: Coding Agent writes the source code based on designs.
5. **Testing**: Unit Test Agent writes code-level tests; SW Test Agent creates black-box test cases traceable to the CSV requirements.
6. **Delivery**: Orchestrator aggregates the results, verifies traceability, and creates a PR via GitHub MCP.
