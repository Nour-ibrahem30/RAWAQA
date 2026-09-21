/**
 * worker-env.d.ts — Ambient types for Cloudflare Workers runtime modules.
 *
 * `cloudflare:node` and `cloudflare:workers` are virtual modules provided by the
 * Workers runtime (not npm packages), so TypeScript cannot resolve them from
 * node_modules. These minimal declarations let the Node build (tsc) type-check
 * src/worker.ts without pulling in the full @cloudflare/workers-types surface.
 *
 * The real runtime implementations are injected by Wrangler at deploy/dev time.
 */

declare module 'cloudflare:node' {
  /**
   * Bridges the Worker `fetch` event to an in-process Node HTTP server started
   * via `app.listen(port)`. Returns a Workers module-format default export.
   */
  export function httpServerHandler(options: { port: number }): {
    fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
  };
}

declare module 'cloudflare:workers' {
  /** Worker bindings (vars, secrets, R2/D1/KV bindings) injected by the runtime. */
  export const env: Record<string, unknown>;
}
