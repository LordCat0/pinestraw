import { applyAliases, getPackageName } from "./imports.js";
import type { PackageAlias } from "./types.js";

interface ImportMapOptions {
  usedSpecifiers: ReadonlySet<string>;
  packageUrls: ReadonlyMap<string, string>;
  aliases: readonly PackageAlias[];
  aliasTargets: ReadonlySet<string>;
  dependencyQuery: string;
}

export function createImportMapTag({
  usedSpecifiers,
  packageUrls,
  aliases,
  aliasTargets,
  dependencyQuery,
}: ImportMapOptions) {
  const imports: Record<string, string> = {};

  for (const importSpecifier of [...usedSpecifiers].sort()) {
    const aliasedSpecifier = applyAliases(importSpecifier, aliases);
    const targetPackageName = getPackageName(aliasedSpecifier);
    const packageUrl = targetPackageName
      ? packageUrls.get(targetPackageName)
      : undefined;

    if (!targetPackageName || !packageUrl) {
      continue;
    }

    const subpath = aliasedSpecifier.slice(targetPackageName.length);
    const query = aliasTargets.has(targetPackageName)
      ? ""
      : dependencyQuery;
    imports[importSpecifier] = `${packageUrl}${subpath}${query}`;
  }

  for (const alias of aliases) {
    const targetPackageName = getPackageName(alias.replacement)!;
    const packageUrl = packageUrls.get(targetPackageName)!;
    const replacementSubpath = alias.replacement.slice(
      targetPackageName.length,
    );
    const targetUrl = `${packageUrl}${replacementSubpath}`;

    imports[targetPackageName] ??= packageUrl;
    imports[`${targetPackageName}/`] ??= `${packageUrl}/`;
    imports[alias.find] = targetUrl;
    imports[`${alias.find}/`] = `${targetUrl}/`;
  }

  if (Object.keys(imports).length === 0) {
    return [];
  }

  return [
    {
      tag: "script" as const,
      attrs: { type: "importmap", id: "pinestraw-imports" },
      children: JSON.stringify({ imports }, null, 2),
      injectTo: "head-prepend" as const,
    },
  ];
}
