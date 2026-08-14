// Minimal shared metadata indexer for SphereTickets (V1).
//
// WHY: the dApp needs a SHARED place to store event metadata + ticket issuance
// so that events created by one user are visible to everyone (localStorage is
// per-device only). This is a tiny HTTP server backed by a JSON file.
//
// It deliberately does NOT validate on-chain facts — those live on the Unicity
// token engine. It only stores what the dApp tells it, keyed by eventId.
//
// Run:  node indexer/server.mjs            (listens on :4178)
//   or:  PORT=8080 node indexer/server.mjs
//   or:  DATA_DIR=/var/data node indexer/server.mjs   (persistent disk on Render/Railway)

import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.DATA_DIR || join(__dirname, 'data');
const DATA_FILE = join(DATA_DIR, 'store.json');
const PORT = Number(process.env.PORT || 4178);

/** @type {{ events: Record<string, any>, tickets: any[] }} */
let db = { events: {}, tickets: [] };

function load() {
  if (existsSync(DATA_FILE)) {
    try {
      db = JSON.parse(readFileSync(DATA_FILE, 'utf8'));
      if (!db.events) db.events = {};
      if (!db.tickets) db.tickets = [];
    } catch {
      db = { events: {}, tickets: [] };
    }
  }
}
function save() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
}

load();

function send(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(payload);
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => (data += c));
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const method = req.method;

  if (method === 'OPTIONS') return send(res, 204, {});

  try {
    // ---- Events ----
    if (url.pathname === '/events' && method === 'GET') {
      const list = Object.values(db.events).sort((a, b) => b.createdAt - a.createdAt);
      return send(res, 200, list);
    }

    if (url.pathname === '/events' && method === 'POST') {
      const body = await readBody(req);
      const eventId = body.eventId || randomUUID();
      const record = { ...body, eventId, createdAt: Date.now() };
      db.events[eventId] = record;
      save();
      return send(res, 201, record);
    }

    const eventMatch = url.pathname.match(/^\/events\/([^/]+)$/);
    if (eventMatch && method === 'GET') {
      const ev = db.events[eventMatch[1]];
      if (!ev) return send(res, 404, { error: 'not found' });
      return send(res, 200, ev);
    }

    // ---- Tickets (issuance records) ----
    if (url.pathname === '/tickets' && method === 'GET') {
      const eventId = url.searchParams.get('eventId');
      const owner = url.searchParams.get('owner');
      let list = db.tickets;
      if (eventId) list = list.filter((t) => t.eventId === eventId);
      if (owner) list = list.filter((t) => t.owner.toLowerCase() === owner.toLowerCase());
      return send(res, 200, list);
    }

    if (url.pathname === '/tickets' && method === 'POST') {
      const body = await readBody(req);
      const rec = { ...body, issuedAt: body.issuedAt || Date.now() };
      db.tickets.push(rec);
      // keep event remainingSupply in sync
      const ev = db.events[rec.eventId];
      if (ev && typeof ev.onChain?.remainingSupply === 'number') {
        ev.onChain.remainingSupply = Math.max(0, ev.onChain.remainingSupply - 1);
        if (ev.onChain.remainingSupply === 0) ev.status = 'SOLD_OUT';
      }
      save();
      return send(res, 201, rec);
    }

    return send(res, 404, { error: 'not found' });
  } catch (e) {
    return send(res, 400, { error: String(e) });
  }
});

server.listen(PORT, () => {
  console.log(`[sphere-ticketing-indexer] listening on http://localhost:${PORT}`);
});
