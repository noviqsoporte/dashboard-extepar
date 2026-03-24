import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Edit2, Trash2 } from 'lucide-react';
import Toast from '../components/Toast';

const UBICACIONES = ['Oficina', 'Vaso Regulador', 'Parks', 'Taller', 'Tajuelo', 'Terremoto'];
const OBRAS = ['OFICINA', 'B005', 'B007', 'PARKS', 'TALLER', 'TAJUELO', 'TERREMOTO'];
const TIPOS_PAGO = ['Sesame', 'Fijo'];
const JORNADAS = ['Oficina', 'Obra'];

const empty = {
  'Nombre Completo': '', Puesto: '', 'Ubicación': 'Oficina', Obra: 'OFICINA',
  'Sueldo Semanal': '', 'Tipo Jornada': 'Oficina', 'Código Sesame': '',
  'Centro Sesame': '', 'Depto Sesame': '', Activo: 'Sí', 'Tipo Pago': 'Sesame',
  'Descuento IMSS': 0, 'Descuento INFONAVIT': 0, 'Desc Préstamos': 0, 'Notas Estela': '',
  Timbrado: false,
};

export default function Empleados() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterUb, setFilterUb] = useState('');
  const [filterTipo, setFilterTipo] = useState('');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ ...empty });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/empleados');
      const json = await res.json();
      setData(Array.isArray(json) ? json : []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function openNew() {
    setForm({ ...empty });
    setModal('new');
  }
  function openEdit(emp) {
    setForm({ ...emp });
    setModal('edit');
  }

  async function save() {
    setSaving(true);
    try {
      const sueldo = parseFloat(form['Sueldo Semanal']) || 0;
      const salDiario = Math.round(sueldo / 7 * 100) / 100;
      const costoHora = Math.round(salDiario / 8 * 100) / 100;

      const body = {
        'Nombre Completo': form['Nombre Completo'],
        Puesto: form.Puesto,
        'Ubicación': form['Ubicación'],
        Obra: form.Obra,
        'Sueldo Semanal': sueldo,
        'Salario Diario': salDiario,
        'Costo por Hora': costoHora,
        'Tipo Jornada': form['Tipo Jornada'],
        'Código Sesame': form['Código Sesame'],
        'Centro Sesame': form['Centro Sesame'],
        'Depto Sesame': form['Depto Sesame'],
        Activo: form.Activo,
        'Tipo Pago': form['Tipo Pago'],
        'Descuento IMSS': form['Descuento IMSS'],
        'Descuento INFONAVIT': form['Descuento INFONAVIT'],
        'Desc Préstamos': form['Desc Préstamos'],
        'Notas Estela': form['Notas Estela'],
        Timbrado: !!form.Timbrado,
      };

      if (modal === 'edit') body.id = form.id;

      const res = await fetch('/api/empleados', {
        method: modal === 'new' ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error al guardar');
      }

      setToast({ message: modal === 'new' ? 'Empleado creado' : 'Empleado actualizado', type: 'success' });
      setModal(null);
      load();
    } catch (e) {
      setToast({ message: e.message, type: 'error' });
    }
    setSaving(false);
  }

  async function remove(emp) {
    if (!confirm(`¿Eliminar a ${emp['Nombre Completo']}?`)) return;
    try {
      await fetch('/api/empleados', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: emp.id }),
      });
      setToast({ message: 'Empleado eliminado', type: 'success' });
      load();
    } catch (e) {
      setToast({ message: 'Error al eliminar', type: 'error' });
    }
  }

  async function toggleTimbrado(emp) {
    const newVal = !emp.Timbrado;
    setData(prev => prev.map(e => e.id === emp.id ? { ...e, Timbrado: newVal } : e));
    
    try {
      const res = await fetch('/api/empleados', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: emp.id, Timbrado: newVal }),
      });

      if (!res.ok) {
        throw new Error('Error al actualizar Timbrado');
      }
      setToast({ message: `Timbrado ${newVal ? 'activado' : 'desactivado'} para ${emp['Nombre Completo']}`, type: 'success' });
    } catch (e) {
      setToast({ message: e.message, type: 'error' });
      load();
    }
  }

  const filtered = data.filter(e => {
    const s = search.toLowerCase();
    const matchSearch = !s || (e['Nombre Completo'] || '').toLowerCase().includes(s) || String(e['Código Sesame'] || '').includes(s);
    const matchUb = !filterUb || e['Ubicación'] === filterUb;
    const matchTipo = !filterTipo || e['Tipo Pago'] === filterTipo;
    return matchSearch && matchUb && matchTipo;
  });

  const fmtMoney = (n) => n ? `$${Number(n).toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : '-';

  return (
    <>
      <div className="page-header">
        <h2>Empleados</h2>
        <p>{data.length} empleados registrados</p>
      </div>

      <div className="toolbar">
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: 10, color: 'var(--text-muted)' }} />
          <input className="form-input" placeholder="Buscar por nombre o código..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 36 }} />
        </div>
        <select className="form-select" style={{ width: 160 }} value={filterUb} onChange={e => setFilterUb(e.target.value)}>
          <option value="">Todas ubicaciones</option>
          {UBICACIONES.map(u => <option key={u} value={u}>{u}</option>)}
        </select>
        <select className="form-select" style={{ width: 130 }} value={filterTipo} onChange={e => setFilterTipo(e.target.value)}>
          <option value="">Todos tipos</option>
          {TIPOS_PAGO.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <button className="btn btn-primary" onClick={openNew}><Plus size={16} /> Nuevo</button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
      ) : (
        <div className="data-table-wrap" style={{ maxHeight: 'calc(100vh - 240px)', overflow: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>No.</th><th>Nombre</th><th>Puesto</th><th>Ubicación</th>
                <th>Sueldo</th><th>Cód. Sesame</th><th>Tipo</th><th>Activo</th><th>Timbrado</th><th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e, i) => (
                <tr key={e.id}>
                  <td>{e['No.'] || i + 1}</td>
                  <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{e['Nombre Completo']}</td>
                  <td>{e.Puesto || '-'}</td>
                  <td><span className={`badge badge-${e['Ubicación'] === 'Oficina' ? 'blue' : 'green'}`}>{e['Ubicación']}</span></td>
                  <td style={{ fontFamily: 'JetBrains Mono' }}>{fmtMoney(e['Sueldo Semanal'])}</td>
                  <td style={{ fontFamily: 'JetBrains Mono', color: e['Código Sesame'] ? 'var(--gold)' : 'var(--text-muted)' }}>
                    {e['Código Sesame'] || '-'}
                  </td>
                  <td><span className={`badge badge-${e['Tipo Pago'] === 'Fijo' ? 'gold' : 'blue'}`}>{e['Tipo Pago']}</span></td>
                  <td><span className={`status-dot ${e.Activo === 'Sí' ? 'active' : 'inactive'}`} />{e.Activo}</td>
                  <td style={{ textAlign: 'center' }}>
                    <input 
                      type="checkbox" 
                      className="form-checkbox"
                      checked={!!e.Timbrado} 
                      onChange={() => toggleTimbrado(e)} 
                      style={{ cursor: 'pointer', width: 16, height: 16 }}
                    />
                  </td>
                  <td style={{ display: 'flex', gap: 4 }}>
                    <button className="btn-icon" onClick={() => openEdit(e)}><Edit2 size={14} /></button>
                    <button className="btn-icon" onClick={() => remove(e)} style={{ color: 'var(--red)' }}><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
              {!filtered.length && <tr><td colSpan={9} style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)' }}>Sin resultados</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>{modal === 'new' ? 'Nuevo Empleado' : 'Editar Empleado'}</h3>

            <div className="form-group">
              <label className="form-label">Nombre Completo *</label>
              <input className="form-input" value={form['Nombre Completo']} onChange={e => setForm({ ...form, 'Nombre Completo': e.target.value })} />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Puesto</label>
                <input className="form-input" value={form.Puesto || ''} onChange={e => setForm({ ...form, Puesto: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Obra</label>
                <select className="form-select" value={form.Obra || ''} onChange={e => setForm({ ...form, Obra: e.target.value })}>
                  <option value="">Sin obra</option>
                  {OBRAS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Ubicación *</label>
                <select className="form-select" value={form['Ubicación']} onChange={e => setForm({ ...form, 'Ubicación': e.target.value, 'Tipo Jornada': e.target.value === 'Oficina' ? 'Oficina' : 'Obra' })}>
                  {UBICACIONES.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Sueldo Semanal *</label>
                <input className="form-input" type="number" value={form['Sueldo Semanal']} onChange={e => setForm({ ...form, 'Sueldo Semanal': e.target.value })} />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Tipo Pago</label>
                <select className="form-select" value={form['Tipo Pago']} onChange={e => setForm({ ...form, 'Tipo Pago': e.target.value })}>
                  {TIPOS_PAGO.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Tipo Jornada</label>
                <select className="form-select" value={form['Tipo Jornada']} onChange={e => setForm({ ...form, 'Tipo Jornada': e.target.value })}>
                  {JORNADAS.map(j => <option key={j} value={j}>{j}</option>)}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Código Sesame</label>
                <input className="form-input" type="number" value={form['Código Sesame'] || ''} onChange={e => setForm({ ...form, 'Código Sesame': e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Activo</label>
                <select className="form-select" value={form.Activo} onChange={e => setForm({ ...form, Activo: e.target.value })}>
                  <option value="Sí">Sí</option>
                  <option value="No">No</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Centro Sesame</label>
                <input className="form-input" value={form['Centro Sesame'] || ''} onChange={e => setForm({ ...form, 'Centro Sesame': e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Depto Sesame</label>
                <input className="form-input" value={form['Depto Sesame'] || ''} onChange={e => setForm({ ...form, 'Depto Sesame': e.target.value })} />
              </div>
            </div>

            <div className="section-title">Descuentos</div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">IMSS</label>
                <input className="form-input" type="number" value={form['Descuento IMSS'] || 0} onChange={e => setForm({ ...form, 'Descuento IMSS': e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">INFONAVIT</label>
                <input className="form-input" type="number" value={form['Descuento INFONAVIT'] || 0} onChange={e => setForm({ ...form, 'Descuento INFONAVIT': e.target.value })} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Préstamos</label>
              <input className="form-input" type="number" value={form['Desc Préstamos'] || 0} onChange={e => setForm({ ...form, 'Desc Préstamos': e.target.value })} />
            </div>

            <div className="form-group">
              <label className="form-label">Notas</label>
              <input className="form-input" value={form['Notas Estela'] || ''} onChange={e => setForm({ ...form, 'Notas Estela': e.target.value })} />
            </div>

            <div className="form-group" style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" className="form-checkbox" style={{ width: 18, height: 18, cursor: 'pointer' }} checked={!!form.Timbrado} onChange={e => setForm({ ...form, Timbrado: e.target.checked })} id="timbrado-checkbox" />
              <label className="form-label" style={{ marginBottom: 0, cursor: 'pointer' }} htmlFor="timbrado-checkbox">Timbrado</label>
            </div>

            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setModal(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>
                {saving ? <><div className="spinner" style={{ width: 14, height: 14 }} /> Guardando...</> : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </>
  );
}
