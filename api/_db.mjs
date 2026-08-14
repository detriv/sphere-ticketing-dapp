// Shared persistence for the Vercel serverless indexer.
//
// PRIMARY: Vercel KV (Redis). Enable it in the Vercel dashboard
// (Storage -> KV -> Create -> Connect to this project). The @vercel/kv client
// reads KV_REST_API_URL / KV_REST_API_TOKEN automatically.
//
// FALLBACK: an in-memory store (resets on cold start). Used only when KV is not
// bound yet, so the function never crashes during first deploy. For real
// multi-user persistence you MUST connect Vercel KV.

let kv = null;
let kvTried = false;
async function getKv() {
  if (kvTried) return kv;
  kvTried = true;
  try {
    const mod = await import('@vercel/kv');
    kv = mod.kv ?? null;
  } catch {
    kv = null;
  }
  return kv;
}

const EMPTY = { events: {}, tickets: [] };

export async function readDB() {
  const k = await getKv();
  if (k) {
    const db = await k.get('spheretickets:db');
    return db && typeof db === 'object' ? db : EMPTY;
  }
  // fallback: process memory (per instance, non-persistent)
  if (!globalThis.__sphereDb) globalThis.__sphereDb = structuredClone(EMPTY);
  return globalThis.__sphereDb;
}

export async function writeDB(db) {
  const k = await getKv();
  if (k) {
    await k.set('spheretickets:db', db);
    return;
  }
  globalThis.__sphereDb = db;
}
