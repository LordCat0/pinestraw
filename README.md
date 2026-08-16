# pinestraw

A Vite plugin that keeps application dependencies out of your JavaScript bundle
and loads them from [esm.sh](https://esm.sh/) using an HTML import map.

```sh
npm install --save-dev pinestraw
```

```ts
// vite.config.ts
import { defineConfig } from "vite";
import pinestraw from "pinestraw";

export default defineConfig({
  plugins: [pinestraw()],
});
```

Given `react` in `dependencies`, a production build contains mappings like:

```html
<script type="importmap">
  {
    "imports": {
      "react": "https://esm.sh/react@19.1.1",
      "react/": "https://esm.sh/react@19.1.1/"
    }
  }
</script>
```

Each CDN dependency is requested in esm.sh's standalone mode. Its transitive
dependencies are bundled into the CDN module while shared framework packages
such as React, React DOM, and configured aliases remain external and resolve
through the same import map. This prevents component libraries from loading a
second framework instance.

## Options

```ts
pinestraw({
  include: ["preact"], // additional packages
  exclude: ["large-local-package"], // leave these in Vite's bundle
  peerDependencies: true, // default: false
  cdn: "https://esm.sh", // may point to a self-hosted instance
});
```

Packages declared with `file:`, `link:`, `workspace:`, Git, HTTP, or npm alias
specifiers must be installed locally (so their concrete version can be read) or
excluded.

Included packages use their installed version when available, or their declared
version from `dependencies`, `devDependencies`, `optionalDependencies`, or
`peerDependencies`.
