"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const path = require("node:path");

const {
  applyTemplate,
  downloadLicense,
  parseArgs,
  resolveOutputPath,
  validateExistingLicense
} = require("../dist/nicelicense.js");

test("parseArgs parses flags and values", () => {
  const args = [
    "--license",
    "MIT",
    "--yes",
    "--json",
    "--verbose",
    "--path",
    "LICENSE.txt",
    "--name",
    "Jane Doe",
    "--email=jane@example.com",
    "--years",
    "2024",
    "--software",
    "MyApp",
    "--description",
    "Hello",
    "--organization",
    "Acme",
    "--list"
  ];
  const options = parseArgs(args);
  assert.equal(options.license, "MIT");
  assert.equal(options.yes, true);
  assert.equal(options.json, true);
  assert.equal(options.verbose, true);
  assert.equal(options.path, "LICENSE.txt");
  assert.equal(options.name, "Jane Doe");
  assert.equal(options.email, "jane@example.com");
  assert.equal(options.years, "2024");
  assert.equal(options.software, "MyApp");
  assert.equal(options.description, "Hello");
  assert.equal(options.organization, "Acme");
  assert.equal(options.list, true);
});

test("applyTemplate replaces offsets", () => {
  const text = "Copyright (c) <year> <owner>";
  const yearStart = text.indexOf("<year>");
  const ownerStart = text.indexOf("<owner>");
  const license = {
    spdx: "MIT",
    name: "MIT License",
    url: "https://example.com/mit",
    template: {
      fields: ["years", "name"],
      replacements: [
        { field: "years", start: yearStart, end: yearStart + "<year>".length },
        { field: "name", start: ownerStart, end: ownerStart + "<owner>".length }
      ]
    }
  };
  const result = applyTemplate(text, license, { years: "2024", name: "Jane Doe" });
  assert.equal(result, "Copyright (c) 2024 Jane Doe");
});

test("downloadLicense enforces sha256 fingerprint", async () => {
  const originalFetch = global.fetch;
  const text = "license text";
  const hash = crypto.createHash("sha256").update(text).digest("hex");
  global.fetch = async () => ({
    ok: true,
    status: 200,
    statusText: "OK",
    text: async () => text
  });

  try {
    await assert.rejects(
      downloadLicense({ spdx: "MIT", name: "MIT", url: "x", sha256: "bad" }),
      /Fingerprint mismatch/
    );

    const ok = await downloadLicense({ spdx: "MIT", name: "MIT", url: "x", sha256: hash });
    assert.equal(ok, text);
  } finally {
    global.fetch = originalFetch;
  }
});

test("validateExistingLicense matches template placeholders", async () => {
  const originalFetch = global.fetch;
  const template = "Copyright (c) <year> <owner>";
  const sha = crypto.createHash("sha256").update(template).digest("hex");
  global.fetch = async () => ({
    ok: true,
    status: 200,
    statusText: "OK",
    text: async () => template
  });

  try {
    const existing = {
      filePath: "/tmp/LICENSE",
      filename: "LICENSE",
      text: "Copyright (c) 2024 Jane Doe"
    };
    const licenses = [
      {
        spdx: "BSD-2-Clause",
        name: "BSD 2-Clause License",
        url: "https://example.com/bsd-2",
        sha256: sha
      }
    ];
    const result = await validateExistingLicense(existing, licenses);
    assert.equal(result.match?.spdx, "BSD-2-Clause");
  } finally {
    global.fetch = originalFetch;
  }
});

test("resolveOutputPath uses default LICENSE when --yes", async () => {
  const cwd = "/tmp";
  const output = await resolveOutputPath(cwd, null, { yes: true, help: false, list: false });
  assert.equal(output, path.join(cwd, "LICENSE"));
});
