---
name: next
description: >-
  Presents up to 3 priority roadmap items and 1 low-priority icebox item as an interactive
  multiple-choice selection. When the user chooses an item, initiates a structured planning
  session (/plan) with subagent execution waves for that feature. Trigger on '/next', 'what to do next', 'what should we work on next',
  or roadmap task selection.
---

# /next: Interactive Task Selection & Planning Workflow

Use this skill whenever the user invokes `/next`, asks what to work on next, or requests roadmap recommendations.

---

## Workflow Steps

### 1. Read Roadmap & Specs
1. Read [`ROADMAP.md`](file:///Users/ryan/Code/zygodactyl/zygo-cms/ROADMAP.md) at the repository root.
2. Select up to **3 high-priority items** from:
   - Section 1: **Immediate Priority**
   - Section 2: **Soon**
3. Select **1 low-priority / exploratory item** from:
   - Section 3: **Icebox & Long-Term Considerations**
4. Check if any selected item references a technical specification in `docs/specs/` (e.g. [`docs/specs/webmcp_editor_gaps.md`](file:///Users/ryan/Code/zygodactyl/zygo-cms/docs/specs/webmcp_editor_gaps.md) or [`docs/specs/section_templates_spec.md`](file:///Users/ryan/Code/zygodactyl/zygo-cms/docs/specs/section_templates_spec.md)).

---

### 2. Present Multiple Choice via `ask_question`
Use the `ask_question` tool to render an interactive prompt for the user.

- **Question**: `"Which task would you like to plan and work on next?"`
- **Formatting Guidelines**:
  - The top recommendation must be listed first and prefixed with `(Recommended)`.
  - Up to 2 additional priority options formatted clearly.
  - Exactly 1 low-priority option clearly tagged as `[Icebox / Low-Priority]`.
  - Format options as the user's direct response (e.g., `"WebMCP Editor Parity: Template, Theme & Navigation Editors"`, not `"I will implement..."`).
  - Set `is_multi_select: false`.

Example tool call:
```json
{
  "questions": [
    {
      "question": "Which task would you like to plan and work on next?",
      "is_multi_select": false,
      "options": [
        "(Recommended) WebMCP Editor Parity: Close remaining gaps across Template, Theme, and Navigation editors",
        "Headless CMS Content API: Implement decoupled GET /api/v1/posts and pages with CORS",
        "Custom Workflow Statuses: Add In Review, Ready for Publish, and Archived states",
        "[Icebox / Low-Priority] Connect an Email Sender: Integrate transactional email delivery for user invites"
      ]
    }
  ]
}
```

---

### 3. Initiate `/plan` on the Chosen Item
When the user submits their choice:

1. **Research & Context Gathering**:
   - Read the corresponding spec in `docs/specs/` if one exists.
   - Inspect the relevant source files and tests in the codebase.
2. **Author Implementation Plan Artifact**:
   - Create an implementation plan artifact in `<appDataDir>/brain/<conversation-id>/plan.md` with:
     - `ArtifactMetadata`: `{ "RequestFeedback": true, "Summary": "...", "UserFacing": true }`.
     - **Architecture & Contracts**:
       - Specify exact shared contracts upfront (API routes, D1 query column names, WebMCP/zygo-mcp tool schemas, accessible labels `aria-label`, and `data-testid` attributes).
       - Workflow or architecture diagram using Mermaid (`flowchart TD` or `sequenceDiagram`).
     - **Subagent Execution Plan (3-Wave Pattern)**:
       - **Wave 1 (Parallel Implementation & Test Authoring)**:
         - Identify subagents to spawn concurrently with **strictly disjoint file ownership** (e.g. backend worker vs admin UI vs Vitest/Storybook tests vs CLI MCP).
         - Include a Subagent Allocation Table detailing: Role, Subagent Type/Model, Disjoint File Boundaries, and Deliverables.
       - **Wave 2 (Automated Quality Gates)**:
         - Orchestrating agent runs all mandatory quality gates: `cargo test`, `pnpm run test:all`, `pnpm --filter admin-ui exec tsc --noEmit`, and `pnpm run build`.
       - **Wave 3 (Parallel Verification Handoffs)**:
         - **Code Review Subagent**: Delegate verification to inspect logic, security (`auth_required!`), D1 query conventions (no `SELECT *`, safe nullable migrations), and test coverage.
         - **UI QA Subagent** (if visual UI modified): Follow the **1+2+4 Protocol** (Storybook inspection, browser screenshot/vision validation, accessibility verification).
     - **Specific Files Modified / Created**: Grouped by package and assigned subagent.
     - **Testing Strategy**: Unit, integration, Storybook, and dual WebMCP/zygo-mcp parity verification.
3. **Prompt for User Approval**:
   - Direct the user to review the plan artifact and request approval before writing code.

---

## Subagent Planning Guidelines for Implementation Plans

When drafting the implementation plan artifact, always structure the subagent workflow as follows:

### Subagent Allocation Table Template
```markdown
| Wave | Subagent Role | Type / Model | Assigned Files (Strictly Disjoint) | Responsibilities & Deliverables |
| :--- | :--- | :--- | :--- | :--- |
| 1 | Backend API Engineer | `self` / `inherit` | `packages/admin-api-worker/src/handlers/...` | Implement REST endpoints, D1 queries, and auth |
| 1 | Frontend UI Engineer | `self` / `inherit` | `packages/admin-ui/src/pages/...`, `.../components/...` | Build React UI component, hooks, and WebMCP tools |
| 1 | Test & Storybook Author | `self` / `inherit` | `packages/admin-ui/src/.../*.stories.tsx`, `tests/...` | Author Storybook stories, Vitest tests, and fixtures |
| 2 | Orchestrator (Main Agent) | Main Agent | Entire Workspace | Run automated quality gates (`cargo test`, `test:all`, `tsc`, `build`) |
| 3 | Code Reviewer | `self` / `inherit` | Read-only across modified files | Verify correctness, security, D1 rules, and test coverage |
| 3 | UI QA Specialist | `self` / `inherit` (with browser tools) | Read-only / Storybook URL | 1+2+4 Protocol: Visual inspection, interaction states, accessibility |
```

### Key Subagent Planning Rules
1. **Shared Contracts First**: Never spawn Wave 1 subagents until type signatures, API schemas, and test selectors are locked down in the plan.
2. **Strictly Disjoint Files**: Parallel subagents must never write to the same file. Separate components, handlers, tests, and documentation into distinct file sets.
3. **Dual Verification Handoff**: For UI tasks, plan for both Code Review and UI QA subagents running in Wave 3 before marking the task complete.
