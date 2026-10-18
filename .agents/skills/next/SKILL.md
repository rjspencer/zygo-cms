---
name: next
description: >-
  Presents up to 3 priority roadmap items and 1 low-priority icebox item as an interactive
  multiple-choice selection. When the user chooses an item, initiates a structured planning
  session (/plan) for that feature. Trigger on '/next', 'what to do next', 'what should we work on next',
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
     - Phased implementation breakdown (contracts, backend/data, frontend UI/WebMCP, tests).
     - Architecture/workflow diagram using Mermaid (`flowchart TD` or `sequenceDiagram`).
     - Specific files to be created or modified.
     - Testing strategy & verification steps passing the mandatory quality gates from `AGENTS.md`.
3. **Prompt for User Approval**:
   - Direct the user to review the plan artifact and request approval before writing code.
