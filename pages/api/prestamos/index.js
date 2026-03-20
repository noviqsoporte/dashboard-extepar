import { fetchAll, updateRecord } from '../../../lib/airtable';

const TABLE = process.env.AIRTABLE_TABLE_EMPLEADOS;

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const records = await fetchAll(TABLE, {
        filterByFormula: "OR(Activo = 'Sí', Activo = 1)",
        fields: [
          'Nombre Completo',
          'Ubicación',
          'Sueldo Semanal',
          'Activo',
          'Préstamo Monto Total',
          'Préstamo Desc Semanal',
          'Préstamo Saldo',
          'INFONAVIT Desc Semanal',
          'INFONAVIT Semanas Restantes',
          'FONACOT Desc Semanal',
          'FONACOT Semanas Restantes'
        ]
      });

      const data = records.map(r => ({
        id: r.id,
        ...r.fields,
        Activo: r.fields.Activo === true || r.fields.Activo === 'Sí' ? 'Sí' : 'No',
        'Sueldo Semanal': r.fields['Sueldo Semanal'] || 0,
        // Prestamos Personales
        'Préstamo Monto Total': r.fields['Préstamo Monto Total'] || 0,
        'Préstamo Desc Semanal': r.fields['Préstamo Desc Semanal'] || 0,
        'Préstamo Saldo': r.fields['Préstamo Saldo'] || 0,
        // INFONAVIT
        'INFONAVIT Desc Semanal': r.fields['INFONAVIT Desc Semanal'] || 0,
        'INFONAVIT Semanas Restantes': r.fields['INFONAVIT Semanas Restantes'] || 0,
        // FONACOT
        'FONACOT Desc Semanal': r.fields['FONACOT Desc Semanal'] || 0,
        'FONACOT Semanas Restantes': r.fields['FONACOT Semanas Restantes'] || 0,
      }));

      // Sort alphabetically by name
      data.sort((a, b) => (a['Nombre Completo'] || '').localeCompare(b['Nombre Completo'] || ''));

      return res.json(data);
    }

    if (req.method === 'PUT') {
      const { id } = req.body;
      if (!id) return res.status(400).json({ error: 'Missing id' });

      // Build fields to update
      const fields = {};
      
      const updateIfPresent = (fieldName) => {
        if (req.body[fieldName] !== undefined) {
          fields[fieldName] = parseFloat(req.body[fieldName]) || 0;
        }
      };

      updateIfPresent('Préstamo Monto Total');
      updateIfPresent('Préstamo Desc Semanal');
      updateIfPresent('Préstamo Saldo');
      
      updateIfPresent('INFONAVIT Desc Semanal');
      updateIfPresent('INFONAVIT Semanas Restantes');
      
      updateIfPresent('FONACOT Desc Semanal');
      updateIfPresent('FONACOT Semanas Restantes');

      if (Object.keys(fields).length === 0) {
        return res.status(400).json({ error: 'No fields provided for update' });
      }

      const record = await updateRecord(TABLE, id, fields);
      
      return res.json({ id: record.id, ...record.fields });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('API prestamos error:', err.message);
    res.status(500).json({ error: err.message });
  }
}
