import { fetchAll } from '../../../lib/airtable';

const TABLE_NOMINA = process.env.AIRTABLE_TABLE_NOMINA;
const TABLE_EMPLEADOS = process.env.AIRTABLE_TABLE_EMPLEADOS;

export default async function handler(req, res) {
  try {
    const { semana } = req.query;

    // Get latest nomina records (optionally filtered by semana)
    const filter = semana ? `{Semana}='${semana}'` : '';
    const nominaRecords = await fetchAll(TABLE_NOMINA, {
      filterByFormula: filter || undefined,
      sort: [{ field: 'Semana', direction: 'desc' }],
    });

    const empleadosRecords = await fetchAll(TABLE_EMPLEADOS);

    // Get unique semanas
    const semanasSet = new Set();
    nominaRecords.forEach(r => {
      if (r.fields.Semana) semanasSet.add(r.fields.Semana);
    });
    const semanas = Array.from(semanasSet).sort().reverse();

    // If no semana filter, use the latest one
    const activeSemana = semana || semanas[0] || '';
    const filtered = activeSemana
      ? nominaRecords.filter(r => r.fields.Semana === activeSemana)
      : nominaRecords;

    // Calculate KPIs
    const totalEmpleados = empleadosRecords.filter(r => r.fields.Activo === 'Sí').length;
    const empleadosSesamo = empleadosRecords.filter(r => r.fields['Tipo Pago'] === 'Sésamo' && r.fields.Activo === 'Sí').length;
    const empleadosFijo = empleadosRecords.filter(r => r.fields['Tipo Pago'] === 'Fijo' && r.fields.Activo === 'Sí').length;

    let nominaBase = 0, totalHE = 0, totalDescFaltas = 0, totalDescRetardos = 0;
    let totalDescPrestamos = 0, totalDescImss = 0, totalDescInfonavit = 0;
    let totalPagar = 0, totalFaltas = 0, totalRetardoHrs = 0;
    let totalAlertas = 0, totalFestivos = 0;

    const porUbicacion = {};

    filtered.forEach(r => {
      const f = r.fields;
      const sueldo = parseFloat(f['Sueldo Semanal']) || 0;
      const pagoHe = parseFloat(f['Pago HE']) || 0;
      const descF = parseFloat(f['Desc Faltas']) || 0;
      const descR = parseFloat(f['Desc Retardos']) || 0;
      const descP = parseFloat(f['Desc Préstamos']) || 0;
      const descI = parseFloat(f['Desc IMSS']) || 0;
      const descIn = parseFloat(f['Desc INFONAVIT']) || 0;
      const total = parseFloat(f['Total a Pagar']) || 0;
      const faltas = parseFloat(f['Días Falta']) || 0;
      const retHrs = parseFloat(f['Retardos Hrs']) || 0;
      const alertas = f['Alertas'] ? f['Alertas'].split(';').filter(a => a.trim()).length : 0;
      const ub = f['Ubicación'] || 'Sin Ubicación';

      nominaBase += sueldo;
      totalHE += pagoHe;
      totalDescFaltas += descF;
      totalDescRetardos += descR;
      totalDescPrestamos += descP;
      totalDescImss += descI;
      totalDescInfonavit += descIn;
      totalPagar += total;
      totalFaltas += faltas;
      totalRetardoHrs += retHrs;
      totalAlertas += alertas;

      if (!porUbicacion[ub]) porUbicacion[ub] = { empleados: 0, nominaBase: 0, totalPagar: 0, faltas: 0, he: 0 };
      porUbicacion[ub].empleados++;
      porUbicacion[ub].nominaBase += sueldo;
      porUbicacion[ub].totalPagar += total;
      porUbicacion[ub].faltas += faltas;
      porUbicacion[ub].he += pagoHe;
    });

    // Top empleados by total (for chart)
    const topEmpleados = filtered
      .map(r => ({ nombre: r.fields.Empleado, total: parseFloat(r.fields['Total a Pagar']) || 0, ubicacion: r.fields['Ubicación'] }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    return res.json({
      semanas,
      activeSemana,
      totalEmpleados,
      empleadosSesamo,
      empleadosFijo,
      nominaProcesados: filtered.length,
      nominaBase: Math.round(nominaBase * 100) / 100,
      totalHE: Math.round(totalHE * 100) / 100,
      totalDescFaltas: Math.round(totalDescFaltas * 100) / 100,
      totalDescRetardos: Math.round(totalDescRetardos * 100) / 100,
      totalDescPrestamos: Math.round(totalDescPrestamos * 100) / 100,
      totalDescImss: Math.round(totalDescImss * 100) / 100,
      totalDescInfonavit: Math.round(totalDescInfonavit * 100) / 100,
      totalPagar: Math.round(totalPagar * 100) / 100,
      totalFaltas,
      totalRetardoHrs: Math.round(totalRetardoHrs * 100) / 100,
      totalAlertas,
      porUbicacion,
      topEmpleados,
    });
  } catch (err) {
    console.error('API kpis error:', err);
    res.status(500).json({ error: err.message });
  }
}
