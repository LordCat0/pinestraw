import { build } from "vite";
import pinestraw from "../../dist/index.js";

export async function buildFixtureProject(projectRoot, options = {}) {
  const previousWorkingDirectory = process.cwd();

  try {
    process.chdir(projectRoot);
    await build({
      root: ".",
      configFile: false,
      logLevel: "silent",
      resolve: { alias: { react: "preact/compat" } },
      plugins: [pinestraw(options)],
    });
  } finally {
    process.chdir(previousWorkingDirectory);
  }
}
