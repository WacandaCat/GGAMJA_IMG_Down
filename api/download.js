import { assertAllowed } from './_guard.js';

function sanitizeFilename(name = 'download.bin') {
  return String(name).replace(/[^a-zA-Z0-9._-]/g, '-');
}

function inferContentType(url, fallback = 'application/octet-stream') {
  const lower = url.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.gif')) return 'image/gif';
  if (lower.endsWith('.svg')) return 'image/svg+xml';
  return fallback;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).send('Method Not Allowed');
  }

  try {
    const url = String(req.query?.url || '');
    const filename = sanitizeFilename(req.query?.filename || 'download.bin');
    try { assertAllowed(url); } catch (e) { return res.status(400).send(e.message); }

    const response = await fetch(url, { redirect: 'error' });
    if (!response.ok) return res.status(502).send(`Failed to fetch source file: ${response.status}`);

    const buffer = Buffer.from(await response.arrayBuffer());
    const type = response.headers.get('content-type') || inferContentType(url);
    res.setHeader('Content-Type', type);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.status(200).send(buffer);
  } catch (error) {
    return res.status(500).send(error.message || 'Download failed');
  }
}
