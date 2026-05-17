import { writeFile } from 'fs/promises';
import { join } from 'path';

const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'fitbox2025!';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-token');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = req.headers['x-admin-token'];
  if (token !== ADMIN_TOKEN) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const config = req.body;
    if (typeof config !== 'object' || !config) return res.status(400).json({ error: 'Invalid body' });

    const configPath = join(process.cwd(), 'config.json');
    await writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');

    return res.status(200).json({ ok: true, saved: new Date().toISOString() });
  } catch (err) {
    console.error('save-config error:', err);
    return res.status(500).json({ error: err.message });
  }
}
