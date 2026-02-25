import { fetchAll, createRecord, updateRecord, deleteRecord } from '../../../lib/airtable';

const TABLE = process.env.AIRTABLE_TABLE_EMPLEADOS;

function cleanFields(body) {
  const fields = {};

  // Text fields
  if (body['Nombre Completo'] != null) fields['Nombre Completo'] = String(body['Nombre Completo']);
  if (body['Puesto'] != null) fields['Puesto'] = body['Puesto'] || null;
  if (body['Notas Estela'] != null) fields['Notas Estela'] = body['Notas Estela'] || null;

  // Number fields (never send No. — it's autonumber now)
  if (body['Sueldo Semanal'] != null) fields['Sueldo Semanal'] = parseFloat(body['Sueldo Semanal']) || 0;
  if (body['Salario Diario'] != null) fields['Salario Diario'] = parseFloat(body['Salario Diario']) || 0;
  if (body['Costo por Hora'] != null) fields['Costo por Hora'] = parseFloat(body['Costo por Hora']) || 0;
  if (body['Código Sésamo'] != null) {
    const v = parseInt(body['Código Sésamo']);
    fields['Código Sésamo'] = isNaN(v) ? null : v;
  }
  if (body['Descuento IMSS'] != null) fields['Descuento IMSS'] = parseFloat(body['Descuento IMSS']) || 0;
  if (body['Descuento INFONAVIT'] != null) fields['Descuento INFONAVIT'] = parseFloat(body['Descuento INFONAVIT']) || 0;
  if (body['Desc Préstamos'] != null) fields['Desc Préstamos'] = parseFloat(body['Desc Préstamos']) || 0;

  // Single select fields
  if (body['Ubicación'] != null) fields['Ubicación'] = body['Ubicación'] || null;
  if (body['Obra'] != null) fields['Obra'] = body['Obra'] || null;
  if (body['Tipo Jornada'] != null) fields['Tipo Jornada'] = body['Tipo Jornada'] || null;
  if (body['Centro Sésamo'] != null) fields['Centro Sésamo'] = body['Centro Sésamo'] || null;
  if (body['Depto Sésamo'] != null) fields['Depto Sésamo'] = body['Depto Sésamo'] || null;
  if (body['Tipo Pago'] != null) fields['Tipo Pago'] = body['Tipo Pago'] || null;

  // Checkbox → boolean
  if (body['Activo'] != null) {
    const v = body['Activo'];
    fields['Activo'] = v === true || v === 'true' || v === 'Sí' || v === 'Si';
  }

  return fields;
}

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const records = await fetchAll(TABLE, {
        sort: [{ field: 'No.', direction: 'asc' }],
      });
      const data = records.map(r => ({
        id: r.id,
        ...r.fields,
        Activo: r.fields.Activo === true ? 'Sí' : 'No',
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
      if (!id) return res.status(400).json({ error: 'Missing id' });
      await deleteRecord(TABLE, id);
      return res.json({ success: true });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('API empleados error:', err.message);
    res.status(500).json({ error: err.message });
  }
}
