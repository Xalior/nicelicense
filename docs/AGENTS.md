AGENTS.md - LLM user guide for nicelicense

Audience
  This document is for LLMs and agents that USE the nicelicense CLI.
  It is not for maintainers or contributors.

Purpose
  Generate or validate LICENSE files using a stable, machine-friendly contract.

Quick start (non-interactive)
  1) List licenses and required template fields:
     nicelicense --list --json
  2) Generate a license without prompts:
     nicelicense --license MIT --yes --name "Jane Doe" --years 2024

Non-interactive rules
  - If any required template fields are missing, the CLI exits with status 1.
  - To avoid prompts, always provide:
      --license <SPDX> and --yes and all required fields.
  - Required fields vary per license. Use --list --json to discover templateFields.
  - When --json is set and stdin is not a TTY, prompts are disabled.
    Missing inputs yield a JSON error response and exit code 1.

CLI flags
  --license <SPDX>     Select a license without prompting
  --data <path>        Load licenses from a custom JSON file
  --path <path>        Write the license to a specific path
  --name <name>        License holder name
  --email <email>      License holder email
  --years <years>      Copyright years (e.g. 2024 or 2020-2024)
  --software <name>    Software/project name
  --description <text> Project description
  --organization <org> Organization name
  --list               Print supported SPDX IDs
  --validate           Validate existing LICENSE file
  --dry-run            Do not write files or update package.json
  --stdout             Emit license text to stdout (no files written)
  --verbose            Include URLs and metadata with --list
  --json               Emit machine-readable JSON output
  --yes                Accept prompts (overwrite/license field updates)
  -h, --help           Show help

Default behaviors to account for
  - If an existing LICENSE file is found and no --license is provided:
      - With --json: {"status":"existing","path":"..."} and exit 0.
      - Without --json: prints a message and exits 0.
  - If an existing LICENSE is found and --license is provided:
      - Prompts to overwrite unless --yes is set.
  - If package.json exists, it may update the license field.
  - Downloads license templates from canonical URLs listed in data/licenses.json.

JSON outputs (when --json is provided)
  1) List licenses (--list --json)
     {
       "licenses": [
         {
           "spdx": "MIT",
           "name": "MIT License",
           "url": "https://...",
           "sha256": "hex",
           "templateFields": ["years","name"],
           "warnings": []
         }
       ]
     }

  2) Written license
     {
       "status": "written",
       "spdx": "MIT",
       "name": "MIT License",
       "path": "/abs/path/LICENSE",
       "packageJsonUpdated": true,
       "warnings": []
     }

  2b) Dry run (no write)
     {
       "status": "dry_run",
       "spdx": "MIT",
       "name": "MIT License",
       "path": "/abs/path/LICENSE",
       "warnings": []
     }

  2c) Stdout (license text only)
     {
       "status": "stdout",
       "spdx": "MIT",
       "name": "MIT License",
       "licenseText": "Full license text...",
       "warnings": []
     }

  3) Existing license found (no --license)
     { "status": "existing", "path": "/abs/path/LICENSE" }

  4) Skipped (no selection or overwrite declined)
     { "status": "skipped", "reason": "no_selection" }
     { "status": "skipped", "reason": "overwrite_declined" }

  5) Error
     { "status": "error", "message": "Human-readable error message" }

  6) Validate existing license
     { "status": "validated", "spdx": "MIT", "name": "MIT License", "path": "/abs/path/LICENSE" }
     { "status": "unmatched", "message": "Reason", "path": "/abs/path/LICENSE" }
     { "status": "missing", "message": "No LICENSE file found." }

Exit codes
  - 0 on success or on early exit (existing license without change).
  - 1 on error (invalid input, download failure, missing fields, etc).

Recommended agent flow
  1) Call: nicelicense --list --json
  2) Pick spdx + templateFields for required inputs.
  3) Call: nicelicense --license <SPDX> --yes --json [required fields]
  4) Read JSON response and act on status.
