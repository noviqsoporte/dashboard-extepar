import { useState, useEffect } from 'react';
import { Settings, Edit2, Check, X } from 'lucide-react';
import Toast from '../components/Toast';

export default function Reglas() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [toast, setToast] = useState(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/reglas');
      setData(await res.json());
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  async function save(item) {
    try {
      await fetch('/api/reglas', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, Valor: editValue }),
      });
      setToast({ message: 'Regla actualizada', type: 'success' });
      setEditingId(null);
      load();
    } catch (e) { setToast({ message: e.message, type: 'error' }); }
  }

  return (
    <>
      <div className="page-header">
        <h2>Reglas de Negocio</h2>
        <p>Parámetros del sistema de nómina</p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
      ) : (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr><th>Parámetro</th><th>Valor</th><th>Notas</th><th></th></tr>
            </thead>
            <tbody>
              {data.map(d => (
                <tr key={d.id}>
                  <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Settings size={14} style={{ color: 'var(--gold)' }} />
                      {d['Parámetro'] || d.Parametro}
                    </div>
                  </td>
                  <td>
                    {editingId === d.id ? (
                      <input className="form-input" style={{ width: 160, padding: '4px 8px' }} value={editValue}
                        onChange={e => setEditValue(e.target.value)} autoFocus onKeyDown={e => e.key === 'Enter' && save(d)} />
                    ) : (
                      <span style={{ fontFamily: 'JetBrains Mono', color: 'var(--gold)' }}>{d.Valor}</span>
                    )}
                  </td>
                  <td style={{ maxWidth: 300, whiteSpace: 'normal', fontSize: 12, color: 'var(--text-muted)' }}>{d.Notas}</td>
                  <td>
                    {editingId === d.id ? (
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn-icon" onClick={() => save(d)} style={{ color: 'var(--green)' }}><Check size={14} /></button>
                        <button className="btn-icon" onClick={() => setEditingId(null)}><X size={14} /></button>
                      </div>
                    ) : (
                      <button className="btn-icon" onClick={() => { setEditingId(d.id); setEditValue(d.Valor || ''); }}><Edit2 size={14} /></button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </>
  );
}
