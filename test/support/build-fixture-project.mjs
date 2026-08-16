import { build } from "vite";
import pinestraw from "../../dist/index.js";

export async function buildFixtureProject(projectRoot) {
  const previousWorkingDirectory = process.cwd();

  try {
    process.chdir(projectRoot);
    await build({
      root: ".",
      configFile: false,
      logLevel: "silent",
      resolve: { alias: { react: "preact/compat" } },
      plugins: [pinestraw()],
    });
  } finally {
    process.chdir(previousWorkingDirectory);
  }
}
