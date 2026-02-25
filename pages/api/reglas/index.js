import { fetchAll, updateRecord } from '../../../lib/airtable';

const TABLE = process.env.AIRTABLE_TABLE_REGLAS;

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const records = await fetchAll(TABLE);
      return res.json(records.map(r => ({ id: r.id, ...r.fields })));
    }
    if (req.method === 'PUT') {
      const { id, ...fields } = req.body;
      const record = await updateRecord(TABLE, id, fields);
      return res.json({ id: record.id, ...record.fields });
    }
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
