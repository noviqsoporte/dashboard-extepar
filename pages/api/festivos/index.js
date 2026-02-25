import { fetchAll, createRecord, updateRecord, deleteRecord } from '../../../lib/airtable';

const TABLE = process.env.AIRTABLE_TABLE_FESTIVOS;

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const records = await fetchAll(TABLE, { sort: [{ field: 'Fecha', direction: 'asc' }] });
      return res.json(records.map(r => ({ id: r.id, ...r.fields })));
    }
    if (req.method === 'POST') {
      const record = await createRecord(TABLE, req.body);
      return res.json({ id: record.id, ...record.fields });
    }
    if (req.method === 'PUT') {
      const { id, ...fields } = req.body;
      const record = await updateRecord(TABLE, id, fields);
      return res.json({ id: record.id, ...record.fields });
    }
    if (req.method === 'DELETE') {
      const { id } = req.body;
      await deleteRecord(TABLE, id);
      return res.json({ success: true });
    }
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
