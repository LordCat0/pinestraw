export interface PinestrawOptions {
  /** Package names to serve from esm.sh. Defaults to all app dependencies. */
  include?: string[];
  /** Package names which should still be bundled by Vite. */
  exclude?: string[];
  /** Also serve peer dependencies from esm.sh. Defaults to false. */
  peerDependencies?: boolean;
  /** Base URL of an esm.sh instance. */
  cdn?: string;
}

export interface PackageManifest {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

export interface PackageAlias {
  find: string;
  replacement: string;
}

export type ExternalOption =
  | string
  | RegExp
  | readonly (string | RegExp)[]
  | ((
      id: string,
      importer: string | undefined,
      isResolved: boolean
    ) => boolean | null | undefined);
