// `server-only` is a build-time marker Next resolves itself; it has no runtime
// module, so vitest needs a stand-in to import server modules directly.
export {};
