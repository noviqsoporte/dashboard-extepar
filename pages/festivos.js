import { useState, useEffect } from 'react';
import { Plus, Trash2, CalendarDays } from 'lucide-react';
import Toast from '../components/Toast';

export default function Festivos() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ Fecha: '', Nombre: '', 'Obligatorio LFT': 'Sí', Activo: 'Sí' });
  const [toast, setToast] = useState(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/festivos');
      setData(await res.json());
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  async function save() {
    try {
      await fetch('/api/festivos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      setToast({ message: 'Festivo agregado', type: 'success' });
      setModal(false);
      setForm({ Fecha: '', Nombre: '', 'Obligatorio LFT': 'Sí', Activo: 'Sí' });
      load();
    } catch (e) { setToast({ message: e.message, type: 'error' }); }
  }

  async function toggle(item) {
    try {
      await fetch('/api/festivos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, Activo: item.Activo === 'Sí' ? 'No' : 'Sí' }),
      });
      load();
    } catch (e) { setToast({ message: e.message, type: 'error' }); }
  }

  async function remove(item) {
    if (!confirm(`¿Eliminar ${item.Nombre}?`)) return;
    try {
      await fetch('/api/festivos', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id }),
      });
      setToast({ message: 'Eliminado', type: 'success' });
      load();
    } catch (e) { setToast({ message: e.message, type: 'error' }); }
  }

  return (
    <>
      <div className="page-header">
        <h2>Días Festivos</h2>
        <p>Administra los días festivos para el cálculo de nómina (Factor ×3)</p>
      </div>

      <div className="toolbar">
        <div style={{ flex: 1 }} />
        <button className="btn btn-primary" onClick={() => setModal(true)}><Plus size={16} /> Agregar Festivo</button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
      ) : (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr><th>Fecha</th><th>Nombre</th><th>Obligatorio LFT</th><th>Activo</th><th></th></tr>
            </thead>
            <tbody>
              {data.map(d => (
                <tr key={d.id}>
                  <td style={{ fontFamily: 'JetBrains Mono' }}>{d.Fecha}</td>
                  <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{d.Nombre}</td>
                  <td><span className={`badge badge-${d['Obligatorio LFT'] === 'Sí' ? 'green' : 'yellow'}`}>{d['Obligatorio LFT']}</span></td>
                  <td>
                    <button className={`btn btn-sm ${d.Activo === 'Sí' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => toggle(d)}>
                      {d.Activo === 'Sí' ? 'Activo' : 'Inactivo'}
                    </button>
                  </td>
                  <td><button className="btn-icon" onClick={() => remove(d)} style={{ color: 'var(--red)' }}><Trash2 size={14} /></button></td>
                </tr>
              ))}
              {!data.length && <tr><td colSpan={5} style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)' }}>Sin festivos registrados</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Nuevo Día Festivo</h3>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Fecha</label>
                <input className="form-input" type="date" value={form.Fecha} onChange={e => setForm({ ...form, Fecha: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Nombre</label>
                <input className="form-input" value={form.Nombre} onChange={e => setForm({ ...form, Nombre: e.target.value })} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Obligatorio LFT</label>
                <select className="form-select" value={form['Obligatorio LFT']} onChange={e => setForm({ ...form, 'Obligatorio LFT': e.target.value })}>
                  <option value="Sí">Sí</option><option value="No">No</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Activo</label>
                <select className="form-select" value={form.Activo} onChange={e => setForm({ ...form, Activo: e.target.value })}>
                  <option value="Sí">Sí</option><option value="No">No</option>
                </select>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={save}>Guardar</button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </>
  );
}
