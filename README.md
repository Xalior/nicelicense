# nicelicense

Pick and manage LICENSE files with a guided CLI.

## Install

```sh
npx nicelicense
```

## Usage

Interactive mode:

```sh
npx nicelicense
```

Non-interactive mode:

```sh
npx nicelicense --license MIT --yes --name "Jane Doe" --years 2024
```

List supported licenses:

```sh
npx nicelicense --list
```

List with details:

```sh
npx nicelicense --list --verbose
```

Machine-readable output:

```sh
npx nicelicense --list --json
```

## What it does

- Detects an existing LICENSE file and validates it against known SPDX templates.
- Downloads license text from canonical URLs on selection and verifies fingerprints.
- Updates the `license` field in `package.json` when present.
- Uses `git config user.name` and `user.email` as defaults when available.

## License list

Extend `data/licenses.json` to add more SPDX IDs and source URLs.

## Flags

```sh
--license <SPDX>     Select a license without prompting
--path <path>        Write the license to a specific path
--name <name>        License holder name
--email <email>      License holder email
--years <years>      Copyright years (e.g. 2024 or 2020-2024)
--software <name>    Software/project name
--description <text> Project description
--organization <org> Organization name
--list               Print supported SPDX IDs
--verbose            Include URLs and metadata with --list
--json               Emit machine-readable JSON output
--yes                Accept prompts (overwrite/license field updates)
```
