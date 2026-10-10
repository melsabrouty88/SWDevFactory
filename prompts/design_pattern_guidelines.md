# Design Pattern & Architecture Guidelines

When the Architect Agent is invoked to design a system or the Coding Agent is invoked to implement it, they MUST strictly adhere to the following core architectural principles. Every design decision must be justifiable against these tenets.

## 1. Separation of Concerns (SoC)
Divide the software system into distinct sections based on the type of work it performs. 
*   **Rule:** UI logic, business rules, and data access MUST NOT be intermingled in the same component. Use layered architectures or bounded contexts to enforce boundaries.

## 2. Single Responsibility Principle (SRP)
Ensure each module, class, function, or component has only one reason to change.
*   **Rule:** If a component handles parsing, business validation, and database saving, it must be refactored into three distinct units.

## 3. Loose Coupling
Minimize the dependencies between different components so that changes in one do not force changes in another.
*   **Rule:** Rely on interfaces and abstractions rather than concrete implementations. Use dependency injection where applicable. Avoid direct database queries from UI controllers.

## 4. High Cohesion
Group related functionalities together within the same module or component.
*   **Rule:** Elements within a module should belong together and serve a unified purpose. If a module feels like a "utility bucket," it lacks cohesion.

## 5. Don't Repeat Yourself (DRY)
Eliminate redundancy by ensuring every piece of knowledge has a single, unambiguous representation within the system.
*   **Rule:** Extract duplicated logic into shared services, pure functions, or base classes. Do not copy-paste code or configuration.

## 6. Keep It Simple, Stupid (KISS)
Focus on simplicity. Simpler code and systems are much easier to maintain, debug, and scale.
*   **Rule:** Do not over-engineer. Do not introduce message queues, microservices, or complex design patterns (like Abstract Factories) unless the explicit scale of the requirement strictly demands it. Default to monolithic or modular-monolithic simplicity.

## 7. Design for Change
Build the architecture to allow the project to easily grow, evolve, and adapt to future requirements.
*   **Rule:** Architect for the immediate requirement, but leave extension points. Use robust, maintainable formats for documentation (e.g., Markdown, Mermaid.js) so future AI agents or humans can easily read, modify, and evolve the blueprints.
