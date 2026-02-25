import { useState, useEffect } from 'react';
import { DollarSign, Users, AlertTriangle, Clock, TrendingUp, TrendingDown } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const fmt = (n) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 }).format(n || 0);

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [semana, setSemana] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, [semana]);

  async function load() {
    setLoading(true);
    try {
      const params = semana ? `?semana=${encodeURIComponent(semana)}` : '';
      const res = await fetch(`/api/kpis${params}`);
      const d = await res.json();
      setData(d);
      if (!semana && d.activeSemana) setSemana(d.activeSemana);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  if (loading && !data) return <div style={{ padding: 40, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>;

  const d = data || {};
  const ubData = Object.entries(d.porUbicacion || {}).map(([name, v]) => ({ name: name.length > 12 ? name.slice(0,12) + '…' : name, total: Math.round(v.totalPagar), empleados: v.empleados }));
  const COLORS = ['#c9a84c', '#60a5fa', '#34d399', '#fb923c', '#f87171', '#a78bfa'];

  return (
    <>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2>Dashboard</h2>
          <p>Resumen de nómina semanal</p>
        </div>
        {d.semanas?.length > 0 && (
          <select className="form-select" style={{ width: 260 }} value={semana} onChange={e => setSemana(e.target.value)}>
            {d.semanas.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        )}
      </div>

      {!d.nominaProcesados ? (
        <div className="card" style={{ textAlign: 'center', padding: 60 }}>
          <p style={{ color: 'var(--text-muted)', fontSize: 15 }}>No hay nóminas procesadas aún.</p>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 8 }}>Ve a "Procesar Nómina" para subir archivos de Sésamo.</p>
        </div>
      ) : (
        <>
          <div className="section-title">Resumen General</div>
          <div className="kpi-grid">
            <KPI label="Total a Pagar" value={fmt(d.totalPagar)} cls="gold" sub={`${d.nominaProcesados} empleados procesados`} />
            <KPI label="Nómina Base" value={fmt(d.nominaBase)} cls="" />
            <KPI label="Horas Extra" value={fmt(d.totalHE)} cls="blue" />
            <KPI label="Alertas" value={d.totalAlertas} cls={d.totalAlertas > 0 ? 'red' : 'green'} sub={`${d.totalFaltas} faltas totales`} />
          </div>

          <div className="section-title">Descuentos</div>
          <div className="kpi-grid">
            <KPI label="Desc. Faltas" value={fmt(d.totalDescFaltas)} cls="red" />
            <KPI label="Desc. Retardos" value={fmt(d.totalDescRetardos)} cls="red" sub={`${d.totalRetardoHrs} hrs retardo`} />
            <KPI label="Desc. Préstamos" value={fmt(d.totalDescPrestamos)} cls="" />
            <KPI label="IMSS + INFONAVIT" value={fmt(d.totalDescImss + d.totalDescInfonavit)} cls="" />
          </div>

          <div className="section-title">Empleados</div>
          <div className="kpi-grid">
            <KPI label="Empleados Activos" value={d.totalEmpleados} cls="" />
            <KPI label="Tipo Sésamo" value={d.empleadosSesamo} cls="blue" />
            <KPI label="Tipo Fijo" value={d.empleadosFijo} cls="gold" />
            <KPI label="Procesados Esta Semana" value={d.nominaProcesados} cls="green" />
          </div>

          {ubData.length > 0 && (
            <div className="card" style={{ marginTop: 24 }}>
              <div className="section-title" style={{ marginTop: 0 }}>Nómina por Ubicación</div>
              <div style={{ height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ubData} margin={{ top: 8, right: 16, bottom: 8, left: 16 }}>
                    <XAxis dataKey="name" tick={{ fill: '#666', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#666', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                    <Tooltip
                      contentStyle={{ background: '#161616', border: '1px solid #262626', borderRadius: 8, fontSize: 13 }}
                      formatter={(v) => [fmt(v), 'Total']}
                    />
                    <Bar dataKey="total" radius={[4,4,0,0]}>
                      {ubData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {d.topEmpleados?.length > 0 && (
            <div className="card" style={{ marginTop: 16 }}>
              <div className="section-title" style={{ marginTop: 0 }}>Top 10 Nóminas Más Altas</div>
              <div className="data-table-wrap" style={{ border: 'none' }}>
                <table className="data-table">
                  <thead>
                    <tr><th>#</th><th>Empleado</th><th>Ubicación</th><th style={{ textAlign: 'right' }}>Total</th></tr>
                  </thead>
                  <tbody>
                    {d.topEmpleados.map((e, i) => (
                      <tr key={i}>
                        <td>{i + 1}</td>
                        <td style={{ color: 'var(--text-primary)' }}>{e.nombre}</td>
                        <td>{e.ubicacion}</td>
                        <td style={{ textAlign: 'right', fontFamily: 'JetBrains Mono', color: 'var(--gold)' }}>{fmt(e.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}

function KPI({ label, value, cls, sub }) {
  return (
    <div className="kpi-card">
      <div className="kpi-label">{label}</div>
      <div className={`kpi-value ${cls || ''}`}>{value}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  );
}
