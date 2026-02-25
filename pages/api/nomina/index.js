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
      // Forward files to n8n webhook
      const webhookUrl = process.env.N8N_WEBHOOK_URL;
      if (!webhookUrl) return res.status(500).json({ error: 'N8N_WEBHOOK_URL not configured' });

      const { files } = req.body; // array of { name, data } base64

      if (!files || !files.length) {
        return res.status(400).json({ error: 'No files provided' });
      }

      // Build FormData for n8n
      const FormData = (await import('node-fetch')).default ? null : null;
      // Simple approach: send as multipart
      const boundary = '----FormBoundary' + Date.now();
      let body = '';

      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        const buf = Buffer.from(f.data, 'base64');
        body += `--${boundary}\r\n`;
        body += `Content-Disposition: form-data; name="file${i > 0 ? i : ''}"; filename="${f.name}"\r\n`;
        body += `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet\r\n\r\n`;
        body += buf.toString('binary');
        body += '\r\n';
      }
      body += `--${boundary}--\r\n`;

      const n8nRes = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
        body: Buffer.from(body, 'binary'),
      });

      if (!n8nRes.ok) {
        const errText = await n8nRes.text();
        return res.status(502).json({ error: 'n8n error: ' + errText });
      }

      const result = await n8nRes.json();
      return res.json(result);
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('API nomina error:', err);
    res.status(500).json({ error: err.message });
  }
}
