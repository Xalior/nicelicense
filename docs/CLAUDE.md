Claude usage guide (tool users)

This guide is for Claude or other LLMs that USE nicelicense, not for tool developers.
For the full CLI contract, flags, JSON schemas, and exit codes, see docs/AGENTS.md.

Best practices
  - Always use --json for machine-readable output.
  - Use --yes + provide all required fields to avoid prompts.
  - Discover required fields via: nicelicense --list --json
  - If a LICENSE already exists and you do not intend to overwrite, omit --license.
  - Use --validate for audits, --dry-run to plan changes, and --stdout to capture text.

Safe, non-interactive flow
  1) List licenses:
     nicelicense --list --json

  2) Generate a license:
     nicelicense --license MIT --yes --json --name "Jane Doe" --years 2024

  3) Handle response:
     - status: written | existing | skipped | error
     - errors include a human-readable message string

Common pitfalls
  - Missing required template fields causes an error and exit code 1.
  - If --license is provided and a LICENSE exists, you must use --yes to avoid prompts.
  - If package.json exists, the license field may be updated.

When to use --path
  - Use --path <relative or absolute path> to place the license file outside the
    repo root or to avoid overwriting an existing file.
