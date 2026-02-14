# Changelog

All notable changes to nicelicense will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2025-02-14

### Changed
- **BREAKING:** `--validate` now performs license identification instead of strict validation
  - Returns `status: "identified"` instead of `status: "validated"`
  - Returns `status: "unknown"` instead of `status: "unmatched"`
  - Includes confidence scoring (0.0-1.0) and fingerprint match counts
  - More lenient: works even when users add custom headers or modify formatting
- Replaced regex-based license validation with fingerprint-based identification
- Improved accuracy with distinctive phrase matching per license

### Added
- Confidence scoring for license identification
  - `confidence`: decimal score (0.0-1.0)
  - `confidencePercent`: human-readable percentage (e.g., "100%")
  - `matchedFingerprints`: number of matched distinctive phrases
  - `totalFingerprints`: total distinctive phrases for the license
- Fingerprints (distinctive phrases) for all 10 supported licenses
  - MIT: 3 fingerprints
  - Apache-2.0: 4 fingerprints
  - BSD-3-Clause: 3 fingerprints
  - BSD-2-Clause: 3 fingerprints
  - ISC: 3 fingerprints
  - MPL-2.0: 3 fingerprints
  - LGPL-3.0-only: 4 fingerprints
  - GPL-3.0-only: 4 fingerprints
  - GPL-3.0-or-later: 4 fingerprints
  - Unlicense: 3 fingerprints

### Fixed
- BSD-2-Clause and BSD-3-Clause no longer falsely match each other
  - BSD-3-Clause uses full "Neither the name...endorse or promote" clause
  - BSD-2-Clause uses "Redistributions in binary form" phrase
- ISC license no longer matches "DISCLAIMER" in other licenses
  - Replaced generic "ISC" fingerprint with distinctive "with or without fee"
- GPL-3.0-or-later better distinguished from GPL-3.0-only
  - Added 4th fingerprint "How to Apply These Terms to Your New Programs"
- Performance: `.toLowerCase()` now called once instead of per-fingerprint iteration

### Removed
- `buildLicenseRegex()` function (replaced by fingerprint matching)
- `validateExistingLicense()` function (replaced by `identifyLicense()`)
- Regex-based template matching logic

### Documentation
- Updated README.md to describe identification instead of validation
- Updated docs/AGENTS.md with new JSON response schema
- Updated docs/CLAUDE.md with identification usage
- Updated `--validate` help text to say "Identify existing LICENSE file"

## [0.1.0] - 2025-01-24

### Added
- Initial release of nicelicense CLI
- Interactive license selection with guided prompts
- Non-interactive mode with `--json` output for automation
- Support for 10 popular open source licenses:
  - MIT
  - Apache-2.0
  - BSD-3-Clause
  - BSD-2-Clause
  - ISC
  - MPL-2.0
  - LGPL-3.0-only
  - GPL-3.0-only
  - GPL-3.0-or-later
  - Unlicense
- Template field substitution for copyright year and holder name
- SHA256 fingerprint verification for downloaded license texts
- Automatic `package.json` license field updates
- Git config integration (uses `git config user.name` and `user.email` as defaults)
- Custom license database support via `--data` flag or `NICELICENSE_DATA` env var
- Comprehensive CLI flags:
  - `--license <SPDX>` - Select license without prompting
  - `--path <path>` - Custom output path
  - `--name <name>` - License holder name
  - `--email <email>` - License holder email
  - `--years <years>` - Copyright years (YYYY or YYYY-YYYY)
  - `--software <name>` - Project name
  - `--description <text>` - Project description
  - `--organization <org>` - Organization name
  - `--list` - Show available licenses
  - `--validate` - Validate existing LICENSE file (regex-based)
  - `--dry-run` - Plan without writing
  - `--stdout` - Output to stdout only
  - `--yes` - Auto-accept all prompts
  - `--json` - Machine-readable output
  - `--verbose` - Detailed list output
- Comprehensive test suite (22 tests: unit + integration)
- TypeScript implementation with full type safety
- LLM/agent-friendly documentation (docs/AGENTS.md, docs/CLAUDE.md)

[0.2.0]: https://github.com/Xalior/nicelicense/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/Xalior/nicelicense/releases/tag/v0.1.0
