"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const path = require("node:path");

const {
  applyTemplate,
  downloadLicense,
  identifyLicense,
  parseArgs,
  resolveOutputPath
} = require("../dist/nicelicense.js");

test("parseArgs parses flags and values", () => {
  const args = [
    "--license",
    "MIT",
    "--dry-run",
    "--stdout",
    "--validate",
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
  assert.equal(options.dryRun, true);
  assert.equal(options.stdout, true);
  assert.equal(options.validate, true);
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

test("identifyLicense matches fingerprints", () => {
  const existing = {
    filePath: "/tmp/LICENSE",
    filename: "LICENSE",
    text: "Permission is hereby granted, free of charge, to any person obtaining a copy of this software. THE SOFTWARE IS PROVIDED \"AS IS\", WITHOUT WARRANTY OF ANY KIND."
  };
  const licenses = [
    {
      spdx: "MIT",
      name: "MIT License",
      url: "https://example.com/mit",
      fingerprints: [
        "Permission is hereby granted, free of charge",
        "THE SOFTWARE IS PROVIDED \"AS IS\", WITHOUT WARRANTY OF ANY KIND"
      ]
    },
    {
      spdx: "BSD-2-Clause",
      name: "BSD 2-Clause License",
      url: "https://example.com/bsd-2",
      fingerprints: [
        "Redistribution and use in source and binary forms"
      ]
    }
  ];
  const result = identifyLicense(existing, licenses);
  assert.equal(result.license.spdx, "MIT");
  assert.equal(result.confidence, 1.0);
  assert.equal(result.matchedFingerprints, 2);
});

test("resolveOutputPath uses default LICENSE when --yes", async () => {
  const cwd = "/tmp";
  const output = await resolveOutputPath(
    cwd,
    null,
    { yes: true, help: false, list: false, dryRun: false, stdout: false, validate: false },
    false
  );
  assert.equal(output, path.join(cwd, "LICENSE"));
});

test("resolveOutputPath requires path in non-interactive mode", async () => {
  const cwd = "/tmp";
  await assert.rejects(
    () =>
      resolveOutputPath(
        cwd,
        null,
        { yes: false, help: false, list: false, dryRun: false, stdout: false, validate: false },
        true
      ),
    /Output path is required/
  );
});
