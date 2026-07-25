// Tiny in-memory TTL cache for hot, read-only catalog endpoints (menu,
// categories). The menu changes rarely but is read on every page load, so
// serving it from memory for a few seconds removes almost all repeat DB
// round-trips — the main source of "the API feels a little slow" on a
// cross-region Neon/Render setup.
//
// Single-instance friendly. If the app is scaled to N instances each keeps
// its own copy; the only effect is each instance may be up to TTL seconds
// stale, and every admin edit invalidates immediately.

const store = new Map(); // key -> { value, expires }

/** Get a cached value or compute + store it. */
export async function cached(key, ttlMs, producer) {
  const hit = store.get(key);
  if (hit && Date.now() < hit.expires) return hit.value;

  const value = await producer();
  store.set(key, { value, expires: Date.now() + ttlMs });
  return value;
}

/** Drop every entry whose key starts with `prefix`. */
export function invalidate(prefix) {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }
}

/** Clear all cached catalog reads — call after any food/category mutation. */
export function invalidateCatalog() {
  invalidate("foods");
  invalidate("categories");
}
