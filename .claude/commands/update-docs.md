Update the project documentation files: README.md, CLAUDE.md, and SKILL.md.

## Instructions

1. Read the current versions of all three files
2. Read the current source code to understand what has changed since the docs were last updated
3. Update each file with accurate, current information

### README.md
- Features list (Item Management, Categories, Tags, UI, Sidebar, Data & Profiles)
- Keyboard Shortcuts table
- Project Structure tree
- Config Format JSON example and field descriptions
- Profile System description

### CLAUDE.md
- Architecture (Rust Backend commands, React Frontend hooks/components)
- Type System
- Key Design Decisions
- Tauri WebView Gotchas table
- Conventions

### SKILL.md
- Add any new Tauri WebView gotchas or development pitfalls encountered
- Each entry should have: symptoms, cause, workaround, code example (if applicable), affected files

## Rules
- Do NOT rewrite files from scratch — make targeted edits to add/update content
- Keep existing content that is still accurate
- Remove or update content that is outdated
- Ensure all three files are consistent with each other
- Run `pnpm build` at the end to verify no issues
