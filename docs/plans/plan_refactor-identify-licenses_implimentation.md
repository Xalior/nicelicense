# WIP: Refactor License Validation to Identification

**Branch:** `refactor/identify-licenses`
**Started:** 2026-02-14
**Status:** In Progress

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

- [ ] Fetch and understand SPDX license list structure
- [ ] Design identification signature system (distinctive phrases per license)
- [ ] Remove regex-based validation code (`buildLicenseRegex`, parts of `normalize`)
- [ ] Implement new `identifyLicense()` function with keyword matching
- [ ] Update `--validate` flag to return identification results instead
- [ ] Update data/licenses.json with identification signatures
- [ ] Update tests to match new behavior
- [ ] Update documentation (README, AGENTS.md, CLAUDE.md)

## Progress Log

### 2026-02-14 14:30
- Started work. Branch created from `main` at `dcaaa9b94f4703b3a42adada64a595b7be673930`.
- Pre-flight checks complete: clean working tree, on main, synced with remote.

## Decisions & Notes

- **Scope**: Focus on popular/common licenses first, expand coverage iteratively
- **Fingerprints**: Use 2-3 distinctive phrases per license (e.g., MIT = "Permission is hereby granted, free of charge")
- **Confidence scoring**: Simple match count (how many fingerprints matched)
- **Backward compatibility**: Keep existing license generation working, only change validation

## Blockers

<None currently.>

## Commits

_Commits will be logged here as work progresses._
