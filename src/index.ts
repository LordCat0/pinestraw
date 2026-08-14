import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import type { Plugin } from "vite";

export interface PinestrawOptions {
  /** Packages to add in addition to the app's dependencies. Values are versions. */
  include?: Record<string, string>;
  /** Package names which should still be bundled by Vite. */
  exclude?: string[];
  /** Also serve peer dependencies from esm.sh. Defaults to false. */
  peerDependencies?: boolean;
  /** Base URL of an esm.sh instance. */
  cdn?: string;
}

interface PackageJson {
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

interface PackageAlias {
  find: string;
  replacement: string;
}

type ExternalOption =
  | string
  | RegExp
  | readonly (string | RegExp)[]
  | ((id: string, importer: string | undefined, isResolved: boolean) => boolean | null | undefined);

const bareImport = /^(?![./]|[a-zA-Z][a-zA-Z\d+.-]*:)(@[^/]+\/[^/]+|[^/]+)/;
const stylesheetImport = /\.(?:css|less|sass|scss|styl|stylus|pcss|postcss)$/i;

function packageName(id: string): string | undefined {
  return bareImport.exec(id)?.[1];
}

function isStylesheetImport(id: string): boolean {
  return stylesheetImport.test(id.split(/[?#]/, 1)[0] ?? id);
}

function applyAliases(specifier: string, aliases: PackageAlias[]): string {
  for (const alias of aliases) {
    if (specifier === alias.find || specifier.startsWith(`${alias.find}/`)) {
      return `${alias.replacement}${specifier.slice(alias.find.length)}`;
    }
  }
  return specifier;
}

function findPackageJson(start: string): string {
  let directory = resolve(start);

  while (true) {
    const candidate = join(directory, "package.json");
    if (existsSync(candidate)) return candidate;
    const parent = dirname(directory);
    if (parent === directory) {
      throw new Error(`[pinestraw] Could not find package.json from ${start}`);
    }
    directory = parent;
  }
}

function readManifest(path: string): PackageJson {
  return JSON.parse(readFileSync(path, "utf8")) as PackageJson;
}

function resolvedVersion(root: string, name: string, declared: string): string {
  // Prefer a lockfile-installed version so the browser runs the same dependency
  // that the application was developed and tested against.
  const packagePath = join(root, "node_modules", ...name.split("/"), "package.json");
  if (existsSync(packagePath)) {
    const installed = JSON.parse(readFileSync(packagePath, "utf8")) as { version?: string };
    if (installed.version) return installed.version;
  }

  // npm aliases and local/workspace dependencies are not valid esm.sh versions.
  if (/^(?:file:|link:|workspace:|git(?:\+|:)|https?:|npm:)/.test(declared)) {
    throw new Error(
      `[pinestraw] Cannot create an esm.sh URL for ${name}@${declared}. ` +
        "Install it in node_modules or exclude it.",
    );
  }
  return declared;
}

function matchesExternal(option: ExternalOption | undefined, id: string): boolean {
  if (!option) return false;
  if (typeof option === "function") return Boolean(option(id, undefined, false));
  const entries = Array.isArray(option) ? option : [option];
  return entries.some((entry) =>
    typeof entry === "string" ? entry === id : entry.test(id),
  );
}

/**
 * Keeps application dependencies out of Vite's output and resolves them in the
 * browser through an import map backed by esm.sh.
 */
export default function pinestraw(options: PinestrawOptions = {}): Plugin {
  let externalPackages = new Set<string>();
  let packageUrls = new Map<string, string>();
  let aliases: PackageAlias[] = [];
  let aliasTargets = new Set<string>();
  let externalQuery = "";
  const usedSpecifiers = new Set<string>();

  return {
    name: "pinestraw",
    apply: "build",
    enforce: "pre",

    config(config) {
      const root = resolve(config.root ?? process.cwd());
      const manifestPath = findPackageJson(root);
      const manifest = readManifest(manifestPath);
      const declared = {
        ...manifest.dependencies,
        ...(options.peerDependencies ? manifest.peerDependencies : {}),
        ...options.include,
      };
      const excluded = new Set(options.exclude ?? []);
      externalPackages = new Set(
        Object.keys(declared).filter((name) => !excluded.has(name)),
      );

      const cdn = (options.cdn ?? "https://esm.sh").replace(/\/$/, "");
      packageUrls = new Map();
      usedSpecifiers.clear();
      for (const name of [...externalPackages].sort()) {
        const version = resolvedVersion(dirname(manifestPath), name, declared[name]!);
        packageUrls.set(name, `${cdn}/${name}@${version}`);
      }

      const existing = config.build?.rollupOptions?.external;
      return {
        build: {
          rollupOptions: {
            external(id: string, importer: string | undefined, isResolved: boolean) {
              const dependency = packageName(applyAliases(id, aliases));
              if (
                dependency &&
                externalPackages.has(dependency) &&
                !isStylesheetImport(id)
              ) {
                usedSpecifiers.add(id);
                return true;
              }
              if (typeof existing === "function") {
                return existing(id, importer, isResolved);
              }
              return matchesExternal(existing, id);
            },
          },
        },
      };
    },

    configResolved(config) {
      aliases = config.resolve.alias.flatMap((alias) =>
        typeof alias.find === "string" &&
        packageName(alias.replacement) &&
        externalPackages.has(packageName(alias.replacement)!)
          ? [{ find: alias.find, replacement: alias.replacement }]
          : [],
      );
      aliasTargets = new Set(aliases.map(({ replacement }) => packageName(replacement)!));
      const externalNames = new Set(
        aliases.flatMap(({ find, replacement }) => [packageName(find), packageName(replacement)]),
      );
      for (const singleton of ["react", "react-dom"]) {
        if (externalPackages.has(singleton)) externalNames.add(singleton);
      }
      externalNames.delete(undefined);
      externalQuery = externalNames.size
        ? `?external=${[...externalNames].sort().join(",")}`
        : "";
    },

    transformIndexHtml: {
      order: "post",
      handler() {
        const imports: Record<string, string> = {};
        for (const specifier of [...usedSpecifiers].sort()) {
          const target = applyAliases(specifier, aliases);
          const targetPackage = packageName(target);
          const baseUrl = targetPackage && packageUrls.get(targetPackage);
          if (!targetPackage || !baseUrl) continue;
          imports[specifier] = `${baseUrl}${target.slice(targetPackage.length)}${
            aliasTargets.has(targetPackage) ? "" : externalQuery
          }`;
        }
        for (const { find, replacement } of aliases) {
          const targetPackage = packageName(replacement)!;
          const baseUrl = packageUrls.get(targetPackage)!;
          const targetUrl = `${baseUrl}${replacement.slice(targetPackage.length)}`;
          imports[targetPackage] ??= baseUrl;
          imports[`${targetPackage}/`] ??= `${baseUrl}/`;
          imports[find] = targetUrl;
          imports[`${find}/`] = `${targetUrl}/`;
        }
        if (Object.keys(imports).length === 0) return [];
        return [
          {
            tag: "script",
            attrs: { type: "importmap", id: "pinestraw-imports" },
            children: JSON.stringify({ imports }, null, 2),
            injectTo: "head-prepend",
          },
        ];
      },
    },
  };
}

export { pinestraw };
