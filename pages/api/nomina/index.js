import { fetchAll } from '../../../lib/airtable';

const TABLE = process.env.AIRTABLE_TABLE_NOMINA;

export const config = { api: { bodyParser: { sizeLimit: '20mb' } } };

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const { semana } = req.query;
      const opts = { sort: [{ field: 'Empleado', direction: 'asc' }] };
      if (semana) opts.filterByFormula = `{Semana}='${semana}'`;
      const records = await fetchAll(TABLE, opts);
      const data = records.map(r => ({ id: r.id, ...r.fields }));
      return res.json(data);
    }

    if (req.method === 'POST') {
      const webhookUrl = process.env.N8N_WEBHOOK_URL;
      if (!webhookUrl) return res.status(500).json({ error: 'N8N_WEBHOOK_URL not configured' });

      const { files } = req.body;
      if (!files || !files.length) {
        return res.status(400).json({ error: 'No files provided' });
      }

      // Build multipart body for n8n webhook
      const boundary = '----FormBoundary' + Date.now();
      const parts = [];

      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        const buf = Buffer.from(f.data, 'base64');
        const fieldName = i === 0 ? 'file' : `file${i}`;
        parts.push(
          `--${boundary}\r\n` +
          `Content-Disposition: form-data; name="${fieldName}"; filename="${f.name}"\r\n` +
          `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet\r\n\r\n`
        );
        parts.push(buf);
        parts.push('\r\n');
      }
      parts.push(`--${boundary}--\r\n`);

      // Combine parts into a single Buffer
      const bodyParts = parts.map(p => typeof p === 'string' ? Buffer.from(p, 'utf-8') : p);
      const bodyBuffer = Buffer.concat(bodyParts);

      const n8nRes = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Content-Length': bodyBuffer.length.toString(),
        },
        body: bodyBuffer,
      });

      if (!n8nRes.ok) {
        const errText = await n8nRes.text();
        console.error('n8n error:', n8nRes.status, errText);
        return res.status(502).json({ error: `n8n error (${n8nRes.status}): ${errText.slice(0, 200)}` });
      }

      const contentType = n8nRes.headers.get('content-type') || '';
      let result;
      if (contentType.includes('application/json')) {
        result = await n8nRes.json();
      } else {
        const text = await n8nRes.text();
        result = { raw: text };
      }

      return res.json(result);
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('API nomina error:', err);
    res.status(500).json({ error: err.message });
  }
}
