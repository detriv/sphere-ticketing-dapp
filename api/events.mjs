// Vercel serverless: GET /api/events (list), POST /api/events (create).
import { readDB, writeDB } from './_db.mjs';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  let db;
  try {
    db = await readDB();
  } catch (e) {
    return res.status(500).json({ error: 'db read failed' });
  }

  if (req.method === 'GET') {
    const list = Object.values(db.events).sort((a, b) => b.createdAt - a.createdAt);
    return res.status(200).json(list);
  }

  if (req.method === 'POST') {
    let body;
    try {
      body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    } catch {
      return res.status(400).json({ error: 'invalid json' });
    }
    // The client (ticketing.createEvent) builds a full Event whose canonical id
    // lives at meta.eventId. Use THAT as the storage key so getEvent(id) matches
    // the id the UI carries (event.meta.eventId). Do NOT generate a new id.
    const eventId = body?.meta?.eventId || body?.eventId;
    if (!eventId) return res.status(400).json({ error: 'missing eventId' });
    const record = { ...body, eventId, createdAt: Date.now() };
    db.events[eventId] = record;
    await writeDB(db);
    return res.status(201).json(record);
  }

  return res.status(404).json({ error: 'not found' });
}
