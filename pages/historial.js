import { useState, useEffect } from 'react';
import { FileSpreadsheet, ChevronDown, Clock, AlertTriangle } from 'lucide-react';

const fmt = (n) => n != null ? `$${Number(n).toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : '-';

export default function Historial() {
  const [semanas, setSemanas] = useState([]);
  const [semana, setSemana] = useState('');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedRow, setExpandedRow] = useState(null);

  useEffect(() => {
    fetch('/api/kpis').then(r => r.json()).then(d => {
      setSemanas(d.semanas || []);
      if (d.activeSemana) { setSemana(d.activeSemana); loadSemana(d.activeSemana); }
      else setLoading(false);
    });
  }, []);

  async function loadSemana(s) {
    setLoading(true);
    try {
      const res = await fetch(`/api/nomina?semana=${encodeURIComponent(s)}`);
      setData(await res.json());
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  function changeSemana(s) {
    setSemana(s);
    loadSemana(s);
  }

  return (
    <>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2>Historial de Nómina</h2>
          <p>Consulta nóminas procesadas por semana</p>
        </div>
        <select className="form-select" style={{ width: 260 }} value={semana} onChange={e => changeSemana(e.target.value)}>
          <option value="">Selecciona semana</option>
          {semanas.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {!semana && !loading && (
        <div className="card" style={{ textAlign: 'center', padding: 60 }}>
          <FileSpreadsheet size={36} style={{ color: 'var(--text-muted)', marginBottom: 12 }} />
          <p style={{ color: 'var(--text-muted)' }}>Selecciona una semana para ver la nómina</p>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
      ) : data.length > 0 && (
        <div className="data-table-wrap" style={{ maxHeight: 'calc(100vh - 200px)', overflow: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Empleado</th><th>Ubicación</th><th>Sueldo</th>
                <th>Días Trab.</th><th>Faltas</th><th>HE Netas</th><th>Pago HE</th>
                <th>Retardos</th><th>Desc Faltas</th><th>Total</th><th>Alertas</th>
              </tr>
            </thead>
            <tbody>
              {data.map((r, i) => (
                <tr key={r.id || i} onClick={() => setExpandedRow(expandedRow === i ? null : i)} style={{ cursor: 'pointer' }}>
                  <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{r.Empleado}</td>
                  <td><span className={`badge badge-${r['Ubicación'] === 'Oficina' ? 'blue' : 'green'}`}>{r['Ubicación']}</span></td>
                  <td style={{ fontFamily: 'JetBrains Mono' }}>{fmt(r['Sueldo Semanal'])}</td>
                  <td>{r['Días Trabajados'] || 0}</td>
                  <td style={{ color: r['Días Falta'] > 0 ? 'var(--red)' : '' }}>{r['Días Falta'] || 0}</td>
                  <td>{r['HE Netas'] || 0}</td>
                  <td style={{ fontFamily: 'JetBrains Mono', color: 'var(--blue)' }}>{fmt(r['Pago HE'])}</td>
                  <td style={{ color: r['Retardos Hrs'] > 0 ? 'var(--orange)' : '' }}>
                    {r['Retardos Hrs'] ? `${r['Retardos Hrs']}h` : '-'}
                  </td>
                  <td style={{ fontFamily: 'JetBrains Mono', color: 'var(--red)' }}>{r['Desc Faltas'] > 0 ? fmt(r['Desc Faltas']) : '-'}</td>
                  <td style={{ fontFamily: 'JetBrains Mono', fontWeight: 600, color: 'var(--gold)' }}>{fmt(r['Total a Pagar'])}</td>
                  <td>
                    {r.Alertas ? (
                      <span className="badge badge-red" title={r.Alertas}><AlertTriangle size={12} style={{ marginRight: 4 }} />{r.Alertas.split(';').filter(a => a.trim()).length}</span>
                    ) : <span className="badge badge-green">OK</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && semana && !data.length && (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <p style={{ color: 'var(--text-muted)' }}>No hay registros para esta semana</p>
        </div>
      )}
    </>
  );
}
