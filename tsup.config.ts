import { defineConfig } from 'tsup'
import type { Plugin as EsbuildPlugin } from 'esbuild'

// ink dynamically imports ./devtools.js only when DEV=true (see ink's
// reconciler.js). esbuild still hoists devtools.js's *static* imports
// (react-devtools-core, ws) to the top of the bundle because ESM imports are
// spec-eager, which crashes the CLI at startup outside a browser context
// (react-devtools-core's `self` reference). Stub the module out entirely so
// none of that devtools-only chain ends up in the shipped bundle; the DEV=true
// debug path documented by ink simply won't work from the built CLI, which is
// an acceptable tradeoff for production cold-start size.
const stubInkDevtools: EsbuildPlugin = {
  name: 'stub-ink-devtools',
  setup(build) {
    build.onLoad({ filter: /ink[/\\]build[/\\]devtools\.js$/ }, () => ({
      contents: 'export {}',
      loader: 'js',
    }))
  },
}

export default defineConfig({
  entry: ['src/cli.ts'],
  format: ['esm'],
  target: 'node20',
  platform: 'node',
  bundle: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  shims: true,
  dts: false,
  noExternal: [/.*/],
  esbuildPlugins: [stubInkDevtools],
  // Bundled CJS deps (e.g. signal-exit, pulled in via ink -> cli-cursor) call
  // require() on Node builtins. esbuild's own ESM output has no real `require`
  // in scope, so those calls hit its throwing __require shim at runtime; tsup's
  // `shims` option doesn't cover this case (it only polyfills __dirname/__filename).
  // Bind a real require via node:module so esbuild uses it directly instead.
  banner: {
    js: "import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);",
  },
})
