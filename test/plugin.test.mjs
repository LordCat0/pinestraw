import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { build } from "vite";
import pinestraw from "../dist/index.js";

test("externalizes dependencies and injects an esm.sh import map", async () => {
  const root = await mkdtemp(join(tmpdir(), "pinestraw-"));
  await writeFile(
    join(root, "package.json"),
    JSON.stringify({
      type: "module",
      dependencies: {
        preact: "^10.0.0",
        "react-loading-skeleton": "^3.5.0",
      },
    }),
  );
  await writeFile(
    join(root, "index.html"),
    '<main id="app"></main><script type="module" src="/main.js"></script>',
  );

  // Real example from one of my projects I tested it on
  await writeFile(
    join(root, "main.js"),
    'import React from "react"; import { useState } from "preact/hooks"; import Skeleton from "react-loading-skeleton"; import "react-loading-skeleton/dist/skeleton.css"; console.log(React, useState, Skeleton);',
  );
  const skeletonRoot = join(root, "node_modules/react-loading-skeleton");
  await mkdir(join(skeletonRoot, "dist"), { recursive: true });
  await writeFile(
    join(skeletonRoot, "package.json"),
    JSON.stringify({ name: "react-loading-skeleton", version: "3.5.0" }),
  );
  await writeFile(join(skeletonRoot, "dist/skeleton.css"), ".skeleton { color: red; }");

  const previousDirectory = process.cwd();
  try {
    process.chdir(root);
    await build({
      root: ".",
      configFile: false,
      logLevel: "silent",
      resolve: { alias: { react: "preact/compat" } },
      plugins: [pinestraw()],
    });
  } finally {
    process.chdir(previousDirectory);
  }

  const html = await readFile(join(root, "dist/index.html"), "utf8");
  const assets = await readdir(join(root, "dist/assets"));
  const js = await readFile(join(root, "dist/assets", assets.find((file) => file.endsWith(".js"))), "utf8");
  const css = await readFile(
    join(root, "dist/assets", assets.find((file) => file.endsWith(".css"))),
    "utf8",
  );

  assert.match(html, /<script type="importmap" id="pinestraw-imports">/);
  assert.match(html, /"react":\s*"https:\/\/esm\.sh\/preact@\^10\.0\.0\/compat"/);
  assert.match(html, /"preact\/hooks":\s*"https:\/\/esm\.sh\/preact@\^10\.0\.0\/hooks"/);
  assert.doesNotMatch(html, /preact@\^10\.0\.0\/hooks\?external/);
  assert.match(
    html,
    /react-loading-skeleton@3\.5\.0\?standalone&external=preact,react/,
  );
  assert.match(js, /from["']react["']/);
  assert.match(js, /from["']preact\/hooks["']/);
  assert.doesNotMatch(js, /skeleton\.css/);
  assert.match(css, /\.skeleton\{color:red\}/);

  await rm(root, { recursive: true, force: true });
});
