import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const fmt = (n) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 }).format(n || 0);
const COLORS = ['#c9a84c', '#60a5fa', '#34d399', '#fb923c', '#f87171', '#a78bfa'];

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [semana, setSemana] = useState('');
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null); // nomina records for rankings

  useEffect(() => { load(); }, [semana]);

  async function load() {
    setLoading(true);
    try {
      const params = semana ? `?semana=${encodeURIComponent(semana)}` : '';
      const [kpiRes, nomRes] = await Promise.all([
        fetch(`/api/kpis${params}`),
        fetch(`/api/nomina${params ? params : ''}`)
      ]);
      const d = await kpiRes.json();
      const nomData = await nomRes.json();
      setData(d);
      setDetail(Array.isArray(nomData) ? nomData : []);
      if (!semana && d.activeSemana) setSemana(d.activeSemana);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  if (loading && !data) return <div style={{ padding: 40, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>;

  const d = data || {};
  const records = detail || [];

  // Charts data
  const ubData = Object.entries(d.porUbicacion || {}).map(([name, v]) => ({
    name: name.length > 14 ? name.slice(0, 14) + '…' : name,
    total: Math.round(v.totalPagar),
    empleados: v.empleados,
  }));

  // HE by ubicación
  const heByUb = {};
  records.forEach(r => {
    const ub = r['Ubicación'] || 'Sin Ubicación';
    if (!heByUb[ub]) heByUb[ub] = { total: 0, horas: 0 };
    heByUb[ub].total += parseFloat(r['Pago HE']) || 0;
    heByUb[ub].horas += parseFloat(r['HE Netas']) || 0;
  });
  const heData = Object.entries(heByUb)
    .map(([name, v]) => ({ name: name.length > 14 ? name.slice(0, 14) + '…' : name, total: Math.round(v.total), horas: Math.round(v.horas * 100) / 100 }))
    .sort((a, b) => b.total - a.total);

  // Top faltas by obra (group by ubicación, then top 3 per obra)
  const faltasByUb = {};
  records.forEach(r => {
    const faltas = parseFloat(r['Días Falta']) || 0;
    if (faltas === 0) return;
    const ub = r['Ubicación'] || 'Sin Ubicación';
    if (!faltasByUb[ub]) faltasByUb[ub] = [];
    faltasByUb[ub].push({ nombre: r.Empleado, faltas, ubicacion: ub });
  });
  Object.values(faltasByUb).forEach(arr => arr.sort((a, b) => b.faltas - a.faltas));

  // Top retardos by obra
  const retardosByUb = {};
  records.forEach(r => {
    const ret = parseFloat(r['Retardos Hrs']) || 0;
    if (ret === 0) return;
    const ub = r['Ubicación'] || 'Sin Ubicación';
    if (!retardosByUb[ub]) retardosByUb[ub] = [];
    retardosByUb[ub].push({ nombre: r.Empleado, retardos: ret, ubicacion: ub });
  });
  Object.values(retardosByUb).forEach(arr => arr.sort((a, b) => b.retardos - a.retardos));

  // Global top 10
  const topFaltas = records
    .filter(r => (parseFloat(r['Días Falta']) || 0) > 0)
    .map(r => ({ nombre: r.Empleado, faltas: parseFloat(r['Días Falta']) || 0, ub: r['Ubicación'] }))
    .sort((a, b) => b.faltas - a.faltas)
    .slice(0, 10);

  const topRetardos = records
    .filter(r => (parseFloat(r['Retardos Hrs']) || 0) > 0)
    .map(r => ({ nombre: r.Empleado, retardos: parseFloat(r['Retardos Hrs']) || 0, ub: r['Ubicación'] }))
    .sort((a, b) => b.retardos - a.retardos)
    .slice(0, 10);

  const topEmpleados = records
    .map(r => ({ nombre: r.Empleado, total: parseFloat(r['Total a Pagar']) || 0, ub: r['Ubicación'] }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  return (
    <>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div><h2>Dashboard</h2><p>Resumen de nómina semanal</p></div>
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
          {/* RESUMEN GENERAL */}
          <div className="section-title">Resumen General</div>
          <div className="kpi-grid">
            <KPI label="Total a Pagar" value={fmt(d.totalPagar)} cls="gold" sub={`${d.nominaProcesados} empleados`} />
            <KPI label="Nómina Base" value={fmt(d.nominaBase)} />
            <KPI label="Horas Extra" value={fmt(d.totalHE)} cls="blue" />
            <KPI label="Alertas" value={d.totalAlertas} cls={d.totalAlertas > 0 ? 'red' : 'green'} sub={`${d.totalFaltas} faltas totales`} />
          </div>

          {/* DESCUENTOS */}
          <div className="section-title">Descuentos</div>
          <div className="kpi-grid">
            <KPI label="Desc. Faltas" value={fmt(d.totalDescFaltas)} cls="red" />
            <KPI label="Desc. Retardos" value={fmt(d.totalDescRetardos)} cls="red" sub={`${d.totalRetardoHrs} hrs retardo`} />
            <KPI label="Desc. Préstamos" value={fmt(d.totalDescPrestamos)} />
            <KPI label="IMSS + INFONAVIT" value={fmt(d.totalDescImss + d.totalDescInfonavit)} />
          </div>

          {/* EMPLEADOS */}
          <div className="section-title">Empleados</div>
          <div className="kpi-grid">
            <KPI label="Empleados Activos" value={d.totalEmpleados} />
            <KPI label="Tipo Sésamo" value={d.empleadosSesamo} cls="blue" />
            <KPI label="Tipo Fijo" value={d.empleadosFijo} cls="gold" />
            <KPI label="Procesados Esta Semana" value={d.nominaProcesados} cls="green" />
          </div>

          {/* CHARTS ROW: Nómina + HE by ubicación */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 24 }}>
            <div className="card">
              <div className="section-title" style={{ marginTop: 0 }}>Nómina por Ubicación</div>
              <ChartBar data={ubData} dataKey="total" formatter={fmt} />
            </div>
            <div className="card">
              <div className="section-title" style={{ marginTop: 0 }}>Horas Extra por Ubicación</div>
              <ChartBar data={heData} dataKey="total" formatter={fmt} colorIdx={1} />
              <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-muted)', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                {heData.map((h, i) => (
                  <span key={i}>{h.name}: <strong>{h.horas}h</strong> ({fmt(h.total)})</span>
                ))}
              </div>
            </div>
          </div>

          {/* RANKINGS ROW: Top Faltas + Top Retardos by Obra */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
            {/* TOP FALTAS BY OBRA */}
            <div className="card">
              <div className="section-title" style={{ marginTop: 0 }}>Top Faltas por Obra</div>
              {Object.entries(faltasByUb).length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Sin faltas esta semana</p>
              ) : (
                Object.entries(faltasByUb).map(([ub, emps]) => (
                  <div key={ub} style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>{ub}</div>
                    {emps.slice(0, 3).map((e, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13, borderBottom: '1px solid var(--border)' }}>
                        <span style={{ color: 'var(--text-primary)' }}>{e.nombre}</span>
                        <span style={{ fontFamily: 'JetBrains Mono', color: 'var(--red)', fontWeight: 600 }}>{e.faltas} falta{e.faltas > 1 ? 's' : ''}</span>
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>

            {/* TOP RETARDOS BY OBRA */}
            <div className="card">
              <div className="section-title" style={{ marginTop: 0 }}>Top Retardos por Obra</div>
              {Object.entries(retardosByUb).length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Sin retardos esta semana</p>
              ) : (
                Object.entries(retardosByUb).map(([ub, emps]) => (
                  <div key={ub} style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>{ub}</div>
                    {emps.slice(0, 3).map((e, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13, borderBottom: '1px solid var(--border)' }}>
                        <span style={{ color: 'var(--text-primary)' }}>{e.nombre}</span>
                        <span style={{ fontFamily: 'JetBrains Mono', color: 'var(--orange)', fontWeight: 600 }}>{e.retardos}h</span>
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* GLOBAL TOP 10s */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginTop: 16 }}>
            <RankTable title="Top 10 Nóminas" data={topEmpleados} valKey="total" formatter={fmt} color="var(--gold)" />
            <RankTable title="Top 10 Faltas" data={topFaltas} valKey="faltas" formatter={v => `${v} falta${v > 1 ? 's' : ''}`} color="var(--red)" />
            <RankTable title="Top 10 Retardos" data={topRetardos} valKey="retardos" formatter={v => `${v}h`} color="var(--orange)" />
          </div>
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

function ChartBar({ data, dataKey, formatter, colorIdx = 0 }) {
  if (!data.length) return <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Sin datos</p>;
  return (
    <div style={{ height: 220 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 16 }}>
          <XAxis dataKey="name" tick={{ fill: '#666', fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: '#666', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
          <Tooltip contentStyle={{ background: '#161616', border: '1px solid #262626', borderRadius: 8, fontSize: 13 }} formatter={v => [formatter(v), 'Total']} />
          <Bar dataKey={dataKey} radius={[4, 4, 0, 0]}>
            {data.map((_, i) => <Cell key={i} fill={COLORS[(i + colorIdx) % COLORS.length]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function RankTable({ title, data, valKey, formatter, color }) {
  return (
    <div className="card">
      <div className="section-title" style={{ marginTop: 0 }}>{title}</div>
      {!data.length ? (
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Sin datos</p>
      ) : (
        <div style={{ fontSize: 13 }}>
          {data.map((e, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 20, fontSize: 11, color: 'var(--text-muted)', textAlign: 'right' }}>{i + 1}</span>
                <div>
                  <div style={{ color: 'var(--text-primary)', fontWeight: i < 3 ? 600 : 400 }}>{e.nombre}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{e.ub}</div>
                </div>
              </div>
              <span style={{ fontFamily: 'JetBrains Mono', color, fontWeight: 600, whiteSpace: 'nowrap' }}>{formatter(e[valKey])}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
