// Shared persistence for the Vercel serverless indexer.
//
// STORAGE = Upstash Redis (free tier, NO credit card required).
// Sign up at https://upstash.com (GitHub login), create a Redis database,
// copy the REST URL + token, and set them as Vercel env vars:
//   UPSTASH_REDIS_REST_URL=https://<id>.upstash.io
//   UPSTASH_REDIS_REST_TOKEN=AYP...<token>
// @upstash/redis reads those env vars automatically.
//
// FALLBACK: a JSON file in /tmp, used ONLY when Upstash env is not set, so the
// function never returns 500 during first deploy. /tmp is ephemeral (resets on
// cold start) — for real multi-user persistence you MUST connect Upstash.

const DB_KEY = 'spheretickets:db';
const EMPTY = { events: {}, tickets: [] };

let redisMod = null;
let tried = false;
async function getRedis() {
  if (tried) return redisMod;
  tried = true;
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null;
  }
  try {
    const mod = await import('@upstash/redis');
    redisMod = new mod.Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  } catch {
    redisMod = null;
  }
  return redisMod;
}

async function readFileFallback() {
  try {
    const { readFileSync, existsSync } = await import('node:fs');
    if (existsSync('/tmp/spheretickets-db.json')) {
      return JSON.parse(readFileSync('/tmp/spheretickets-db.json', 'utf8'));
    }
  } catch {
    /* ignore */
  }
  return structuredClone(EMPTY);
}

async function writeFileFallback(db) {
  try {
    const { writeFileSync } = await import('node:fs');
    writeFileSync('/tmp/spheretickets-db.json', JSON.stringify(db));
  } catch {
    /* ignore */
  }
}

export async function readDB() {
  const r = await getRedis();
  if (r) {
    try {
      const db = await r.get(DB_KEY);
      return db && typeof db === 'object' ? db : structuredClone(EMPTY);
    } catch {
      /* fall through */
    }
  }
  return readFileFallback();
}

export async function writeDB(db) {
  const r = await getRedis();
  if (r) {
    try {
      await r.set(DB_KEY, db);
      return;
    } catch {
      /* fall through */
    }
  }
  await writeFileFallback(db);
}
