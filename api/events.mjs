// Vercel serverless: GET /api/events (list), GET /api/events/:id (detail),
// POST /api/events (create).
import { readDB, writeDB } from './_db.mjs';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const url = new URL(req.url, 'http://localhost');
  const idMatch = url.pathname.match(/^\/api\/events\/([^/]+)$/) || url.pathname.match(/^\/events\/([^/]+)$/);

  let db;
  try {
    db = await readDB();
  } catch (e) {
    return res.status(500).json({ error: 'db read failed' });
  }

  // GET /events/:id
  if (req.method === 'GET' && idMatch) {
    const ev = db.events[idMatch[1]];
    if (!ev) return res.status(404).json({ error: 'not found' });
    return res.status(200).json(ev);
  }

  // GET /events (list)
  if (req.method === 'GET') {
    const list = Object.values(db.events).sort((a, b) => b.createdAt - a.createdAt);
    return res.status(200).json(list);
  }

  // POST /events (create)
  if (req.method === 'POST') {
    let body;
    try {
      body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    } catch {
      return res.status(400).json({ error: 'invalid json' });
    }
    const eventId = body?.meta?.eventId || body?.eventId;
    if (!eventId) return res.status(400).json({ error: 'missing eventId' });
    const record = { ...body, eventId, createdAt: Date.now() };
    db.events[eventId] = record;
    await writeDB(db);
    return res.status(201).json(record);
  }

  return res.status(404).json({ error: 'not found' });
}
