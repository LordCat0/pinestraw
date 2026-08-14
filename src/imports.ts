import type { ExternalOption, PackageAlias } from "./types.js";

const bareImportPattern = /^(?![./]|[a-zA-Z][a-zA-Z\d+.-]*:)(@[^/]+\/[^/]+|[^/]+)/;
const stylesheetPattern = /\.(?:css|less|sass|scss|styl|stylus|pcss|postcss)$/i;

export function getPackageName(importSpecifier: string): string | undefined {
  return bareImportPattern.exec(importSpecifier)?.[1];
}

export function isStylesheetImport(importSpecifier: string): boolean {
  const pathWithoutQuery = importSpecifier.split(/[?#]/, 1)[0] ?? importSpecifier;
  return stylesheetPattern.test(pathWithoutQuery);
}

export function applyAliases(
  importSpecifier: string,
  aliases: readonly PackageAlias[],
): string {
  for (const alias of aliases) {
    if (
      importSpecifier === alias.find ||
      importSpecifier.startsWith(`${alias.find}/`)
    ) {
      return `${alias.replacement}${importSpecifier.slice(alias.find.length)}`;
    }
  }

  return importSpecifier;
}

export function matchesExternal(
  externalOption: ExternalOption | undefined,
  importId: string,
): boolean {
  if (!externalOption) return false;

  if (typeof externalOption === "function") {
    return Boolean(externalOption(importId, undefined, false));
  }

  const entries = Array.isArray(externalOption)
    ? externalOption
    : [externalOption];

  return entries.some((entry) =>
    typeof entry === "string" ? entry === importId : entry.test(importId),
  );
}
