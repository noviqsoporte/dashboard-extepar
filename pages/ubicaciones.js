import { useState, useEffect } from 'react';
import { MapPin, Edit2, Plus, Power } from 'lucide-react';
import Toast from '../components/Toast';

const JORNADAS = ['Oficina', 'Obra'];
const EDIT_FIELDS = [
  { key: 'Entrada L-V', label: 'Entrada L-V', type: 'text', placeholder: '08:00' },
  { key: 'Salida L-V', label: 'Salida L-V', type: 'text', placeholder: '18:00' },
  { key: 'Entrada Sáb', label: 'Entrada Sáb', type: 'text', placeholder: '08:00' },
  { key: 'Salida Sáb', label: 'Salida Sáb', type: 'text', placeholder: '13:00' },
  { key: '# Hrs Teóricas Día', label: 'Hrs Teóricas/Día', type: 'number', placeholder: '9' },
  { key: '# Hrs Teóricas Sáb', label: 'Hrs Teóricas/Sáb', type: 'number', placeholder: '4' },
  { key: '# Hrs Comida', label: 'Hrs Comida', type: 'number', placeholder: '1' },
  { key: 'Tolerancia Min', label: 'Tolerancia (min)', type: 'number', placeholder: '10' },
];

const emptyForm = {
  'Ubicación': '', 'Tipo Jornada': 'Obra',
  'Entrada L-V': '08:00', 'Salida L-V': '18:00',
  'Entrada Sáb': '08:00', 'Salida Sáb': '13:00',
  '# Hrs Teóricas Día': '', '# Hrs Teóricas Sáb': '',
  '# Hrs Comida': '', 'Tolerancia Min': '10', 'Activa': 'Sí',
};

export default function Ubicaciones() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | 'new' | 'edit'
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/ubicaciones');
      const json = await res.json();
      setData(Array.isArray(json) ? json : []);
    } catch (e) { console.error(e); setData([]); }
    setLoading(false);
  }

  function getVal(d, key) {
    // Try exact key, then common alternatives
    if (d[key] != null && d[key] !== '') return d[key];
    const alt = key.replace('á', 'a').replace('é', 'e').replace('í', 'i').replace('ó', 'o');
    if (alt !== key && d[alt] != null) return d[alt];
    return '';
  }

  function openNew() {
    setForm({ ...emptyForm });
    setModal('new');
  }

  function openEdit(d) {
    const f = { id: d.id, 'Ubicación': d['Ubicación'] || d['Ubicacion'] || '', 'Tipo Jornada': d['Tipo Jornada'] || 'Obra' };
    EDIT_FIELDS.forEach(({ key }) => { f[key] = getVal(d, key); });
    setForm(f);
    setModal('edit');
  }

  async function save() {
    setSaving(true);
    try {
      const body = { ...form };
      if (modal === 'new') {
        body['Activa'] = 'Sí';
        delete body.id;
      }
      const res = await fetch('/api/ubicaciones', {
        method: modal === 'new' ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      setToast({ message: modal === 'new' ? 'Ubicación creada' : 'Ubicación actualizada', type: 'success' });
      setModal(null);
      load();
    } catch (e) { setToast({ message: e.message, type: 'error' }); }
    setSaving(false);
  }

  async function toggleActive(d) {
    try {
      const newState = d.Activa === 'Sí' ? 'No' : 'Sí';
      await fetch('/api/ubicaciones', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: d.id, Activa: newState }),
      });
      setToast({ message: `${d['Ubicación'] || d['Ubicacion']} ${newState === 'Sí' ? 'activada' : 'desactivada'}`, type: 'success' });
      load();
    } catch (e) { setToast({ message: e.message, type: 'error' }); }
  }

  return (
    <>
      <div className="page-header">
        <h2>Ubicaciones</h2>
        <p>Configuración de horarios por ubicación</p>
      </div>

      <div className="toolbar">
        <div style={{ flex: 1 }} />
        <button className="btn btn-primary" onClick={openNew}><Plus size={16} /> Nueva Ubicación</button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
      ) : data.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 60 }}>
          <p style={{ color: 'var(--text-muted)' }}>No se encontraron ubicaciones.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {data.map(d => {
            const nombre = d['Ubicación'] || d['Ubicacion'] || 'Sin nombre';
            const tipo = d['Tipo Jornada'] || '';
            const isActive = d.Activa === 'Sí';

            return (
              <div key={d.id} className="card" style={{ opacity: isActive ? 1 : 0.5, transition: 'opacity 0.2s' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <MapPin size={18} style={{ color: 'var(--gold)' }} />
                    <span style={{ fontWeight: 600, fontSize: 15 }}>{nombre}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className={`badge badge-${tipo === 'Oficina' ? 'blue' : 'green'}`}>{tipo || 'N/A'}</span>
                    <button className="btn-icon" onClick={() => openEdit(d)} title="Editar"><Edit2 size={14} /></button>
                    <button
                      className="btn-icon"
                      onClick={() => toggleActive(d)}
                      title={isActive ? 'Desactivar' : 'Activar'}
                      style={{ color: isActive ? 'var(--green)' : 'var(--red)' }}
                    ><Power size={14} /></button>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 13 }}>
                  {EDIT_FIELDS.map(({ key, label }) => (
                    <div key={key}>
                      <span style={{ color: 'var(--text-muted)' }}>{label}:</span>{' '}
                      <strong>
                        {getVal(d, key) || '-'}
                        {key === 'Tolerancia Min' && getVal(d, key) ? ' min' : ''}
                      </strong>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                  <span className={`status-dot ${isActive ? 'active' : 'inactive'}`} />
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{isActive ? 'Activa' : 'Inactiva'}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>{modal === 'new' ? 'Nueva Ubicación' : `Editar ${form['Ubicación']}`}</h3>

            {modal === 'new' && (
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Nombre *</label>
                  <input className="form-input" value={form['Ubicación']} onChange={e => setForm({ ...form, 'Ubicación': e.target.value })} placeholder="Ej: Parks, Tajuelo..." />
                </div>
                <div className="form-group">
                  <label className="form-label">Tipo Jornada</label>
                  <select className="form-select" value={form['Tipo Jornada']} onChange={e => setForm({ ...form, 'Tipo Jornada': e.target.value })}>
                    {JORNADAS.map(j => <option key={j} value={j}>{j}</option>)}
                  </select>
                </div>
              </div>
            )}

            <div className="section-title">Horarios</div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Entrada L-V</label>
                <input className="form-input" value={form['Entrada L-V'] || ''} onChange={e => setForm({ ...form, 'Entrada L-V': e.target.value })} placeholder="08:00" />
              </div>
              <div className="form-group">
                <label className="form-label">Salida L-V</label>
                <input className="form-input" value={form['Salida L-V'] || ''} onChange={e => setForm({ ...form, 'Salida L-V': e.target.value })} placeholder="18:00" />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Entrada Sáb</label>
                <input className="form-input" value={form['Entrada Sáb'] || ''} onChange={e => setForm({ ...form, 'Entrada Sáb': e.target.value })} placeholder="08:00" />
              </div>
              <div className="form-group">
                <label className="form-label">Salida Sáb</label>
                <input className="form-input" value={form['Salida Sáb'] || ''} onChange={e => setForm({ ...form, 'Salida Sáb': e.target.value })} placeholder="13:00" />
              </div>
            </div>

            <div className="section-title">Parámetros</div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Hrs Teóricas/Día</label>
                <input className="form-input" type="number" value={form['# Hrs Teóricas Día'] || ''} onChange={e => setForm({ ...form, '# Hrs Teóricas Día': e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Hrs Teóricas/Sáb</label>
                <input className="form-input" type="number" value={form['# Hrs Teóricas Sáb'] || ''} onChange={e => setForm({ ...form, '# Hrs Teóricas Sáb': e.target.value })} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Hrs Comida</label>
                <input className="form-input" type="number" value={form['# Hrs Comida'] || ''} onChange={e => setForm({ ...form, '# Hrs Comida': e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Tolerancia (min)</label>
                <input className="form-input" type="number" value={form['Tolerancia Min'] || ''} onChange={e => setForm({ ...form, 'Tolerancia Min': e.target.value })} />
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setModal(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </>
  );
}
