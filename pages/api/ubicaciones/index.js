import { fetchAll, createRecord, updateRecord, deleteRecord } from '../../../lib/airtable';

const TABLE = process.env.AIRTABLE_TABLE_UBICACIONES;

// EXACT Airtable field names:
// Ubicación, Tipo Jornada, Entrada L-V, Salida L-V, Entrada Sáb, Salida Sáb,
// Hrs Teóricas Día, Hrs Teóricas Sáb, Hrs Comida, Tolerancia Min, Activa

function cleanFields(body) {
  const fields = {};
  if (body['Ubicación'] != null) fields['Ubicación'] = body['Ubicación'];
  if (body['Tipo Jornada'] != null) fields['Tipo Jornada'] = body['Tipo Jornada'] || null;
  if (body['Entrada L-V'] != null) fields['Entrada L-V'] = body['Entrada L-V'];
  if (body['Salida L-V'] != null) fields['Salida L-V'] = body['Salida L-V'];
  if (body['Entrada Sáb'] != null) fields['Entrada Sáb'] = body['Entrada Sáb'];
  if (body['Salida Sáb'] != null) fields['Salida Sáb'] = body['Salida Sáb'];
  if (body['Hrs Teóricas Día'] != null) fields['Hrs Teóricas Día'] = parseFloat(body['Hrs Teóricas Día']) || 0;
  if (body['Hrs Teóricas Sáb'] != null) fields['Hrs Teóricas Sáb'] = parseFloat(body['Hrs Teóricas Sáb']) || 0;
  if (body['Hrs Comida'] != null) fields['Hrs Comida'] = parseFloat(body['Hrs Comida']) || 0;
  if (body['Tolerancia Min'] != null) fields['Tolerancia Min'] = parseFloat(body['Tolerancia Min']) || 0;
  if (body['Activa'] != null) {
    const v = body['Activa'];
    fields['Activa'] = v === true || v === 'true' || v === 'Sí' || v === 'Si';
  }
  return fields;
}

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const records = await fetchAll(TABLE);
      const data = records.map(r => ({
        id: r.id, ...r.fields,
        Activa: r.fields.Activa === true ? 'Sí' : 'No',
      }));
      return res.json(data);
    }
    if (req.method === 'POST') {
      const fields = cleanFields(req.body);
      const record = await createRecord(TABLE, fields);
      return res.json({ id: record.id, ...record.fields });
    }
    if (req.method === 'PUT') {
      const { id } = req.body;
      if (!id) return res.status(400).json({ error: 'Missing id' });
      const fields = cleanFields(req.body);
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
