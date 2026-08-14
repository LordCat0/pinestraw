import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import type { PackageManifest } from './types.js';

export function findPackageJson(startDirectory: string): string {
  let currentDirectory = resolve(startDirectory);

  while (true) {
    const manifestPath = join(currentDirectory, 'package.json');
    if (existsSync(manifestPath)) return manifestPath;

    const parentDirectory = dirname(currentDirectory);
    if (parentDirectory === currentDirectory) {
      throw new Error(
        `[pinestraw] Could not find package.json from ${startDirectory}`
      );
    }

    currentDirectory = parentDirectory;
  }
}

export function readPackageManifest(manifestPath: string): PackageManifest {
  return JSON.parse(readFileSync(manifestPath, 'utf8')) as PackageManifest;
}

export function resolvePackageVersion(
  projectRoot: string,
  packageName: string,
  declaredVersion: string
): string {
  // Prefer a lockfile-installed version so the browser runs the same dependency
  // that the application was developed and tested against.
  const packageManifestPath = join(
    projectRoot,
    'node_modules',
    ...packageName.split('/'),
    'package.json'
  );

  if (existsSync(packageManifestPath)) {
    const installedPackage = JSON.parse(
      readFileSync(packageManifestPath, 'utf8')
    ) as { version?: string };

    if (installedPackage.version) return installedPackage.version;
  }

  // npm aliases and local/workspace dependencies are not valid esm.sh versions.
  if (
    /^(?:file:|link:|workspace:|git(?:\+|:)|https?:|npm:)/.test(declaredVersion)
  ) {
    throw new Error(
      `[pinestraw] Cannot create an esm.sh URL for ${packageName}@${declaredVersion}. ` +
        'Install it in node_modules or exclude it.'
    );
  }

  return declaredVersion;
}

export function createPackageUrls(
  projectRoot: string,
  dependencies: Readonly<Record<string, string>>,
  cdnBaseUrl: string
): Map<string, string> {
  const packageUrls = new Map<string, string>();

  for (const packageName of Object.keys(dependencies).sort()) {
    const declaredVersion = dependencies[packageName]!;
    const resolvedVersion = resolvePackageVersion(
      projectRoot,
      packageName,
      declaredVersion
    );
    packageUrls.set(
      packageName,
      `${cdnBaseUrl}/${packageName}@${resolvedVersion}`
    );
  }

  return packageUrls;
}
