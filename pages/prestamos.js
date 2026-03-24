import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Plus, Search, Edit2, Trash2, Wallet, Building, Landmark, Trash } from 'lucide-react';
import Toast from '../components/Toast';

function Combobox({ options, value, onChange, placeholder = "Escribe para buscar..." }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const wrapperRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

  const filtered = query === '' 
    ? options 
    : options.filter(opt => opt.label.toLowerCase().includes(query.toLowerCase()));

  const selectedOption = options.find(o => o.value === value);

  return (
    <div ref={wrapperRef} style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <input
          className="form-input"
          type="text"
          placeholder={placeholder}
          value={open ? query : (selectedOption ? selectedOption.label : '')}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!open) setOpen(true);
          }}
          onClick={() => { setOpen(true); setQuery(''); }}
          style={{ cursor: 'text', paddingRight: 30 }}
        />
        <div style={{ position: 'absolute', right: 10, top: 10, pointerEvents: 'none' }}>
          <Search size={16} color="var(--text-muted)" />
        </div>
      </div>
      {open && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          marginTop: 4,
          maxHeight: 250,
          overflowY: 'auto',
          background: 'var(--bg-card, #fff)',
          border: '1px solid var(--border)',
          borderRadius: 6,
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          zIndex: 100
        }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '10px 12px', color: 'var(--text-muted)', fontSize: 14 }}>Sin resultados</div>
          ) : (
            filtered.map(opt => (
              <div
                key={opt.value}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                style={{
                  padding: '10px 12px',
                  cursor: 'pointer',
                  borderBottom: '1px solid var(--border)',
                  backgroundColor: value === opt.value ? 'rgba(14, 165, 233, 0.1)' : 'transparent',
                  color: value === opt.value ? 'var(--blue)' : 'var(--text-primary)',
                  fontSize: 14
                }}
                onMouseEnter={e => {
                  if (value !== opt.value) e.currentTarget.style.backgroundColor = 'var(--bg-body, #f8fafc)';
                }}
                onMouseLeave={e => {
                  if (value !== opt.value) e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                {opt.label}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default function Prestamos() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('todos'); // todos, personales, infonavit, fonacot
  const [modal, setModal] = useState(null); // { type: 'new' | 'edit', tab: 'personales' | 'infonavit' | 'fonacot', employee: object }
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/prestamos');
      const json = await res.json();
      setData(Array.isArray(json) ? json : []);
    } catch (e) {
      console.error(e);
      setToast({ message: 'Error al cargar datos', type: 'error' });
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Derived state for KPIs and Tabs
  const { kpis, lists } = useMemo(() => {
    const k = {
      personales: { total: 0, count: 0 },
      infonavit: { total: 0, count: 0 },
      fonacot: { total: 0, count: 0 },
    };
    const l = {
      personales: [],
      infonavit: [],
      fonacot: [],
    };

    data.forEach(emp => {
      // Préstamos Personales
      const pMonto = emp['Préstamo Monto Total'] || 0;
      const pDesc = emp['Préstamo Desc Semanal'] || 0;
      const pSaldo = emp['Préstamo Saldo'] || 0;
      if (pDesc > 0 || pSaldo > 0) {
        k.personales.total += pDesc;
        if (pSaldo > 0) k.personales.count++;
        l.personales.push(emp);
      }

      // INFONAVIT
      const iDesc = emp['INFONAVIT Desc Semanal'] || 0;
      const iSem = emp['INFONAVIT Semanas Restantes'] || 0;
      if (iDesc > 0 || iSem > 0) {
        k.infonavit.total += iDesc;
        if (iSem > 0) k.infonavit.count++;
        l.infonavit.push(emp);
      }

      // FONACOT
      const fDesc = emp['FONACOT Desc Semanal'] || 0;
      const fSem = emp['FONACOT Semanas Restantes'] || 0;
      if (fDesc > 0 || fSem > 0) {
        k.fonacot.total += fDesc;
        if (fSem > 0) k.fonacot.count++;
        l.fonacot.push(emp);
      }
    });

    return { kpis: k, lists: l };
  }, [data]);

  const filteredList = useMemo(() => {
    let list = [];
    if (activeTab === 'todos') {
      list = [
        ...lists.personales.map(e => ({ ...e, _tipo: 'Personal', _monto: e['Préstamo Monto Total'] || 0, _desc: e['Préstamo Desc Semanal'] || 0, _saldo: e['Préstamo Saldo'] || 0 })),
        ...lists.infonavit.map(e => ({ ...e, _tipo: 'INFONAVIT', _desc: e['INFONAVIT Desc Semanal'] || 0, _sem: e['INFONAVIT Semanas Restantes'] || 0 })),
        ...lists.fonacot.map(e => ({ ...e, _tipo: 'FONACOT', _desc: e['FONACOT Desc Semanal'] || 0, _sem: e['FONACOT Semanas Restantes'] || 0 }))
      ];
    } else {
      list = lists[activeTab] || [];
    }
    const s = search.toLowerCase();
    if (!s) return list;
    return list.filter(e => (e['Nombre Completo'] || '').toLowerCase().includes(s));
  }, [lists, activeTab, search]);

  const employeesWithoutActiveLoan = useMemo(() => {
    return data.filter(emp => {
      if (activeTab === 'personales') return !(emp['Préstamo Saldo'] > 0 || emp['Préstamo Desc Semanal'] > 0);
      if (activeTab === 'infonavit') return !(emp['INFONAVIT Semanas Restantes'] > 0 || emp['INFONAVIT Desc Semanal'] > 0);
      if (activeTab === 'fonacot') return !(emp['FONACOT Semanas Restantes'] > 0 || emp['FONACOT Desc Semanal'] > 0);
      return true;
    });
  }, [data, activeTab]);


  function openNew() {
    setForm({
      employeeId: '',
      pMonto: '', pDesc: '',
      iDesc: '', iSem: '',
      fDesc: '', fSem: ''
    });
    setModal({ type: 'new', tab: activeTab, employee: null });
  }

  function openEdit(emp) {
    setForm({
      employeeId: emp.id,
      pMonto: emp['Préstamo Monto Total'] || '',
      pDesc: emp['Préstamo Desc Semanal'] || '',
      iDesc: emp['INFONAVIT Desc Semanal'] || '',
      iSem: emp['INFONAVIT Semanas Restantes'] || '',
      fDesc: emp['FONACOT Desc Semanal'] || '',
      fSem: emp['FONACOT Semanas Restantes'] || '',
    });
    setModal({ type: 'edit', tab: activeTab, employee: emp });
  }

  async function save() {
    if (!form.employeeId) {
      setToast({ message: 'Selecciona un empleado', type: 'error' });
      return;
    }
    setSaving(true);
    try {
      const body = { id: form.employeeId };
      
      if (modal.tab === 'personales') {
        const monto = parseFloat(form.pMonto) || 0;
        body['Préstamo Monto Total'] = monto;
        body['Préstamo Desc Semanal'] = parseFloat(form.pDesc) || 0;
        // On new loan, saldo = monto. On edit, if you don't change it, keep the previous saldo unless requested?
        // Wait, the requirement says "Al guardar -> Préstamo Monto Total = monto, ... Préstamo Saldo = monto (se inicializa igual al total)"
        // If it's edit, do we let them change the saldo? "Editar: click en la fila -> poder cambiar Desc Semanal o cancelar préstamo (poner los 3 campos en 0)"
        // So for editing "Préstamos Personales", Monto and Saldo generally shouldn't change unless they want to cancel. Wait, the modal only allows changing Desc Semanal.
        if (modal.type === 'new') {
          body['Préstamo Saldo'] = monto;
        }
      } else if (modal.tab === 'infonavit') {
        body['INFONAVIT Desc Semanal'] = parseFloat(form.iDesc) || 0;
        body['INFONAVIT Semanas Restantes'] = parseFloat(form.iSem) || 0;
      } else if (modal.tab === 'fonacot') {
        body['FONACOT Desc Semanal'] = parseFloat(form.fDesc) || 0;
        body['FONACOT Semanas Restantes'] = parseFloat(form.fSem) || 0;
      }

      const res = await fetch('/api/prestamos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error('Error al guardar el préstamo');
      
      setToast({ message: modal.type === 'new' ? 'Préstamo registrado' : 'Préstamo actualizado', type: 'success' });
      setModal(null);
      load();
    } catch (e) {
      setToast({ message: e.message, type: 'error' });
    }
    setSaving(false);
  }

  async function cancelLoan() {
    if (!confirm('¿Estás seguro de cancelar este préstamo/descuento? Esto pondrá en 0 sus valores y se dejará de descontar.')) return;
    setSaving(true);
    try {
      const body = { id: form.employeeId };
      if (modal.tab === 'personales') {
        body['Préstamo Monto Total'] = 0;
        body['Préstamo Desc Semanal'] = 0;
        body['Préstamo Saldo'] = 0;
      } else if (modal.tab === 'infonavit') {
        body['INFONAVIT Desc Semanal'] = 0;
        body['INFONAVIT Semanas Restantes'] = 0;
      } else if (modal.tab === 'fonacot') {
        body['FONACOT Desc Semanal'] = 0;
        body['FONACOT Semanas Restantes'] = 0;
      }

      const res = await fetch('/api/prestamos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error('Error al cancelar el préstamo');
      
      setToast({ message: 'Préstamo cancelado', type: 'success' });
      setModal(null);
      load();
    } catch (e) {
      setToast({ message: e.message, type: 'error' });
    }
    setSaving(false);
  }

  const fmtMoney = (n) => n ? `$${Number(n).toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : '$0.00';

  return (
    <>
      <div className="page-header">
        <h2>Préstamos y Descuentos</h2>
        <p>Administra los descuentos semanales de los empleados</p>
      </div>

      <div className="summary-cards" style={{ marginBottom: 24 }}>
        <div className="card summary-card">
          <div className="summary-icon" style={{ background: 'rgba(14, 165, 233, 0.1)', color: 'var(--blue)' }}><Wallet size={24} /></div>
          <div className="summary-info">
            <span className="summary-label">Desc. Semanal Préstamos</span>
            <div className="summary-value" style={{ fontFamily: 'JetBrains Mono' }}>{fmtMoney(kpis.personales.total)}</div>
            <span className="summary-label" style={{ fontSize: 13, marginTop: 4 }}>{kpis.personales.count} empleado(s) activos</span>
          </div>
        </div>
        <div className="card summary-card">
          <div className="summary-icon" style={{ background: 'rgba(34, 197, 94, 0.1)', color: 'var(--green)' }}><Building size={24} /></div>
          <div className="summary-info">
            <span className="summary-label">Desc. Semanal INFONAVIT</span>
            <div className="summary-value" style={{ fontFamily: 'JetBrains Mono' }}>{fmtMoney(kpis.infonavit.total)}</div>
            <span className="summary-label" style={{ fontSize: 13, marginTop: 4 }}>{kpis.infonavit.count} empleado(s) activos</span>
          </div>
        </div>
        <div className="card summary-card">
          <div className="summary-icon" style={{ background: 'rgba(168, 85, 247, 0.1)', color: '#a855f7' }}><Landmark size={24} /></div>
          <div className="summary-info">
            <span className="summary-label">Desc. Semanal FONACOT</span>
            <div className="summary-value" style={{ fontFamily: 'JetBrains Mono' }}>{fmtMoney(kpis.fonacot.total)}</div>
            <span className="summary-label" style={{ fontSize: 13, marginTop: 4 }}>{kpis.fonacot.count} empleado(s) activos</span>
          </div>
        </div>
      </div>

      <div className="tabs" style={{ display: 'flex', gap: 8 }}>
        {['todos', 'personales', 'infonavit', 'fonacot'].map(t => (
          <button 
            key={t}
            onClick={() => setActiveTab(t)}
            style={{
              padding: '8px 16px',
              border: activeTab === t ? '1px solid #c9a84c' : '1px solid var(--border)',
              background: activeTab === t ? '#c9a84c' : 'transparent',
              color: activeTab === t ? '#000' : 'var(--text-primary)',
              borderRadius: 6,
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s',
              fontSize: 14
            }}
          >
            {t === 'todos' ? 'Todos' : t === 'personales' ? 'Préstamos Personales' : t === 'infonavit' ? 'INFONAVIT' : 'FONACOT'}
          </button>
        ))}
      </div>

      <div className="toolbar" style={{ marginTop: 20 }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: 10, color: 'var(--text-muted)' }} />
          <input className="form-input" placeholder="Buscar empleado..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 36 }} />
        </div>
        {activeTab !== 'todos' && (
          <button className="btn btn-primary" onClick={openNew}><Plus size={16} /> Agregar Requisición</button>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
      ) : (
        <div className="data-table-wrap" style={{ maxHeight: 'calc(100vh - 380px)', overflow: 'auto' }}>
          <table className="data-table">
            <thead>
              {activeTab === 'todos' && (
                <tr>
                  <th>Empleado</th><th>Ubicación</th><th>Tipo</th><th>Desc. Semanal</th><th>Detalle</th><th>Status</th>
                </tr>
              )}
              {activeTab === 'personales' && (
                <tr>
                  <th>Empleado</th><th>Ubicación</th><th>Monto Total</th><th>Desc. Semanal</th><th>Saldo Pendiente</th><th>Progreso</th><th>Status</th><th></th>
                </tr>
              )}
              {(activeTab === 'infonavit' || activeTab === 'fonacot') && (
                <tr>
                  <th>Empleado</th><th>Ubicación</th><th>Desc. Semanal</th><th>Semanas Restantes</th><th>Status</th><th></th>
                </tr>
              )}
            </thead>
            <tbody>
              {filteredList.map((e) => {
                if (activeTab === 'todos') {
                  let statusStr = "Activo";
                  let statusColor = "var(--blue)";
                  let detail = "";
                  
                  if (e._tipo === 'Personal') {
                    const prog = e._monto > 0 ? Math.min(100, Math.max(0, ((e._monto - e._saldo) / e._monto) * 100)) : 100;
                    if (e._saldo <= 0) { statusStr = "Liquidado"; statusColor = "var(--green)"; }
                    else if (e._saldo < e._desc * 3) { statusStr = "Por terminar"; statusColor = "var(--gold)"; }
                    detail = `Saldo: ${fmtMoney(e._saldo)} / ${fmtMoney(e._monto)}`;
                  } else {
                    statusColor = e._tipo === 'INFONAVIT' ? "var(--green)" : "#a855f7";
                    if (e._sem <= 0) { statusStr = "Terminado"; statusColor = "var(--text-muted)"; }
                    else if (e._sem <= 4) { statusStr = "Por terminar"; statusColor = "var(--gold)"; }
                    detail = `${e._sem} semanas rest.`;
                  }
                  
                  return (
                    <tr key={e.id + e._tipo}>
                      <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{e['Nombre Completo']}</td>
                      <td><span className={`badge badge-${e['Ubicación'] === 'Oficina' ? 'blue' : 'green'}`}>{e['Ubicación'] || '-'}</span></td>
                      <td>
                        <span style={{ 
                          fontSize: 12, fontWeight: 500, padding: '4px 8px', borderRadius: 12,
                          background: e._tipo === 'Personal' ? 'rgba(14, 165, 233, 0.1)' : e._tipo === 'INFONAVIT' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(168, 85, 247, 0.1)',
                          color: e._tipo === 'Personal' ? 'var(--blue)' : e._tipo === 'INFONAVIT' ? 'var(--green)' : '#a855f7'
                        }}>{e._tipo}</span>
                      </td>
                      <td style={{ fontFamily: 'JetBrains Mono' }}>{fmtMoney(e._desc)}</td>
                      <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>{detail}</td>
                      <td><span style={{ color: statusColor, fontSize: 12, fontWeight: 500 }}>{statusStr}</span></td>
                    </tr>
                  )
                } else if (activeTab === 'personales') {
                  const monto = e['Préstamo Monto Total'] || 0;
                  const desc = e['Préstamo Desc Semanal'] || 0;
                  const saldo = e['Préstamo Saldo'] || 0;
                  const prog = monto > 0 ? Math.min(100, Math.max(0, ((monto - saldo) / monto) * 100)) : 100;
                  
                  let statusStr = "Activo";
                  let statusColor = "var(--blue)";
                  if (saldo <= 0) {
                    statusStr = "Liquidado";
                    statusColor = "var(--green)";
                  } else if (saldo < desc * 3) {
                    statusStr = "Por terminar";
                    statusColor = "var(--gold)";
                  }

                  return (
                    <tr key={e.id} onClick={() => openEdit(e)} style={{ cursor: 'pointer' }}>
                      <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{e['Nombre Completo']}</td>
                      <td><span className={`badge badge-${e['Ubicación'] === 'Oficina' ? 'blue' : 'green'}`}>{e['Ubicación'] || '-'}</span></td>
                      <td style={{ fontFamily: 'JetBrains Mono' }}>{fmtMoney(monto)}</td>
                      <td style={{ fontFamily: 'JetBrains Mono' }}>{fmtMoney(desc)}</td>
                      <td style={{ fontFamily: 'JetBrains Mono' }}>{fmtMoney(saldo)}</td>
                      <td>
                        <div style={{ width: '100%', height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ width: `${prog}%`, height: '100%', background: statusColor }}></div>
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, textAlign: 'right' }}>{Math.round(prog)}%</div>
                      </td>
                      <td><span style={{ color: statusColor, fontSize: 12, fontWeight: 500 }}>{statusStr}</span></td>
                      <td style={{ textAlign: 'right' }}><Edit2 size={14} color="var(--text-muted)" /></td>
                    </tr>
                  )
                } else {
                  const desc = e[`${activeTab.toUpperCase()} Desc Semanal`] || 0;
                  const sem = e[`${activeTab.toUpperCase()} Semanas Restantes`] || 0;
                  
                  let statusStr = "Activo";
                  let statusColor = activeTab === 'infonavit' ? "var(--green)" : "#a855f7";
                  if (sem <= 0) {
                    statusStr = "Terminado";
                    statusColor = "var(--text-muted)";
                  } else if (sem <= 4) {
                    statusStr = "Por terminar";
                    statusColor = "var(--gold)";
                  }

                  return (
                    <tr key={e.id} onClick={() => openEdit(e)} style={{ cursor: 'pointer' }}>
                      <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{e['Nombre Completo']}</td>
                      <td><span className={`badge badge-${e['Ubicación'] === 'Oficina' ? 'blue' : 'green'}`}>{e['Ubicación'] || '-'}</span></td>
                      <td style={{ fontFamily: 'JetBrains Mono' }}>{fmtMoney(desc)}</td>
                      <td style={{ fontFamily: 'JetBrains Mono' }}>{sem}</td>
                      <td><span style={{ color: statusColor, fontSize: 12, fontWeight: 500 }}>{statusStr}</span></td>
                      <td style={{ textAlign: 'right' }}><Edit2 size={14} color="var(--text-muted)" /></td>
                    </tr>
                  )
                }
              })}
              {!filteredList.length && <tr><td colSpan={8} style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)' }}>Sin resultados</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>
              {modal.type === 'new' ? 'Agregar ' : 'Editar '}
              {modal.tab === 'personales' ? 'Préstamo Personal' : (modal.tab === 'infonavit' ? 'INFONAVIT' : 'FONACOT')}
            </h3>

            {modal.type === 'new' ? (
              <div className="form-group">
                <label className="form-label">Empleado *</label>
                <Combobox
                  options={employeesWithoutActiveLoan.map(e => ({ value: e.id, label: e['Nombre Completo'] }))}
                  value={form.employeeId}
                  onChange={val => setForm({ ...form, employeeId: val })}
                  placeholder="Escribe para buscar un empleado..."
                />
              </div>
            ) : (
              <div className="form-group">
                <label className="form-label">Empleado</label>
                <input className="form-input" disabled value={modal.employee?.['Nombre Completo'] || ''} />
              </div>
            )}

            {modal.tab === 'personales' && (
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Monto Total *</label>
                  <input className="form-input" type="number" disabled={modal.type === 'edit'} value={form.pMonto} onChange={e => setForm({...form, pMonto: e.target.value})} placeholder="Ej: 5000" />
                </div>
                <div className="form-group">
                  <label className="form-label">Descuento Semanal *</label>
                  <input className="form-input" type="number" value={form.pDesc} onChange={e => setForm({...form, pDesc: e.target.value})} placeholder="Ej: 500" />
                </div>
              </div>
            )}

            {modal.tab === 'infonavit' && (
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Descuento Semanal *</label>
                  <input className="form-input" type="number" value={form.iDesc} onChange={e => setForm({...form, iDesc: e.target.value})} placeholder="Ej: 800" />
                </div>
                <div className="form-group">
                  <label className="form-label">Semanas Restantes *</label>
                  <input className="form-input" type="number" value={form.iSem} onChange={e => setForm({...form, iSem: e.target.value})} placeholder="Ej: 104" />
                </div>
              </div>
            )}

            {modal.tab === 'fonacot' && (
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Descuento Semanal *</label>
                  <input className="form-input" type="number" value={form.fDesc} onChange={e => setForm({...form, fDesc: e.target.value})} placeholder="Ej: 300" />
                </div>
                <div className="form-group">
                  <label className="form-label">Semanas Restantes *</label>
                  <input className="form-input" type="number" value={form.fSem} onChange={e => setForm({...form, fSem: e.target.value})} placeholder="Ej: 24" />
                </div>
              </div>
            )}

            <div className="modal-actions" style={{ justifyContent: modal.type === 'edit' ? 'space-between' : 'flex-end', marginTop: 24 }}>
              {modal.type === 'edit' && (
                <button className="btn" style={{ color: 'var(--red)', padding: 0 }} onClick={cancelLoan} disabled={saving}>
                  <Trash size={16} /> Cancelar {modal.tab === 'personales' ? 'préstamo' : 'descuento'}
                </button>
              )}
              <div style={{ display: 'flex', gap: 12 }}>
                <button className="btn btn-secondary" onClick={() => setModal(null)} disabled={saving}>Cerrar</button>
                <button className="btn btn-primary" onClick={save} disabled={saving}>
                  {saving ? <><div className="spinner" style={{ width: 14, height: 14 }} /> Guardando...</> : 'Guardar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </>
  );
}
