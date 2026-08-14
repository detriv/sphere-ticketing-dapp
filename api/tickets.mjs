// Vercel serverless: GET /api/tickets?eventId=&owner=, POST /api/tickets (issue).
import { readDB, writeDB } from './_db.mjs';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const db = await readDB();

  if (req.method === 'GET') {
    const url = new URL(req.url, 'http://localhost');
    const eventId = url.searchParams.get('eventId');
    const owner = url.searchParams.get('owner');
    let list = db.tickets;
    if (eventId) list = list.filter((t) => t.eventId === eventId);
    if (owner) list = list.filter((t) => t.owner.toLowerCase() === owner.toLowerCase());
    return res.status(200).json(list);
  }

  if (req.method === 'POST') {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const rec = { ...body, issuedAt: body.issuedAt || Date.now() };
    db.tickets.push(rec);
    const ev = db.events[rec.eventId];
    if (ev && typeof ev.onChain?.remainingSupply === 'number') {
      ev.onChain.remainingSupply = Math.max(0, ev.onChain.remainingSupply - 1);
      if (ev.onChain.remainingSupply === 0) ev.status = 'SOLD_OUT';
    }
    await writeDB(db);
    return res.status(201).json(rec);
  }

  return res.status(404).json({ error: 'not found' });
}
