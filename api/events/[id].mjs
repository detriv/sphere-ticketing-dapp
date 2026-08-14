// Vercel serverless: GET /api/events/:id  (single event detail)
import { readDB } from './_db.mjs';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(404).json({ error: 'not found' });

  const id = req.query.id;
  if (!id) return res.status(404).json({ error: 'not found' });

  let db;
  try {
    db = await readDB();
  } catch {
    return res.status(500).json({ error: 'db read failed' });
  }

  const ev = db.events[id];
  if (!ev) return res.status(404).json({ error: 'not found' });
  return res.status(200).json(ev);
}
