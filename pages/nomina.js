import { useState, useRef, useEffect, useCallback } from 'react';
import { Upload, FileSpreadsheet, X, Send, CheckCircle, AlertCircle } from 'lucide-react';
import Toast from '../components/Toast';

const STEPS = [
  { at: 0, label: 'Enviando archivos a n8n...' },
  { at: 8, label: 'Procesando archivos de Sésamo...' },
  { at: 20, label: 'Cruzando con Airtable Empleados...' },
  { at: 35, label: 'Calculando nómina semanal...' },
  { at: 55, label: 'Guardando en Airtable...' },
  { at: 75, label: 'Generando reporte Excel...' },
  { at: 88, label: 'Enviando email con reporte...' },
  { at: 95, label: 'Finalizando...' },
];

const EXPECTED_DURATION = 50; // seconds

export default function ProcesarNomina() {
  const [files, setFiles] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stepLabel, setStepLabel] = useState('');
  const [result, setResult] = useState(null);
  const [toast, setToast] = useState(null);
  const [dragover, setDragover] = useState(false);
  const inputRef = useRef();
  const timerRef = useRef(null);

  // Simulated progress that advances over EXPECTED_DURATION seconds
  const startProgress = useCallback(() => {
    const startTime = Date.now();
    setProgress(0);
    setStepLabel(STEPS[0].label);

    timerRef.current = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      // Ease-out curve: fast start, slows down near end
      const raw = Math.min(elapsed / EXPECTED_DURATION, 1);
      const eased = 1 - Math.pow(1 - raw, 2); // quadratic ease-out
      const pct = Math.min(Math.round(eased * 95), 95); // cap at 95% until real response

      setProgress(pct);

      // Update step label
      for (let i = STEPS.length - 1; i >= 0; i--) {
        if (pct >= STEPS[i].at) {
          setStepLabel(STEPS[i].label);
          break;
        }
      }
    }, 300);
  }, []);

  const stopProgress = useCallback((success) => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setProgress(100);
    setStepLabel(success ? '✓ Nómina procesada' : '✗ Error al procesar');
  }, []);

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  function addFiles(newFiles) {
    const xlsxFiles = Array.from(newFiles).filter(f =>
      f.name.endsWith('.xlsx') || f.name.endsWith('.xls')
    );
    if (!xlsxFiles.length) {
      setToast({ message: 'Solo se aceptan archivos .xlsx', type: 'error' });
      return;
    }
    setFiles(prev => [...prev, ...xlsxFiles]);
    setResult(null);
  }

  function removeFile(i) {
    setFiles(prev => prev.filter((_, idx) => idx !== i));
  }

  async function process() {
    if (!files.length) return;
    setProcessing(true);
    setResult(null);
    startProgress();

    try {
      const fileData = await Promise.all(files.map(f => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve({ name: f.name, data: reader.result.split(',')[1] });
        reader.onerror = reject;
        reader.readAsDataURL(f);
      })));

      const res = await fetch('/api/nomina', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: fileData }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al procesar');

      stopProgress(true);
      setResult(data);
      setToast({ message: 'Nómina procesada correctamente', type: 'success' });
    } catch (e) {
      stopProgress(false);
      setToast({ message: e.message, type: 'error' });
      setResult({ error: e.message });
    }
    setProcessing(false);
  }

  return (
    <>
      <div className="page-header">
        <h2>Procesar Nómina</h2>
        <p>Sube los archivos Excel de Sésamo para calcular la nómina semanal</p>
      </div>

      {!processing && (
        <div
          className={`upload-area ${dragover ? 'dragover' : ''}`}
          onDragOver={e => { e.preventDefault(); setDragover(true); }}
          onDragLeave={() => setDragover(false)}
          onDrop={e => { e.preventDefault(); setDragover(false); addFiles(e.dataTransfer.files); }}
          onClick={() => inputRef.current?.click()}
        >
          <Upload size={36} />
          <p>Arrastra archivos de Sésamo aquí o haz clic para seleccionar</p>
          <p className="upload-hint">Acepta .xlsx — Puedes subir múltiples archivos (Oficina, Parks, Vaso Regulador, etc.)</p>
          <input ref={inputRef} type="file" accept=".xlsx,.xls" multiple hidden onChange={e => addFiles(e.target.files)} />
        </div>
      )}

      {files.length > 0 && !processing && !result && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="section-title" style={{ marginTop: 0 }}>Archivos seleccionados ({files.length})</div>
          {files.map((f, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
              <FileSpreadsheet size={18} style={{ color: 'var(--green)', flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: 13 }}>{f.name}</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{(f.size / 1024).toFixed(0)} KB</span>
              <button className="btn-icon" onClick={() => removeFile(i)} style={{ width: 24, height: 24 }}><X size={14} /></button>
            </div>
          ))}
          <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
            <button className="btn btn-primary" onClick={process}>
              <Send size={16} /> Procesar Nómina
            </button>
            <button className="btn btn-secondary" onClick={() => { setFiles([]); setResult(null); }}>Limpiar</button>
          </div>
        </div>
      )}

      {/* Progress bar during processing */}
      {processing && (
        <div className="card" style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div className="spinner" />
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>Procesando nómina...</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                {files.length} archivo{files.length > 1 ? 's' : ''} enviado{files.length > 1 ? 's' : ''}
              </div>
            </div>
          </div>

          {/* Bar */}
          <div style={{
            width: '100%', height: 8, background: 'var(--bg-input)',
            borderRadius: 4, overflow: 'hidden', marginBottom: 12,
          }}>
            <div style={{
              width: `${progress}%`, height: '100%',
              background: 'linear-gradient(90deg, var(--gold-dim), var(--gold))',
              borderRadius: 4,
              transition: 'width 0.3s ease',
            }} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{stepLabel}</span>
            <span style={{ fontSize: 12, fontFamily: 'JetBrains Mono', color: 'var(--gold)' }}>{progress}%</span>
          </div>
        </div>
      )}

      {/* Success result */}
      {result && !result.error && (
        <div className="card" style={{ marginTop: 16, borderColor: 'rgba(52,211,153,0.3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <CheckCircle size={20} style={{ color: 'var(--green)' }} />
            <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--green)' }}>Nómina procesada exitosamente</span>
          </div>
          <div className="kpi-grid" style={{ marginBottom: 0 }}>
            <div className="kpi-card">
              <div className="kpi-label">Periodo</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{result.periodo || '-'}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Empleados</div>
              <div className="kpi-value">{result.totalEmpleados || 0}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Total General</div>
              <div className="kpi-value gold">${(result.grandTotal || 0).toLocaleString('es-MX')}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Alertas</div>
              <div className={`kpi-value ${(result.totalAlertas || 0) > 0 ? 'red' : 'green'}`}>{result.totalAlertas || 0}</div>
            </div>
          </div>
          <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
            <button className="btn btn-primary" onClick={() => { setFiles([]); setResult(null); }}>
              Procesar otra semana
            </button>
            <button className="btn btn-secondary" onClick={() => window.location.href = '/historial'}>
              Ver en Historial
            </button>
          </div>
        </div>
      )}

      {/* Error result */}
      {result?.error && (
        <div className="card" style={{ marginTop: 16, borderColor: 'rgba(248,113,113,0.3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <AlertCircle size={20} style={{ color: 'var(--red)' }} />
            <span style={{ color: 'var(--red)', fontWeight: 500 }}>{result.error}</span>
          </div>
          <div style={{ marginTop: 12 }}>
            <button className="btn btn-secondary" onClick={() => { setResult(null); }}>
              Intentar de nuevo
            </button>
          </div>
        </div>
      )}

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </>
  );
}
