#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import crypto from "crypto";
import enquirer from "enquirer";

const { AutoComplete, Confirm, Input } = enquirer as unknown as {
  AutoComplete: new (options: {
    message: string;
    limit?: number;
    choices: Array<{ name: string; message: string }>;
  }) => { run: () => Promise<string> };
  Confirm: new (options: { message: string }) => { run: () => Promise<boolean> };
  Input: new (options: { message: string; initial?: string }) => { run: () => Promise<string> };
};

const execAsync = promisify(exec);
const LICENSE_FILES = ["LICENSE", "LICENSE.txt", "LICENSE.md"];

type LicenseEntry = {
  spdx: string;
  name: string;
  url: string;
  sha256?: string;
  template?: {
    fields: string[];
    replacements: Array<{
      field: string;
      start: number;
      end: number;
    }>;
  };
  warnings?: string[];
};

type ExistingLicense = {
  filePath: string;
  filename: string;
  text: string;
};

type CliOptions = {
  license?: string;
  data?: string;
  path?: string;
  name?: string;
  email?: string;
  years?: string;
  software?: string;
  description?: string;
  organization?: string;
  yes: boolean;
  help: boolean;
  list: boolean;
  json: boolean;
  verbose: boolean;
};

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = { yes: false, help: false, list: false, json: false, verbose: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--yes" || arg === "-y") {
      options.yes = true;
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }
    if (arg === "--list" || arg === "-l") {
      options.list = true;
      continue;
    }
    if (arg === "--json") {
      options.json = true;
      continue;
    }
    if (arg === "--verbose" || arg === "-v") {
      options.verbose = true;
      continue;
    }
    if (arg === "--license") {
      options.license = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg.startsWith("--license=")) {
      options.license = arg.slice("--license=".length);
      continue;
    }
    if (arg === "--data") {
      options.data = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg.startsWith("--data=")) {
      options.data = arg.slice("--data=".length);
      continue;
    }
    if (arg === "--path") {
      options.path = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg.startsWith("--path=")) {
      options.path = arg.slice("--path=".length);
      continue;
    }
    if (arg === "--name") {
      options.name = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg.startsWith("--name=")) {
      options.name = arg.slice("--name=".length);
      continue;
    }
    if (arg === "--email") {
      options.email = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg.startsWith("--email=")) {
      options.email = arg.slice("--email=".length);
      continue;
    }
    if (arg === "--years") {
      options.years = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg.startsWith("--years=")) {
      options.years = arg.slice("--years=".length);
      continue;
    }
    if (arg === "--software") {
      options.software = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg.startsWith("--software=")) {
      options.software = arg.slice("--software=".length);
      continue;
    }
    if (arg === "--description") {
      options.description = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg.startsWith("--description=")) {
      options.description = arg.slice("--description=".length);
      continue;
    }
    if (arg === "--organization") {
      options.organization = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg.startsWith("--organization=")) {
      options.organization = arg.slice("--organization=".length);
    }
  }
  return options;
}

function printHelp(): void {
  console.log(`nicelicense\n\nUsage:\n  nicelicense [--license <SPDX>] [--yes]\n  nicelicense --list\n\nOptions:\n  --license <SPDX>     Select a license without prompting\n  --data <path>        Load licenses from a custom JSON file\n  --path <path>        Write the license to a specific path\n  --name <name>        License holder name\n  --email <email>      License holder email\n  --years <years>      Copyright years (e.g. 2024 or 2020-2024)\n  --software <name>    Software/project name\n  --description <text> Project description\n  --organization <org> Organization name\n  --list               Print supported SPDX IDs\n  --verbose            Include URLs and metadata with --list\n  --json               Emit machine-readable JSON output\n  --yes                Accept prompts (overwrite/license field updates)\n  -h, --help           Show this help\n`);
}

async function loadLicenses(dataPath?: string): Promise<LicenseEntry[]> {
  const resolved =
    dataPath ?? process.env.NICELICENSE_DATA ?? path.join(__dirname, "..", "data", "licenses.json");
  const resolvedPath = path.isAbsolute(resolved) ? resolved : path.resolve(process.cwd(), resolved);
  const raw = await fs.promises.readFile(resolvedPath, "utf8");
  const licenses = JSON.parse(raw) as unknown;
  if (!Array.isArray(licenses)) {
    throw new Error("License list JSON must be an array.");
  }
  return licenses as LicenseEntry[];
}

async function findExistingLicense(cwd: string): Promise<ExistingLicense | null> {
  for (const filename of LICENSE_FILES) {
    const filePath = path.join(cwd, filename);
    try {
      await fs.promises.access(filePath, fs.constants.F_OK);
      const text = await fs.promises.readFile(filePath, "utf8");
      return { filePath, filename, text };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
    }
  }
  return null;
}

function normalize(text: string): string {
  return text.replace(/\r\n/g, "\n").replace(/\s+/g, " ").trim();
}

function sha256(text: string): string {
  return crypto.createHash("sha256").update(text).digest("hex");
}

function buildLicenseRegex(templateText: string): RegExp {
  const normalized = normalize(templateText);
  const tokenized = normalized.replace(/<[^>]+>|\[[^\]]+\]/g, "__LICENSE_TOKEN__");
  const escaped = tokenized.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const withTokens = escaped.replace(/__LICENSE_TOKEN__/g, ".+?");
  const pattern = withTokens.replace(/ /g, "\\s+");
  return new RegExp(`^${pattern}$`, "s");
}

async function fetchLicenseText(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download license: ${response.status} ${response.statusText}`);
  }
  return response.text();
}

async function downloadLicense(license: LicenseEntry): Promise<string> {
  const text = await fetchLicenseText(license.url);
  if (license.sha256) {
    const digest = sha256(text);
    if (digest !== license.sha256) {
      throw new Error(
        `Fingerprint mismatch for ${license.spdx}. Update data/licenses.json before continuing.`
      );
    }
  }
  return text;
}

async function validateExistingLicense(
  existing: ExistingLicense,
  licenses: LicenseEntry[]
): Promise<{ match: LicenseEntry | null; error: Error | null }> {
  const normalized = normalize(existing.text);
  let firstError: Error | null = null;
  for (const license of licenses) {
    try {
      const remoteText = await downloadLicense(license);
      const regex = buildLicenseRegex(remoteText);
      if (regex.test(normalized)) {
        return { match: license, error: null };
      }
    } catch (error) {
      if (!firstError) {
        firstError = error as Error;
      }
    }
  }
  return { match: null, error: firstError };
}

async function chooseLicense(licenses: LicenseEntry[]): Promise<LicenseEntry | null> {
  const choices = licenses.map((license) => ({
    name: license.spdx,
    message: `${license.spdx} - ${license.name}`
  }));

  const prompt = new AutoComplete({
    message: "Pick a license",
    limit: 10,
    choices
  });

  const selected = (await prompt.run()) as string;
  return licenses.find((license) => license.spdx === selected) ?? null;
}

async function confirmOverwrite(existing: ExistingLicense, options: CliOptions): Promise<boolean> {
  if (options.yes) {
    return true;
  }
  const prompt = new Confirm({
    message: `Replace existing ${existing.filename}?`
  });
  return (await prompt.run()) as boolean;
}

async function confirmUpdatePackageJson(
  current: string,
  next: string,
  options: CliOptions
): Promise<boolean> {
  if (options.yes) {
    return true;
  }
  const prompt = new Confirm({
    message: `Update package.json license from ${current} to ${next}?`
  });
  return (await prompt.run()) as boolean;
}

async function getGitConfig(key: string): Promise<string | null> {
  try {
    const { stdout } = await execAsync(`git config --get ${key}`);
    const value = stdout.trim();
    return value.length > 0 ? value : null;
  } catch {
    return null;
  }
}

async function getDefaults(cwd: string): Promise<Record<string, string>> {
  const defaults: Record<string, string> = {};
  const [name, email] = await Promise.all([
    getGitConfig("user.name"),
    getGitConfig("user.email")
  ]);
  if (name) {
    defaults.name = name;
    defaults.organization = name;
  }
  if (email) {
    defaults.email = email;
  }
  defaults.years = String(new Date().getFullYear());
  defaults.software = path.basename(cwd);
  return defaults;
}

function validateYears(value: string): boolean {
  return /^\d{4}(-\d{4})?$/.test(value);
}

function validateEmail(value: string): boolean {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value);
}

function validateField(field: string, value: string): string | null {
  if (value.trim().length === 0) {
    return `${field} is required.`;
  }
  if (field === "years" && !validateYears(value)) {
    return "Years must be YYYY or YYYY-YYYY.";
  }
  if (field === "email" && !validateEmail(value)) {
    return "Email must be valid.";
  }
  return null;
}

async function promptForFields(
  license: LicenseEntry,
  options: CliOptions,
  defaults: Record<string, string>
): Promise<Record<string, string>> {
  const fields = license.template?.fields ?? [];
  const answers: Record<string, string> = {};

  for (const field of fields) {
    const provided = options[field as keyof CliOptions];
    if (typeof provided === "string" && provided.trim().length > 0) {
      const trimmed = provided.trim();
      const error = validateField(field, trimmed);
      if (error) {
        throw new Error(error);
      }
      answers[field] = trimmed;
    }
  }

  if (options.yes) {
    for (const field of fields) {
      if (!answers[field] && defaults[field]) {
        const candidate = defaults[field];
        const error = validateField(field, candidate);
        if (error) {
          throw new Error(error);
        }
        answers[field] = candidate;
      }
    }
    for (const field of fields) {
      const value = answers[field];
      if (!value) {
        continue;
      }
      const error = validateField(field, value);
      if (error) {
        throw new Error(error);
      }
    }
    const missing = fields.filter((field) => !answers[field]);
    if (missing.length > 0) {
      throw new Error(
        `Missing required fields for ${license.spdx}: ${missing.join(
          ", "
        )}. Provide them via CLI flags.`
      );
    }
    return answers;
  }

  for (const field of fields) {
    if (answers[field]) {
      continue;
    }
    const message = `Enter ${field}`;
    const prompt = new Input({
      message,
      initial: defaults[field] ?? ""
    });
    const value = ((await prompt.run()) as string).trim();
    const error = validateField(field, value);
    if (error) {
      throw new Error(error);
    }
    answers[field] = value;
  }

  return answers;
}

function applyTemplate(
  text: string,
  license: LicenseEntry,
  values: Record<string, string>
): string {
  const replacements = license.template?.replacements ?? [];
  if (replacements.length === 0) {
    return text;
  }
  let result = text;
  const ordered = [...replacements].sort((a, b) => b.start - a.start);
  for (const replacement of ordered) {
    const value = values[replacement.field];
    if (!value) {
      throw new Error(`Missing value for ${replacement.field}.`);
    }
    if (replacement.start < 0 || replacement.end > result.length) {
      throw new Error(`Replacement offsets out of range for ${license.spdx}.`);
    }
    result =
      result.slice(0, replacement.start) + value + result.slice(replacement.end);
  }
  return result;
}

function outputJson(payload: unknown): void {
  process.stdout.write(`${JSON.stringify(payload)}\n`);
}

async function updatePackageJsonLicense(
  cwd: string,
  spdx: string,
  options: CliOptions
): Promise<{ updated: boolean; path: string | null }> {
  const pkgPath = path.join(cwd, "package.json");
  try {
    const raw = await fs.promises.readFile(pkgPath, "utf8");
    const data = JSON.parse(raw) as Record<string, unknown>;
    const current = typeof data.license === "string" ? data.license : undefined;
    if (current === spdx) {
      return { updated: false, path: pkgPath };
    }
    if (current && current !== spdx) {
      const confirmed = await confirmUpdatePackageJson(current, spdx, options);
      if (!confirmed) {
        return { updated: false, path: pkgPath };
      }
    }
    data.license = spdx;
    await fs.promises.writeFile(pkgPath, JSON.stringify(data, null, 2) + "\n");
    return { updated: true, path: pkgPath };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { updated: false, path: null };
    }
    throw error;
  }
}

async function writeLicenseFile(filePath: string, text: string): Promise<void> {
  await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
  await fs.promises.writeFile(filePath, text.trimEnd() + "\n");
}

async function resolveOutputPath(
  cwd: string,
  existing: ExistingLicense | null,
  options: CliOptions
): Promise<string> {
  if (options.path) {
    return path.resolve(cwd, options.path);
  }
  if (existing) {
    return existing.filePath;
  }
  if (options.yes) {
    return path.join(cwd, "LICENSE");
  }
  const prompt = new Input({
    message: "Where do you want to save the file",
    initial: "LICENSE"
  });
  const value = ((await prompt.run()) as string).trim();
  if (value.length === 0) {
    throw new Error("Output path is required.");
  }
  return path.resolve(cwd, value);
}

async function main(): Promise<void> {
  const cwd = process.cwd();
  const options = parseArgs(process.argv.slice(2));
  try {
    if (options.help) {
      printHelp();
      return;
    }
    const licenses = await loadLicenses(options.data);
    if (options.list) {
      if (options.json) {
        outputJson({
          licenses: licenses.map((license) => ({
            spdx: license.spdx,
            name: license.name,
            url: license.url,
            sha256: license.sha256,
            templateFields: license.template?.fields ?? [],
            warnings: license.warnings ?? []
          }))
        });
        return;
      }
      for (const license of licenses) {
        console.log(`${license.spdx} - ${license.name}`);
        if (options.verbose) {
          console.log(`  url: ${license.url}`);
          if (license.sha256) {
            console.log(`  sha256: ${license.sha256}`);
          }
          if (license.template?.fields && license.template.fields.length > 0) {
            console.log(`  template: ${license.template.fields.join(", ")}`);
          }
          if (license.warnings && license.warnings.length > 0) {
            console.log(`  warnings: ${license.warnings.join("; ")}`);
          }
        }
      }
      return;
    }
    const defaults = await getDefaults(cwd);
    const existing = await findExistingLicense(cwd);
    const requestedLicense = options.license
      ? licenses.find((license) => license.spdx === options.license)
      : null;

    if (options.license && !requestedLicense) {
      const message = `Unknown license: ${options.license}`;
      if (options.json) {
        outputJson({ status: "error", message });
      } else {
        console.error(message);
      }
      process.exitCode = 1;
      return;
    }

    if (existing) {
      if (!options.json) {
        console.log(`Found ${existing.filename}.`);
      }
      if (!requestedLicense) {
        if (options.json) {
          outputJson({ status: "existing", path: existing.filePath });
        }
        return;
      }
      const overwrite = await confirmOverwrite(existing, options);
      if (!overwrite) {
        if (options.json) {
          outputJson({ status: "skipped", reason: "overwrite_declined" });
        } else {
          console.log("Leaving existing license unchanged.");
        }
        return;
      }
      if (!options.json) {
        console.log(`--license ${requestedLicense.spdx} requested, will replace.`);
      }
    }

    const selected = requestedLicense ?? (await chooseLicense(licenses));
    if (!selected) {
      if (options.json) {
        outputJson({ status: "skipped", reason: "no_selection" });
      } else {
        console.log("No license selected.");
      }
      return;
    }

    if (!options.json) {
      console.log(`Downloading ${selected.spdx}...`);
    }
    const downloaded = await downloadLicense(selected);
    const values = await promptForFields(selected, options, defaults);
    const templated = applyTemplate(downloaded, selected, values);
    const targetPath = await resolveOutputPath(cwd, existing, options);
    await writeLicenseFile(targetPath, templated);
    const updateResult = await updatePackageJsonLicense(cwd, selected.spdx, options);
    if (options.json) {
      outputJson({
        status: "written",
        spdx: selected.spdx,
        name: selected.name,
        path: targetPath,
        packageJsonUpdated: updateResult.updated,
        warnings: selected.warnings ?? []
      });
      return;
    }
    console.log(`Saved ${path.basename(targetPath)}.`);
    const lineCount = templated.split(/\r?\n/).length;
    if (lineCount <= 40) {
      console.log("\n--------\n");
      console.log(templated.trimEnd());
      console.log("\n--------\n");
    }
    if (selected.warnings && selected.warnings.length > 0) {
      for (const warning of selected.warnings) {
        console.warn(`Warning: ${warning}`);
      }
    }
    if (updateResult.path && updateResult.updated) {
      console.log("Updated package.json license field.");
    } else if (!updateResult.path) {
      console.log("No package.json found; skipping license field update.");
    }
  } catch (error) {
    const message = (error as Error).message || String(error);
    if (options.json) {
      outputJson({ status: "error", message });
    } else {
      console.error(message);
    }
    process.exitCode = 1;
  }
}

if (require.main === module) {
  void main();
}

export {
  applyTemplate,
  buildLicenseRegex,
  downloadLicense,
  normalize,
  parseArgs,
  resolveOutputPath,
  sha256,
  validateExistingLicense
};
