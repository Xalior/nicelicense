"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");

const cliPath = path.join(__dirname, "..", "dist", "nicelicense.js");

function runCli(args, cwd, env) {
  return new Promise((resolve, reject) => {
    const childEnv = { ...process.env, ...env };
    delete childEnv.NODE_OPTIONS;
    delete childEnv.NODE_TEST_CONTEXT;
    delete childEnv.NODE_TEST_CONTEXT_FD;
    const stdoutPath = path.join(
      cwd,
      `.nicelicense-stdout-${Date.now()}-${Math.random().toString(16).slice(2)}.log`
    );
    const stderrPath = path.join(
      cwd,
      `.nicelicense-stderr-${Date.now()}-${Math.random().toString(16).slice(2)}.log`
    );
    const stdoutFd = fs.openSync(stdoutPath, "w");
    const stderrFd = fs.openSync(stderrPath, "w");
    const child = spawn(process.execPath, [cliPath, ...args], {
      cwd,
      env: childEnv,
      stdio: ["ignore", stdoutFd, stderrFd]
    });
    child.on("error", reject);
    child.on("close", (code) => {
      fs.closeSync(stdoutFd);
      fs.closeSync(stderrFd);
      const stdout = fs.readFileSync(stdoutPath, "utf8");
      const stderr = fs.readFileSync(stderrPath, "utf8");
      fs.unlinkSync(stdoutPath);
      fs.unlinkSync(stderrPath);
      resolve({ code, stdout, stderr });
    });
  });
}

test("cli writes templated license and updates package.json", async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "nicelicense-"));
  const licenseText = "MIT License\n\nCopyright (c) <year> <copyright holders>\n\nPermission is hereby granted.";
  const replacements = [];
  for (const token of ["<year>", "<copyright holders>"]) {
    const start = licenseText.indexOf(token);
    replacements.push({
      field: token === "<year>" ? "years" : "name",
      start,
      end: start + token.length
    });
  }
  const sha = crypto.createHash("sha256").update(licenseText).digest("hex");

  const dataUrl = `data:text/plain,${encodeURIComponent(licenseText)}`;

  const dataPath = path.join(tempDir, "licenses.json");
  const licenseData = [
    {
      spdx: "MIT",
      name: "MIT License",
      url: dataUrl,
      sha256: sha,
      template: {
        fields: ["years", "name"],
        replacements
      }
    }
  ];
  fs.writeFileSync(dataPath, JSON.stringify(licenseData, null, 2) + "\n");

  const pkgPath = path.join(tempDir, "package.json");
  fs.writeFileSync(pkgPath, JSON.stringify({ name: "demo" }, null, 2) + "\n");

  const result = await runCli(
    ["--license", "MIT", "--yes", "--name", "Jane Doe", "--years", "2024", "--path", "LICENSE"],
    tempDir,
    { NICELICENSE_DATA: dataPath }
  );
  assert.equal(result.code, 0, result.stderr);

  const licenseOutput = fs.readFileSync(path.join(tempDir, "LICENSE"), "utf8");
  assert.match(licenseOutput, /Copyright \(c\) 2024 Jane Doe/);

  const updatedPkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  assert.equal(updatedPkg.license, "MIT");
});

test("cli --list uses custom data file", async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "nicelicense-list-"));
  const dataPath = path.join(tempDir, "licenses.json");
  fs.writeFileSync(
    dataPath,
    JSON.stringify([
      { spdx: "MIT", name: "MIT License", url: "https://example.com/mit" }
    ]) + "\n"
  );

  const result = await runCli(["--list", "--data", dataPath], tempDir, {});
  assert.equal(result.code, 0, result.stderr);
  assert.match(result.stdout, /MIT - MIT License/);
});

test("cli --list --verbose includes URLs", async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "nicelicense-verbose-"));
  const dataPath = path.join(tempDir, "licenses.json");
  fs.writeFileSync(
    dataPath,
    JSON.stringify(
      [{ spdx: "MIT", name: "MIT License", url: "https://example.com/mit" }],
      null,
      2
    ) + "\n"
  );

  const result = await runCli(["--list", "--verbose", "--data", dataPath], tempDir, {});
  assert.equal(result.code, 0, result.stderr);
  assert.match(result.stdout, /MIT - MIT License/);
  assert.match(result.stdout, /url: https:\/\/example.com\/mit/);
});

test("cli --list --json emits JSON payload", async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "nicelicense-json-"));
  const dataPath = path.join(tempDir, "licenses.json");
  fs.writeFileSync(
    dataPath,
    JSON.stringify(
      [{ spdx: "MIT", name: "MIT License", url: "https://example.com/mit" }],
      null,
      2
    ) + "\n"
  );

  const result = await runCli(["--list", "--json", "--data", dataPath], tempDir, {});
  assert.equal(result.code, 0, result.stderr);
  const parsed = JSON.parse(result.stdout);
  assert.equal(parsed.licenses[0].spdx, "MIT");
  assert.equal(parsed.licenses[0].name, "MIT License");
});

test("cli --json emits status for write flow", async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "nicelicense-json-write-"));
  const licenseText =
    "MIT License\n\nCopyright (c) <year> <copyright holders>\n\nPermission is hereby granted.";
  const replacements = [];
  for (const token of ["<year>", "<copyright holders>"]) {
    const start = licenseText.indexOf(token);
    replacements.push({
      field: token === "<year>" ? "years" : "name",
      start,
      end: start + token.length
    });
  }
  const sha = crypto.createHash("sha256").update(licenseText).digest("hex");
  const dataUrl = `data:text/plain,${encodeURIComponent(licenseText)}`;
  const dataPath = path.join(tempDir, "licenses.json");
  fs.writeFileSync(
    dataPath,
    JSON.stringify(
      [
        {
          spdx: "MIT",
          name: "MIT License",
          url: dataUrl,
          sha256: sha,
          template: {
            fields: ["years", "name"],
            replacements
          }
        }
      ],
      null,
      2
    ) + "\n"
  );

  const result = await runCli(
    ["--license", "MIT", "--yes", "--name", "Jane Doe", "--years", "2024", "--json"],
    tempDir,
    { NICELICENSE_DATA: dataPath }
  );
  assert.equal(result.code, 0, result.stderr);
  const parsed = JSON.parse(result.stdout);
  assert.equal(parsed.status, "written");
  assert.equal(parsed.spdx, "MIT");
  assert.match(parsed.path, /LICENSE$/);
});

test("cli --json reports existing license without validation", async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "nicelicense-json-existing-"));
  const licensePath = path.join(tempDir, "LICENSE");
  fs.writeFileSync(licensePath, "Existing license text\n");

  const result = await runCli(["--json"], tempDir, {});
  assert.equal(result.code, 0, result.stderr);
  const parsed = JSON.parse(result.stdout);
  assert.equal(parsed.status, "existing");
  assert.equal(parsed.path, licensePath);
});

test("cli overwrites existing LICENSE when --yes is set", async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "nicelicense-overwrite-"));
  const licenseText =
    "MIT License\n\nCopyright (c) <year> <copyright holders>\n\nPermission is hereby granted.";
  const replacements = [];
  for (const token of ["<year>", "<copyright holders>"]) {
    const start = licenseText.indexOf(token);
    replacements.push({
      field: token === "<year>" ? "years" : "name",
      start,
      end: start + token.length
    });
  }
  const sha = crypto.createHash("sha256").update(licenseText).digest("hex");
  const dataUrl = `data:text/plain,${encodeURIComponent(licenseText)}`;
  const dataPath = path.join(tempDir, "licenses.json");
  fs.writeFileSync(
    dataPath,
    JSON.stringify(
      [
        {
          spdx: "MIT",
          name: "MIT License",
          url: dataUrl,
          sha256: sha,
          template: {
            fields: ["years", "name"],
            replacements
          }
        }
      ],
      null,
      2
    ) + "\n"
  );

  const existingPath = path.join(tempDir, "LICENSE");
  fs.writeFileSync(existingPath, "Old license text\n");

  const result = await runCli(
    ["--license", "MIT", "--yes", "--name", "Jane Doe", "--years", "2024"],
    tempDir,
    { NICELICENSE_DATA: dataPath }
  );
  assert.equal(result.code, 0, result.stderr);

  const licenseOutput = fs.readFileSync(existingPath, "utf8");
  assert.match(licenseOutput, /Copyright \(c\) 2024 Jane Doe/);
});

test("cli fails on fingerprint mismatch", async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "nicelicense-fingerprint-"));
  const licenseText = "Sample license text";
  const dataUrl = `data:text/plain,${encodeURIComponent(licenseText)}`;
  const dataPath = path.join(tempDir, "licenses.json");
  fs.writeFileSync(
    dataPath,
    JSON.stringify(
      [
        {
          spdx: "MIT",
          name: "MIT License",
          url: dataUrl,
          sha256: "deadbeef"
        }
      ],
      null,
      2
    ) + "\n"
  );

  const result = await runCli(["--license", "MIT", "--yes"], tempDir, {
    NICELICENSE_DATA: dataPath
  });
  assert.notEqual(result.code, 0);
  assert.match(result.stderr, /Fingerprint mismatch/);
});

test("cli writes to nested --path directories", async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "nicelicense-path-"));
  const licenseText = "MIT License\n\nCopyright (c) <year> <copyright holders>";
  const replacements = [];
  for (const token of ["<year>", "<copyright holders>"]) {
    const start = licenseText.indexOf(token);
    replacements.push({
      field: token === "<year>" ? "years" : "name",
      start,
      end: start + token.length
    });
  }
  const sha = crypto.createHash("sha256").update(licenseText).digest("hex");
  const dataUrl = `data:text/plain,${encodeURIComponent(licenseText)}`;
  const dataPath = path.join(tempDir, "licenses.json");
  fs.writeFileSync(
    dataPath,
    JSON.stringify(
      [
        {
          spdx: "MIT",
          name: "MIT License",
          url: dataUrl,
          sha256: sha,
          template: {
            fields: ["years", "name"],
            replacements
          }
        }
      ],
      null,
      2
    ) + "\n"
  );

  const targetPath = path.join("licenses", "third-party", "LICENSE");
  const result = await runCli(
    ["--license", "MIT", "--yes", "--name", "Jane Doe", "--years", "2024", "--path", targetPath],
    tempDir,
    { NICELICENSE_DATA: dataPath }
  );
  assert.equal(result.code, 0, result.stderr);

  const resolved = path.join(tempDir, targetPath);
  const licenseOutput = fs.readFileSync(resolved, "utf8");
  assert.match(licenseOutput, /Copyright \(c\) 2024 Jane Doe/);
});

test("cli reports unknown SPDX from custom data file", async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "nicelicense-unknown-"));
  const dataPath = path.join(tempDir, "licenses.json");
  fs.writeFileSync(
    dataPath,
    JSON.stringify(
      [{ spdx: "MIT", name: "MIT License", url: "https://example.com/mit" }],
      null,
      2
    ) + "\n"
  );

  const result = await runCli(["--license", "Apache-2.0", "--yes"], tempDir, {
    NICELICENSE_DATA: dataPath
  });
  assert.notEqual(result.code, 0);
  assert.match(result.stderr, /Unknown license/);
});
