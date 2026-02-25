import { useState, useEffect } from 'react';
import { FileSpreadsheet, AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react';

const fmt = (n) => n != null ? `$${Number(n).toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : '-';

export default function Historial() {
  const [semanas, setSemanas] = useState([]);
  const [semana, setSemana] = useState('');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({});

  useEffect(() => {
    fetch('/api/kpis').then(r => r.json()).then(d => {
      setSemanas(d.semanas || []);
      if (d.activeSemana) { setSemana(d.activeSemana); loadSemana(d.activeSemana); }
      else setLoading(false);
    });
  }, []);

  async function loadSemana(s) {
    setLoading(true);
    setExpanded({});
    try {
      const res = await fetch(`/api/nomina?semana=${encodeURIComponent(s)}`);
      setData(await res.json());
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  function changeSemana(s) { setSemana(s); loadSemana(s); }
  function toggleRow(i) { setExpanded(prev => ({ ...prev, [i]: !prev[i] })); }

  // Group by ubicación for subtotals
  const porUbicacion = {};
  data.forEach(r => {
    const ub = r['Ubicación'] || 'Sin Ubicación';
    if (!porUbicacion[ub]) porUbicacion[ub] = [];
    porUbicacion[ub].push(r);
  });

  const grandTotal = data.reduce((s, r) => s + (parseFloat(r['Total a Pagar']) || 0), 0);

  return (
    <>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2>Historial de Nómina</h2>
          <p>{data.length} registros{semana ? ` — ${semana}` : ''}</p>
        </div>
        <select className="form-select" style={{ width: 280 }} value={semana} onChange={e => changeSemana(e.target.value)}>
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
        <>
          {/* Summary bar */}
          <div className="kpi-grid" style={{ marginBottom: 16 }}>
            <div className="kpi-card">
              <div className="kpi-label">Total General</div>
              <div className="kpi-value gold">{fmt(grandTotal)}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Empleados</div>
              <div className="kpi-value">{data.length}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Faltas</div>
              <div className="kpi-value red">{data.reduce((s, r) => s + (parseFloat(r['Días Falta']) || 0), 0)}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Alertas</div>
              <div className="kpi-value red">{data.reduce((s, r) => s + (r.Alertas ? r.Alertas.split(';').filter(a => a.trim()).length : 0), 0)}</div>
            </div>
          </div>

          <div className="data-table-wrap" style={{ maxHeight: 'calc(100vh - 300px)', overflow: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 30 }}></th>
                  <th>Empleado</th><th>Ubicación</th><th>Sueldo</th>
                  <th>Días</th><th>Faltas</th><th>HE Netas</th><th>Pago HE</th>
                  <th>Retardos</th><th>Desc Faltas</th><th>Desc Retardos</th><th>Total</th>
                </tr>
              </thead>
              <tbody>
                {data.map((r, i) => {
                  const alertas = r.Alertas ? r.Alertas.split(';').map(a => a.trim()).filter(Boolean) : [];
                  const hasAlerts = alertas.length > 0;
                  const isExpanded = expanded[i];

                  return (
                    <>
                      <tr key={`row-${r.id || i}`} onClick={() => hasAlerts && toggleRow(i)} style={{ cursor: hasAlerts ? 'pointer' : 'default' }}>
                        <td>
                          {hasAlerts && (isExpanded ? <ChevronDown size={14} style={{ color: 'var(--gold)' }} /> : <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />)}
                        </td>
                        <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{r.Empleado}</td>
                        <td><span className={`badge badge-${r['Ubicación'] === 'Oficina' ? 'blue' : 'green'}`}>{r['Ubicación']}</span></td>
                        <td style={{ fontFamily: 'JetBrains Mono' }}>{fmt(r['Sueldo Semanal'])}</td>
                        <td>{r['Días Trabajados'] || 0}</td>
                        <td style={{ color: r['Días Falta'] > 0 ? 'var(--red)' : '', fontWeight: r['Días Falta'] > 0 ? 600 : 400 }}>{r['Días Falta'] || 0}</td>
                        <td>{r['HE Netas'] || 0}</td>
                        <td style={{ fontFamily: 'JetBrains Mono', color: r['Pago HE'] > 0 ? 'var(--blue)' : '' }}>{r['Pago HE'] > 0 ? fmt(r['Pago HE']) : '-'}</td>
                        <td style={{ color: r['Retardos Hrs'] > 0 ? 'var(--orange)' : '' }}>
                          {r['Retardos Hrs'] ? `${r['Retardos Hrs']}h` : '-'}
                        </td>
                        <td style={{ fontFamily: 'JetBrains Mono', color: 'var(--red)' }}>{r['Desc Faltas'] > 0 ? fmt(r['Desc Faltas']) : '-'}</td>
                        <td style={{ fontFamily: 'JetBrains Mono', color: 'var(--red)' }}>{r['Desc Retardos'] > 0 ? fmt(r['Desc Retardos']) : '-'}</td>
                        <td style={{ fontFamily: 'JetBrains Mono', fontWeight: 600, color: 'var(--gold)' }}>{fmt(r['Total a Pagar'])}</td>
                      </tr>
                      {isExpanded && (
                        <tr key={`alerts-${r.id || i}`} style={{ background: 'var(--bg-secondary)' }}>
                          <td></td>
                          <td colSpan={11} style={{ padding: '12px 16px' }}>
                            <div style={{ fontSize: 12 }}>
                              {alertas.map((a, j) => {
                                const tipo = a.startsWith('FALTA') ? 'red' : a.startsWith('RETARDO') ? 'orange' : a.startsWith('FESTIVO') ? 'gold' : 'yellow';
                                const label = a.startsWith('FALTA') ? 'FALTA' : a.startsWith('RETARDO') ? 'RETARDO' : a.startsWith('FESTIVO') ? 'FESTIVO' : 'ALERTA';
                                return (
                                  <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                    <span className={`badge badge-${tipo}`} style={{ minWidth: 70, justifyContent: 'center' }}>{label}</span>
                                    <span style={{ color: 'var(--text-secondary)' }}>{a.replace(/^(FALTA|RETARDO|FESTIVO|⚠️ ALERTA BAJA):?\s*/, '')}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {!loading && semana && !data.length && (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <p style={{ color: 'var(--text-muted)' }}>No hay registros para esta semana</p>
        </div>
      )}
    </>
  );
}
