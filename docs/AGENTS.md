# Documentation Guidelines for AI Agents

This directory (`docs/`) stores user-facing documentation, technical specifications, and architectural audits for Zygo CMS.

## Directory Structure
- `docs/official/`: User-facing documentation for Zygo CMS, which serves as the content base for the official documentation site.
- `docs/specs/`: Detailed technical specifications, RFCs, and feature design documents.
- `docs/audits/`: Architecture reviews, security audits, and punchlists.

## Guidelines
- **Target Audience for Official Docs**: Zygo CMS users, site administrators, and developers integrating with Zygo.
- **Content Maintenance**: When adding or modifying CMS features, update corresponding reference guides in `docs/official/` (`introduction.md`, `quickstart.md`, `concepts.md`, `deployment.md`, `advanced.md`, `examples.md`, `troubleshooting.md`, `cli-cheat-sheet.md`, `wasm-distribution.md`).
- **Technical Specs**: Before implementing large or architectural features, author or reference an RFC/spec in `docs/specs/<feature>_spec.md` and link it in the root `ROADMAP.md`.
- **Accuracy**: Ensure configuration files, commands (`wrangler`, `pnpm`), and schema examples accurately reflect current codebase practices.