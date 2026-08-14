// Shared persistence for the Vercel serverless indexer.
//
// STORAGE = GitHub repository (Contents API). Chosen because it needs NO new
// account and NO credit card: the app already lives in a GitHub repo, and a
// Personal Access Token (PAT) can read/write a JSON file in that repo. Every
// write is a small commit to indexer/data/store.json.
//
// Env vars (set in Vercel dashboard):
//   GITHUB_TOKEN        = a PAT with repo scope
//   GITHUB_REPO         = owner/name  (e.g. detriv/sphere-ticketing-dapp)
//   GITHUB_DB_PATH      = path in repo (default indexer/data/store.json)
//
// FALLBACK: a JSON file in /tmp, used only when GITHUB_TOKEN is not set, so the
// function never 500s during first deploy. /tmp is ephemeral (resets on cold
// start / redeploy) — for real persistence you MUST set the GitHub env vars.

const DB_KEY = 'spheretickets:db';
const EMPTY = { events: {}, tickets: [] };

const REPO = process.env.GITHUB_REPO || 'detriv/sphere-ticketing-dapp';
const PATH = process.env.GITHUB_DB_PATH || 'indexer/data/store.json';
const API = 'https://api.github.com';

let ghTried = false;
let ghReady = false;
async function ensureGithub() {
  if (ghTried) return ghReady;
  ghTried = true;
  ghReady = Boolean(process.env.GITHUB_TOKEN);
  return ghReady;
}

function b64encode(str) {
  return Buffer.from(str, 'utf8').toString('base64');
}
function b64decode(str) {
  return Buffer.from(str, 'base64').toString('utf8');
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
  if (!(await ensureGithub())) return readFileFallback();
  const url = `${API}/repos/${REPO}/contents/${PATH}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'spheretickets-indexer',
    },
  });
  if (res.status === 404) return structuredClone(EMPTY);
  if (!res.ok) {
    // network/permission hiccup — degrade to fallback rather than crash
    return readFileFallback();
  }
  const data = await res.json();
  try {
    return JSON.parse(b64decode(data.content));
  } catch {
    return structuredClone(EMPTY);
  }
}

export async function writeDB(db) {
  if (!(await ensureGithub())) return writeFileFallback(db);

  const url = `${API}/repos/${REPO}/contents/${PATH}`;
  const headers = {
    Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
    Accept: 'application/vnd.github+json',
    'Content-Type': 'application/json',
    'User-Agent': 'spheretickets-indexer',
  };

  // Read current sha (needed for the update PUT), tolerate missing file.
  let sha;
  try {
    const head = await fetch(url, { headers });
    if (head.ok) sha = (await head.json()).sha;
  } catch {
    /* ignore */
  }

  const body = {
    message: 'spheretickets: update indexer db',
    content: b64encode(JSON.stringify(db)),
    branch: 'main',
  };
  if (sha) body.sha = sha;

  const res = await fetch(url, { method: 'PUT', headers, body: JSON.stringify(body) });
  if (!res.ok) {
    // 409 = concurrent edit; 4xx = permission. Fall back so the request still
    // returns to the caller instead of throwing a 500.
    return writeFileFallback(db);
  }
}
