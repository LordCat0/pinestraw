import { dirname, resolve } from 'node:path';
import type { Plugin } from 'vite';
import { createImportMapTag } from './import-map.js';
import {
  applyAliases,
  getPackageName,
  isStylesheetImport,
  matchesExternal
} from './imports.js';
import {
  createPackageUrls,
  findPackageJson,
  readPackageManifest
} from './package-manifest.js';
import type { PackageAlias, PinestrawOptions } from './types.js';

export type { PinestrawOptions } from './types.js';

/**
 * Keeps application dependencies out of Vite's output and resolves them in the
 * browser through an import map backed by esm.sh.
 */
export default function pinestraw(options: PinestrawOptions = {}): Plugin {
  let externalPackageNames = new Set<string>();
  let packageUrls = new Map<string, string>();
  let aliases: PackageAlias[] = [];
  let aliasTargetNames = new Set<string>();
  let dependencyQuery = '?standalone';
  const usedImportSpecifiers = new Set<string>();

  return {
    name: 'pinestraw',
    apply: 'build',
    enforce: 'pre',

    config(config) {
      const projectRoot = resolveProjectRoot(config.root);
      const manifestPath = findPackageJson(projectRoot);
      const manifest = readPackageManifest(manifestPath);
      const declaredDependencies = {
        ...manifest.dependencies,
        ...(options.peerDependencies ? manifest.peerDependencies : {}),
        ...options.include
      };
      const excludedPackageNames = new Set(options.exclude ?? []);
      const externalDependencies = Object.fromEntries(
        Object.entries(declaredDependencies).filter(
          ([packageName]) => !excludedPackageNames.has(packageName)
        )
      );

      externalPackageNames = new Set(Object.keys(externalDependencies));

      const cdnBaseUrl = (options.cdn ?? 'https://esm.sh').replace(/\/$/, '');
      packageUrls = createPackageUrls(
        dirname(manifestPath),
        externalDependencies,
        cdnBaseUrl
      );
      usedImportSpecifiers.clear();

      const existingExternalOption = config.build?.rollupOptions?.external;
      return {
        build: {
          rollupOptions: {
            external(
              importId: string,
              importer: string | undefined,
              isResolved: boolean
            ) {
              const dependencyName = getPackageName(
                applyAliases(importId, aliases)
              );

              if (
                dependencyName &&
                externalPackageNames.has(dependencyName) &&
                !isStylesheetImport(importId)
              ) {
                usedImportSpecifiers.add(importId);
                return true;
              }

              if (typeof existingExternalOption === 'function') {
                return existingExternalOption(importId, importer, isResolved);
              }

              return matchesExternal(existingExternalOption, importId);
            }
          }
        }
      };
    },

    configResolved(config) {
      aliases = config.resolve.alias.flatMap((alias) =>
        typeof alias.find === 'string' &&
        typeof alias.replacement === 'string' &&
        getPackageName(alias.replacement) &&
        externalPackageNames.has(getPackageName(alias.replacement)!)
          ? [{ find: alias.find, replacement: alias.replacement }]
          : []
      );

      aliasTargetNames = new Set(
        aliases.map(({ replacement }) => getPackageName(replacement)!)
      );

      const externalDependencyNames = new Set<string>();
      for (const alias of aliases) {
        const aliasName = getPackageName(alias.find);
        const targetName = getPackageName(alias.replacement);
        if (aliasName) externalDependencyNames.add(aliasName);
        if (targetName) externalDependencyNames.add(targetName);
      }

      // todo: unhardcode these
      for (const singletonName of ['react', 'react-dom']) {
        if (externalPackageNames.has(singletonName)) {
          externalDependencyNames.add(singletonName);
        }
      }

      dependencyQuery = externalDependencyNames.size
        ? `?standalone&external=${[...externalDependencyNames].sort().join(',')}`
        : '?standalone';
    },

    transformIndexHtml: {
      order: 'post',
      handler() {
        return createImportMapTag({
          usedSpecifiers: usedImportSpecifiers,
          packageUrls,
          aliases,
          aliasTargets: aliasTargetNames,
          dependencyQuery
        });
      }
    }
  };
}

function resolveProjectRoot(configuredRoot: string | undefined): string {
  return resolve(configuredRoot ?? process.cwd());
}

export { pinestraw };
