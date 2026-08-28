import { composioConfigured } from '../../lib/composio.js';

export default function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  return res.status(200).json({
    ok: true,
    composio: composioConfigured() ? 'configured' : 'missing_server_key'
  });
}
