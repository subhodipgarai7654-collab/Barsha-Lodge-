// Ensure global.__dirname is not set to a relative path (such as '.')
// which breaks packages calling createRequire(__dirname) like vite-plugin-pwa
if (typeof (globalThis as any).__dirname === 'string' && !(globalThis as any).__dirname.startsWith('/')) {
  delete (globalThis as any).__dirname;
}

export {};
