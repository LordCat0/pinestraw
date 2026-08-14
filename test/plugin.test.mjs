import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { build } from "vite";
import pinestraw from "../dist/index.js";

test("externalizes dependencies and injects an esm.sh import map", async () => {
  const root = await mkdtemp(join(tmpdir(), "pinestraw-"));
  await writeFile(
    join(root, "package.json"),
    JSON.stringify({ type: "module", dependencies: { react: "^19.0.0" } }),
  );
  await writeFile(
    join(root, "index.html"),
    '<main id="app"></main><script type="module" src="/main.js"></script>',
  );
  await writeFile(join(root, "main.js"), 'import React from "react"; console.log(React);');

  const previousDirectory = process.cwd();
  try {
    process.chdir(root);
    await build({ root: ".", configFile: false, logLevel: "silent", plugins: [pinestraw()] });
  } finally {
    process.chdir(previousDirectory);
  }

  const html = await readFile(join(root, "dist/index.html"), "utf8");
  const assets = await readdir(join(root, "dist/assets"));
  const js = await readFile(join(root, "dist/assets", assets.find((file) => file.endsWith(".js"))), "utf8");

  assert.match(html, /<script type="importmap">/);
  assert.match(html, /"react":\s*"https:\/\/esm\.sh\/react@\^19\.0\.0"/);
  assert.match(html, /"react\/":\s*"https:\/\/esm\.sh\/react@\^19\.0\.0\/"/);
  assert.match(js, /from["']react["']/);

  await rm(root, { recursive: true, force: true });
});
