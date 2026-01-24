# AGENTS.md

## Project overview
- nicelicense is a Node.js CLI (TypeScript) for selecting, templating, and writing LICENSE files.
- User-facing agent docs live in `docs/AGENTS.md` and `docs/CLAUDE.md`.

## Project structure
- `src/nicelicense.ts` main CLI logic.
- `data/licenses.json` SPDX license list + templates + sha256 fingerprints.
- `dist/` build output (published bin).
- `tests/` unit + integration tests.

## Setup commands
- Install deps: `npm install`
- Build: `npm run build`
- Test: `npm test`

## Code style and conventions
- Keep CLI outputs stable, especially JSON responses when `--json` is used.
- Prefer small, focused changes; avoid repo-wide refactors unless asked.
- Use existing patterns in `src/nicelicense.ts` for new flags and behaviors.
- Avoid new dependencies unless necessary.

## Testing instructions
- Update or add tests in `tests/` for any behavior changes.
- Run `npm test` before finishing changes.

## Security and data integrity
- License text is downloaded from URLs in `data/licenses.json`.
- If adding/updating licenses, ensure `sha256` matches the canonical source.

## CLI behavior notes (agent-critical)
- Non-interactive mode: when `--json` is set and stdin is not a TTY, prompts are disabled.
- Missing inputs or confirmations in non-interactive mode must return JSON `{status:"error", message:"..."}` and exit code 1.
- Flags: `--validate`, `--dry-run`, `--stdout` with JSON statuses documented in `docs/AGENTS.md`.
