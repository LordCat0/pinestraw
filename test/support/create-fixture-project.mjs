import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

export async function createFixtureProject() {
  const projectRoot = await mkdtemp(join(tmpdir(), "pinestraw-"));

  await writeFile(
    join(projectRoot, "package.json"),
    JSON.stringify({
      type: "module",
      dependencies: {
        preact: "^10.0.0",
        "react-loading-skeleton": "^3.5.0",
      },
    }),
  );
  await writeFile(
    join(projectRoot, "index.html"),
    '<main id="app"></main><script type="module" src="/main.js"></script>',
  );
  await writeFile(
    join(projectRoot, "main.js"),
    [
      'import React from "react";',
      'import { useState } from "preact/hooks";',
      'import Skeleton from "react-loading-skeleton";',
      'import "react-loading-skeleton/dist/skeleton.css";',
      "console.log(React, useState, Skeleton);",
    ].join(" "),
  );

  const skeletonPackageRoot = join(
    projectRoot,
    "node_modules/react-loading-skeleton",
  );
  await mkdir(join(skeletonPackageRoot, "dist"), { recursive: true });
  await writeFile(
    join(skeletonPackageRoot, "package.json"),
    JSON.stringify({ name: "react-loading-skeleton", version: "3.5.0" }),
  );
  await writeFile(
    join(skeletonPackageRoot, "dist/skeleton.css"),
    ".skeleton { color: red; }",
  );

  return projectRoot;
}
