import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

export async function readBuildOutput(projectRoot) {
  const distributionRoot = join(projectRoot, "dist");
  const assetNames = await readdir(join(distributionRoot, "assets"));
  const javascriptAssetName = assetNames.find((name) => name.endsWith(".js"));
  const stylesheetAssetName = assetNames.find((name) => name.endsWith(".css"));

  if (!javascriptAssetName || !stylesheetAssetName) {
    throw new Error("Expected JavaScript and stylesheet build assets.");
  }

  return {
    html: await readFile(join(distributionRoot, "index.html"), "utf8"),
    javascript: await readFile(
      join(distributionRoot, "assets", javascriptAssetName),
      "utf8",
    ),
    stylesheet: await readFile(
      join(distributionRoot, "assets", stylesheetAssetName),
      "utf8",
    ),
  };
}
