"use strict";

const fs = require("fs");
const path = require("path");

const target = path.join(__dirname, "..", "dist", "nicelicense.js");
const shebang = "#!/usr/bin/env node\n";

const content = fs.readFileSync(target, "utf8");
if (!content.startsWith(shebang)) {
  fs.writeFileSync(target, shebang + content);
}
