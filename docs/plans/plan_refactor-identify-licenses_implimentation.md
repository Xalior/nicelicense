# WIP: Refactor License Validation to Identification

**Branch:** `refactor/identify-licenses`
**Started:** 2026-02-14
**Status:** Complete

## Plan

Replace the fragile regex-based license validation with a pragmatic identification approach. Instead of trying to validate whether a license is "valid", identify which license it most likely is based on distinctive keywords and phrases.

### Rationale

The current regex approach has fundamental limitations:
- People add their own names, copyright info, and preambles
- Whitespace and formatting variations are unpredictable
- Minor edits break pattern matching
- False positives/negatives are common

The new approach:
- **Identify, don't validate** - return best-guess SPDX identifier with confidence
- Use distinctive phrases as fingerprints for each license
- Support all licenses from https://spdx.org/licenses/
- Return honest "unknown" for unrecognized licenses
- No false claims of "valid" or "invalid"

### Tasks

- [x] Fetch and understand SPDX license list structure
- [x] Design identification signature system (distinctive phrases per license)
- [x] Add fingerprints to data/licenses.json
- [x] Remove regex-based validation code (`buildLicenseRegex`)
- [x] Implement new `identifyLicense()` function with keyword matching
- [x] Update `validateExistingLicense()` to use identification instead
- [x] Update tests to match new behavior
- [x] Update documentation (README, AGENTS.md, CLAUDE.md)

## Progress Log

### 2026-02-14 14:30
- Started work. Branch created from `main` at `dcaaa9b94f4703b3a42adada64a595b7be673930`.
- Pre-flight checks complete: clean working tree, on main, synced with remote.
- Researched SPDX license list - confirmed we cover the most popular licenses.
- Designed fingerprint system: 2-4 distinctive phrases per license stored in licenses.json.

### 2026-02-14 15:00
- Added fingerprints to all 10 licenses in data/licenses.json.
- Removed `buildLicenseRegex()` function (regex-based validation).
- Implemented new `identifyLicense()` function with fingerprint matching.
- Updated `--validate` flag to return identification results with confidence scores.
- Updated all tests - 22/22 passing.
- Updated documentation (README.md, docs/AGENTS.md).

### 2026-02-14 15:15
- Implementation complete. All tasks finished.
- Branch ready for review and PR creation.

## Decisions & Notes

- **Scope**: Focus on popular/common licenses first, expand coverage iteratively
- **Fingerprints**: Use 2-3 distinctive phrases per license (e.g., MIT = "Permission is hereby granted, free of charge")
- **Confidence scoring**: Simple match count (how many fingerprints matched)
- **Backward compatibility**: Keep existing license generation working, only change validation

## Blockers

<None currently.>

## Commits

0e04375 - wip: start refactor/identify-licenses — init progress tracker
5f3c53f - wip: complete SPDX research and design fingerprint system
35bbf28 - feat: add fingerprints to all licenses for identification
a2ad3fa - refactor: replace regex validation with fingerprint-based identification
f8d68f3 - test: update tests for fingerprint-based identification
0b540ec - docs: update documentation for identification instead of validation
