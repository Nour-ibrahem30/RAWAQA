/**
 * build-worker.mjs — Pre-bundle the Cloudflare Worker with esbuild.
 * =============================================================================
 * Why a custom build (instead of letting Wrangler bundle):
 * Wrangler's default esbuild pass mangles some transitive CommonJS dependencies
 * that import BARE "stream"/"buffer" specifiers (e.g. iconv-lite/lib/streams.js
 * reached via express.json() -> body-parser -> raw-body, and
 * winston-daily-rotate-file). That produced a non-callable module at runtime:
 *   "Uncaught TypeError: require_streams(...) is not a function".
 *
 * Running esbuild with platform="node" resolves those bare specifiers to Node
 * builtins and keeps node: builtins EXTERNAL, so the Workers runtime's
 * nodejs_compat layer provides them at execution time. No application code is
 * changed — this only controls how the existing code is bundled.
 *
 * Output: dist-worker/worker.mjs (referenced by wrangler.toml `main`, uploaded
 * with `--no-bundle`).
 * =============================================================================
 */
import { build } from 'esbuild';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirnameLocal = path.dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// Prisma edge-client redirect plugin (Worker bundle ONLY).
//
// The application imports the runtime Prisma instance from src/lib/prisma.ts,
// which imports the NODE-generated client at `../generated/prisma/client`. That
// Node client calls `new WebAssembly.Module(bytes)` at runtime, which workerd
// forbids. For the Worker bundle we transparently redirect any import that
// resolves to `src/generated/prisma/...` to the Cloudflare-generated client at
// `src/generated/prisma-edge/...` (runtime = "cloudflare", which uses
// @prisma/client/runtime/wasm-compiler-edge — no runtime WASM compilation).
//
// This affects ONLY the Worker bundle produced here. The Node/Render build (tsc)
// still compiles against the real Node client, so Node behavior is unchanged.
// ---------------------------------------------------------------------------
const NODE_CLIENT_DIR = path.resolve(__dirnameLocal, 'src/generated/prisma');
const EDGE_CLIENT_DIR = path.resolve(__dirnameLocal, 'src/generated/prisma-edge');

const prismaEdgeRedirectPlugin = {
  name: 'prisma-edge-redirect',
  setup(pluginBuild) {
    // Match relative imports whose last path segments are generated/prisma[/...]
    pluginBuild.onResolve({ filter: /generated[\\/]prisma(?:[\\/]|$)/ }, (args) => {
      // Never touch the .wasm?module import (handled by the wasm plugin below).
      if (args.path.includes('.wasm')) return null;
      // Only redirect the NODE client dir, never the edge dir itself.
      const resolved = path.resolve(args.resolveDir, args.path);
      if (!resolved.startsWith(NODE_CLIENT_DIR)) return null;
      if (resolved.startsWith(EDGE_CLIENT_DIR)) return null;
      const rest = resolved.slice(NODE_CLIENT_DIR.length); // '' or '/client' etc.
      const target = EDGE_CLIENT_DIR + rest;
      // Let esbuild resolve the redirected path normally (adds .ts/.js/index).
      return pluginBuild.resolve(target, {
        kind: args.kind,
        resolveDir: path.dirname(target),
      });
    });
  },
};

// ---------------------------------------------------------------------------
// Prisma query-compiler WASM plugin (Worker bundle ONLY).
//
// The Cloudflare-generated Prisma client imports its query compiler as:
//     await import("./query_compiler_fast_bg.wasm?module")
// and uses the default export as a `WebAssembly.Module`. On Cloudflare Workers a
// WebAssembly module must be provided as a SEPARATE module that workerd compiles
// at deploy time (NOT via runtime `new WebAssembly.Module(bytes)`, which is
// forbidden). esbuild has no built-in loader for the `?module` query, so this
// narrow plugin handles exactly this one Prisma import:
//   1. strips the `?module` query and resolves to the real .wasm file,
//   2. loads it with the `copy` loader so esbuild emits the .wasm as a sibling
//      asset and rewrites the import to a normal ESM import of that file.
// Wrangler (via the `[[rules]]` CompiledWasm entry + --no-bundle) then treats the
// emitted .wasm as a WebAssembly module whose default export is a compiled
// `WebAssembly.Module` — exactly what the generated client expects.
// ---------------------------------------------------------------------------
const prismaWasmPlugin = {
  name: 'prisma-wasm-module',
  setup(pluginBuild) {
    pluginBuild.onResolve({ filter: /query_compiler_fast_bg\.wasm\?module$/ }, (args) => {
      const clean = args.path.replace(/\?module$/, '');
      const resolved = path.resolve(args.resolveDir, clean);
      // Emit the .wasm via the `copy` loader (declared in loader config below).
      return { path: resolved, namespace: 'file' };
    });
  },
};

const NODE_BUILTINS = [
  'assert', 'async_hooks', 'buffer', 'crypto', 'diagnostics_channel', 'dns',
  'events', 'fs', 'http', 'https', 'net', 'os', 'path', 'process', 'punycode',
  'querystring', 'stream', 'string_decoder', 'timers', 'tls', 'url', 'util',
  'zlib', 'module', 'perf_hooks', 'console', 'constants', 'v8', 'vm', 'worker_threads',
];

// Keep both bare and node:-prefixed builtins external; nodejs_compat provides them.
const external = [
  ...NODE_BUILTINS,
  ...NODE_BUILTINS.map((m) => `node:${m}`),
  // Cloudflare virtual modules — resolved by the runtime, never bundled.
  'cloudflare:node',
  'cloudflare:workers',
];

// ESM output keeps CommonJS require() calls for the external node: builtins.
// esbuild's default ESM shim throws "Dynamic require of X is not supported", so
// we inject a real require built from node:module's createRequire. Under the
// Workers runtime (nodejs_compat) node:module + import.meta.url are available.
const requireBanner = [
  `import { createRequire as __cfCreateRequire } from 'node:module';`,
  `const require = __cfCreateRequire(import.meta.url);`,
].join('\n');

await build({
  entryPoints: ['src/worker.ts'],
  outfile: 'dist-worker/worker.mjs',
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'es2022',
  banner: { js: requireBanner },
  // Redirect the Node Prisma client -> Cloudflare edge client, and handle the
  // Prisma query-compiler .wasm?module import (Worker bundle only).
  plugins: [prismaEdgeRedirectPlugin, prismaWasmPlugin],
  // Emit .wasm files as sibling assets (referenced via ESM import). Wrangler's
  // CompiledWasm rule + --no-bundle turns these into WebAssembly modules.
  loader: {
    '.wasm': 'copy',
  },
  assetNames: '[name]',
  // Keep Node builtins external so the runtime (nodejs_compat) supplies them and
  // bare "stream"/"buffer" requires resolve correctly instead of being mangled.
  external,
  logLevel: 'info',
  // Workers is a single-file module; inline everything else.
  mainFields: ['module', 'main'],
  conditions: ['worker', 'node', 'import', 'require'],
});

console.log('✅ Worker bundle written to dist-worker/worker.mjs');
