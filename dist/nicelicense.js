#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyTemplate = applyTemplate;
exports.downloadLicense = downloadLicense;
exports.identifyLicense = identifyLicense;
exports.normalize = normalize;
exports.parseArgs = parseArgs;
exports.resolveOutputPath = resolveOutputPath;
exports.sha256 = sha256;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const child_process_1 = require("child_process");
const util_1 = require("util");
const crypto_1 = __importDefault(require("crypto"));
const enquirer_1 = __importDefault(require("enquirer"));
const { AutoComplete, Confirm, Input } = enquirer_1.default;
const execAsync = (0, util_1.promisify)(child_process_1.exec);
const LICENSE_FILES = ["LICENSE", "LICENSE.txt", "LICENSE.md"];
function parseArgs(argv) {
    const options = {
        dryRun: false,
        stdout: false,
        validate: false,
        yes: false,
        help: false,
        list: false,
        json: false,
        verbose: false
    };
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
        if (arg === "--dry-run") {
            options.dryRun = true;
            continue;
        }
        if (arg === "--stdout") {
            options.stdout = true;
            continue;
        }
        if (arg === "--validate") {
            options.validate = true;
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
function printHelp() {
    const help = [
        "nicelicense",
        "",
        "Usage:",
        "  nicelicense [--license <SPDX>] [--yes]",
        "  nicelicense --list",
        "  nicelicense --validate",
        "",
        "Options:",
        "  --license <SPDX>     Select a license without prompting",
        "  --data <path>        Load licenses from a custom JSON file",
        "  --path <path>        Write the license to a specific path",
        "  --name <name>        License holder name",
        "  --email <email>      License holder email",
        "  --years <years>      Copyright years (e.g. 2024 or 2020-2024)",
        "  --software <name>    Software/project name",
        "  --description <text> Project description",
        "  --organization <org> Organization name",
        "  --list               Print supported SPDX IDs",
        "  --validate           Identify existing LICENSE file",
        "  --dry-run            Do not write files or update package.json",
        "  --stdout             Emit license text to stdout (no files written)",
        "  --verbose            Include URLs and metadata with --list",
        "  --json               Emit machine-readable JSON output",
        "  --yes                Accept prompts (overwrite/license field updates)",
        "  -h, --help           Show this help",
        ""
    ];
    console.log(help.join("\n"));
}
async function loadLicenses(dataPath) {
    const resolved = dataPath ?? process.env.NICELICENSE_DATA ?? path_1.default.join(__dirname, "..", "data", "licenses.json");
    const resolvedPath = path_1.default.isAbsolute(resolved) ? resolved : path_1.default.resolve(process.cwd(), resolved);
    const raw = await fs_1.default.promises.readFile(resolvedPath, "utf8");
    const licenses = JSON.parse(raw);
    if (!Array.isArray(licenses)) {
        throw new Error("License list JSON must be an array.");
    }
    return licenses;
}
async function findExistingLicense(cwd) {
    for (const filename of LICENSE_FILES) {
        const filePath = path_1.default.join(cwd, filename);
        try {
            await fs_1.default.promises.access(filePath, fs_1.default.constants.F_OK);
            const text = await fs_1.default.promises.readFile(filePath, "utf8");
            return { filePath, filename, text };
        }
        catch (error) {
            if (error.code !== "ENOENT") {
                throw error;
            }
        }
    }
    return null;
}
function normalize(text) {
    return text.replace(/\r\n/g, "\n").replace(/\s+/g, " ").trim();
}
function sha256(text) {
    return crypto_1.default.createHash("sha256").update(text).digest("hex");
}
async function fetchLicenseText(url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to download license: ${response.status} ${response.statusText}`);
    }
    return response.text();
}
async function downloadLicense(license) {
    const text = await fetchLicenseText(license.url);
    if (license.sha256) {
        const digest = sha256(text);
        if (digest !== license.sha256) {
            throw new Error(`Fingerprint mismatch for ${license.spdx}. Update data/licenses.json before continuing.`);
        }
    }
    return text;
}
function identifyLicense(existing, licenses) {
    const normalized = normalize(existing.text).toLowerCase();
    let bestMatch = null;
    for (const license of licenses) {
        if (!license.fingerprints || license.fingerprints.length === 0) {
            continue;
        }
        let matchedCount = 0;
        for (const fingerprint of license.fingerprints) {
            // Case-insensitive substring match
            if (normalized.includes(fingerprint.toLowerCase())) {
                matchedCount++;
            }
        }
        if (matchedCount > 0) {
            const confidence = matchedCount / license.fingerprints.length;
            const identification = {
                license,
                confidence,
                matchedFingerprints: matchedCount,
                totalFingerprints: license.fingerprints.length
            };
            // Update best match if this has higher confidence or more matches
            if (!bestMatch ||
                identification.confidence > bestMatch.confidence ||
                (identification.confidence === bestMatch.confidence &&
                    identification.matchedFingerprints > bestMatch.matchedFingerprints)) {
                bestMatch = identification;
            }
        }
    }
    return bestMatch;
}
async function chooseLicense(licenses) {
    const choices = licenses.map((license) => ({
        name: license.spdx,
        message: `${license.spdx} - ${license.name}`
    }));
    const prompt = new AutoComplete({
        message: "Pick a license",
        limit: 10,
        choices
    });
    const selected = (await prompt.run());
    return licenses.find((license) => license.spdx === selected) ?? null;
}
async function confirmOverwrite(existing, options) {
    if (options.yes) {
        return true;
    }
    const prompt = new Confirm({
        message: `Replace existing ${existing.filename}?`
    });
    return (await prompt.run());
}
async function confirmUpdatePackageJson(current, next, options) {
    if (options.yes) {
        return true;
    }
    const prompt = new Confirm({
        message: `Update package.json license from ${current} to ${next}?`
    });
    return (await prompt.run());
}
async function getGitConfig(key) {
    try {
        const { stdout } = await execAsync(`git config --get ${key}`);
        const value = stdout.trim();
        return value.length > 0 ? value : null;
    }
    catch {
        return null;
    }
}
async function getDefaults(cwd) {
    const defaults = {};
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
    defaults.software = path_1.default.basename(cwd);
    return defaults;
}
function validateYears(value) {
    return /^\d{4}(-\d{4})?$/.test(value);
}
function validateEmail(value) {
    return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value);
}
function validateField(field, value) {
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
async function promptForFields(license, options, defaults) {
    const fields = license.template?.fields ?? [];
    const answers = {};
    for (const field of fields) {
        const provided = options[field];
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
            throw new Error(`Missing required fields for ${license.spdx}: ${missing.join(", ")}. Provide them via CLI flags.`);
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
        const value = (await prompt.run()).trim();
        const error = validateField(field, value);
        if (error) {
            throw new Error(error);
        }
        answers[field] = value;
    }
    return answers;
}
function applyTemplate(text, license, values) {
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
function outputJson(payload) {
    process.stdout.write(`${JSON.stringify(payload)}\n`);
}
async function updatePackageJsonLicense(cwd, spdx, options, nonInteractive) {
    const pkgPath = path_1.default.join(cwd, "package.json");
    try {
        const raw = await fs_1.default.promises.readFile(pkgPath, "utf8");
        const data = JSON.parse(raw);
        const current = typeof data.license === "string" ? data.license : undefined;
        if (current === spdx) {
            return { updated: false, path: pkgPath };
        }
        if (current && current !== spdx) {
            if (nonInteractive && !options.yes) {
                throw new Error("package.json license update requires confirmation in non-interactive mode. Provide --yes.");
            }
            const confirmed = await confirmUpdatePackageJson(current, spdx, options);
            if (!confirmed) {
                return { updated: false, path: pkgPath };
            }
        }
        data.license = spdx;
        await fs_1.default.promises.writeFile(pkgPath, JSON.stringify(data, null, 2) + "\n");
        return { updated: true, path: pkgPath };
    }
    catch (error) {
        if (error.code === "ENOENT") {
            return { updated: false, path: null };
        }
        throw error;
    }
}
async function writeLicenseFile(filePath, text) {
    await fs_1.default.promises.mkdir(path_1.default.dirname(filePath), { recursive: true });
    await fs_1.default.promises.writeFile(filePath, text.trimEnd() + "\n");
}
async function resolveOutputPath(cwd, existing, options, nonInteractive) {
    if (options.path) {
        return path_1.default.resolve(cwd, options.path);
    }
    if (existing) {
        return existing.filePath;
    }
    if (options.yes) {
        return path_1.default.join(cwd, "LICENSE");
    }
    if (nonInteractive) {
        throw new Error("Output path is required in non-interactive mode. Provide --path or --yes.");
    }
    const prompt = new Input({
        message: "Where do you want to save the file",
        initial: "LICENSE"
    });
    const value = (await prompt.run()).trim();
    if (value.length === 0) {
        throw new Error("Output path is required.");
    }
    return path_1.default.resolve(cwd, value);
}
async function main() {
    const cwd = process.cwd();
    const options = parseArgs(process.argv.slice(2));
    const nonInteractive = options.json && !process.stdin.isTTY;
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
        if (options.validate) {
            const existing = await findExistingLicense(cwd);
            if (!existing) {
                if (options.json) {
                    outputJson({ status: "missing", message: "No LICENSE file found." });
                }
                else {
                    console.log("No LICENSE file found.");
                }
                return;
            }
            const identification = identifyLicense(existing, licenses);
            if (identification) {
                const confidencePercent = Math.round(identification.confidence * 100);
                if (options.json) {
                    outputJson({
                        status: "identified",
                        spdx: identification.license.spdx,
                        name: identification.license.name,
                        path: existing.filePath,
                        confidence: identification.confidence,
                        confidencePercent: `${confidencePercent}%`,
                        matchedFingerprints: identification.matchedFingerprints,
                        totalFingerprints: identification.totalFingerprints
                    });
                }
                else {
                    console.log(`Identified ${existing.filename} as ${identification.license.spdx} (${confidencePercent}% confidence, ${identification.matchedFingerprints}/${identification.totalFingerprints} fingerprints matched).`);
                }
                return;
            }
            const message = "Could not identify LICENSE - no matching fingerprints found.";
            if (options.json) {
                outputJson({ status: "unknown", message, path: existing.filePath });
            }
            else {
                console.log(message);
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
            }
            else {
                console.error(message);
            }
            process.exitCode = 1;
            return;
        }
        if (existing) {
            if (!options.json && !options.stdout) {
                console.log(`Found ${existing.filename}.`);
            }
            if (!requestedLicense) {
                if (options.json) {
                    outputJson({ status: "existing", path: existing.filePath });
                }
                return;
            }
            if (nonInteractive && !options.yes) {
                throw new Error("Overwrite confirmation required in non-interactive mode. Provide --yes to proceed.");
            }
            const overwrite = await confirmOverwrite(existing, options);
            if (!overwrite) {
                if (options.json) {
                    outputJson({ status: "skipped", reason: "overwrite_declined" });
                }
                else {
                    console.log("Leaving existing license unchanged.");
                }
                return;
            }
            if (!options.json) {
                console.log(`--license ${requestedLicense.spdx} requested, will replace.`);
            }
        }
        if (!requestedLicense && nonInteractive) {
            throw new Error("License selection required in non-interactive mode. Provide --license.");
        }
        const selected = requestedLicense ?? (await chooseLicense(licenses));
        if (!selected) {
            if (options.json) {
                outputJson({ status: "skipped", reason: "no_selection" });
            }
            else {
                console.log("No license selected.");
            }
            return;
        }
        if (!options.json && !options.stdout) {
            console.log(`Downloading ${selected.spdx}...`);
        }
        const downloaded = await downloadLicense(selected);
        if (nonInteractive && !options.yes) {
            const needed = selected.template?.fields ?? [];
            const missing = needed.filter((field) => {
                const provided = options[field];
                return !(typeof provided === "string" && provided.trim().length > 0);
            });
            if (missing.length > 0) {
                throw new Error(`Missing required fields in non-interactive mode: ${missing.join(", ")}.`);
            }
        }
        const values = await promptForFields(selected, options, defaults);
        const templated = applyTemplate(downloaded, selected, values);
        if (options.stdout) {
            if (options.json) {
                outputJson({
                    status: "stdout",
                    spdx: selected.spdx,
                    name: selected.name,
                    licenseText: templated,
                    warnings: selected.warnings ?? []
                });
            }
            else {
                process.stdout.write(templated.trimEnd() + "\n");
            }
            return;
        }
        const targetPath = await resolveOutputPath(cwd, existing, options, nonInteractive);
        if (options.dryRun) {
            if (options.json) {
                outputJson({
                    status: "dry_run",
                    spdx: selected.spdx,
                    name: selected.name,
                    path: targetPath,
                    warnings: selected.warnings ?? []
                });
            }
            else {
                console.log(`Dry run: would write ${path_1.default.basename(targetPath)}.`);
            }
            return;
        }
        await writeLicenseFile(targetPath, templated);
        const updateResult = await updatePackageJsonLicense(cwd, selected.spdx, options, nonInteractive);
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
        console.log(`Saved ${path_1.default.basename(targetPath)}.`);
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
        }
        else if (!updateResult.path) {
            console.log("No package.json found; skipping license field update.");
        }
    }
    catch (error) {
        const message = error.message || String(error);
        if (options.json) {
            outputJson({ status: "error", message });
        }
        else {
            console.error(message);
        }
        process.exitCode = 1;
    }
}
if (require.main === module) {
    void main();
}
