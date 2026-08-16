import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import test from "node:test";
import pinestraw from "../dist/index.js";
import { buildFixtureProject } from "./support/build-fixture-project.mjs";
import { createFixtureProject } from "./support/create-fixture-project.mjs";
import { readBuildOutput } from "./support/read-build-output.mjs";

test("externalizes dependencies and injects an esm.sh import map", async () => {
  const projectRoot = await createFixtureProject();

  try {
    await buildFixtureProject(projectRoot);
    const { html, javascript, stylesheet } = await readBuildOutput(projectRoot);

    assert.match(html, /<script type="importmap" id="pinestraw-imports">/);
    assert.match(
      html,
      /"react":\s*"https:\/\/esm\.sh\/preact@\^10\.0\.0\/compat"/,
    );
    assert.match(
      html,
      /"preact\/hooks":\s*"https:\/\/esm\.sh\/preact@\^10\.0\.0\/hooks"/,
    );
    assert.doesNotMatch(html, /preact@\^10\.0\.0\/hooks\?external/);
    assert.match(
      html,
      /react-loading-skeleton@3\.5\.0\?standalone&external=preact,react,react-dom/,
    );
    assert.match(
      html,
      /"react-dom":\s*"https:\/\/esm\.sh\/react-dom@\^19\.1\.1\?standalone&external=preact,react,react-dom"/,
    );
    assert.match(javascript, /from["']react["']/);
    assert.match(javascript, /from["']react-dom\/client["']/);
    assert.match(javascript, /from["']preact\/hooks["']/);
    assert.doesNotMatch(javascript, /skeleton\.css/);
    assert.match(stylesheet, /\.skeleton\{color:red\}/);
  } finally {
    await rm(projectRoot, { recursive: true, force: true });
  }
});

test("only externalizes package names in include", async () => {
  const projectRoot = await createFixtureProject();

  try {
    const plugin = pinestraw({ include: ["preact"] });
    const configured = plugin.config({ root: projectRoot });
    const external = configured.build.rollupOptions.external;

    assert.equal(external("preact", undefined, false), true);
    assert.equal(external("preact/hooks", undefined, false), true);
    assert.equal(external("react-dom/client", undefined, false), false);
    assert.equal(external("react-loading-skeleton", undefined, false), false);
  } finally {
    await rm(projectRoot, { recursive: true, force: true });
  }
});
