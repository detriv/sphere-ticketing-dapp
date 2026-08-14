// Debug endpoint: reports whether the GitHub storage env is wired up inside the
// Vercel function. Temporary — remove after diagnosing.
import { readDB } from './_db.mjs';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  try {
    const db = await readDB();
    const evCount = Object.keys(db.events || {}).length;
    const tkCount = (db.tickets || []).length;
    return res.status(200).json({
      hasToken: Boolean(process.env.GITHUB_TOKEN),
      repo: process.env.GITHUB_REPO || '(default)',
      path: process.env.GITHUB_DB_PATH || '(default)',
      evCount,
      tkCount,
    });
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
}
