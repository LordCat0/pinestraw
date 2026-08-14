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

The trailing-slash entry supports package subpaths such as `react/jsx-runtime`.
Installed exact versions are preferred; otherwise the range from `package.json`
is used. Development mode is untouched and continues to use Vite normally.

## Options

```ts
pinestraw({
  include: { preact: "10.27.0" }, // additional packages
  exclude: ["large-local-package"], // leave these in Vite's bundle
  peerDependencies: true, // default: false
  cdn: "https://esm.sh", // may point to a self-hosted instance
});
```

Packages declared with `file:`, `link:`, `workspace:`, Git, HTTP, or npm alias
specifiers must be installed locally (so their concrete version can be read) or
excluded.
