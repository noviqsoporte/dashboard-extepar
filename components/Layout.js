import { useRouter } from 'next/router';
import { LayoutDashboard, Users, FileSpreadsheet, Clock, MapPin, Settings, CalendarDays, Upload, Menu, X } from 'lucide-react';
import { useState } from 'react';

const NAV = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/empleados', label: 'Empleados', icon: Users },
  { href: '/nomina', label: 'Procesar Nómina', icon: Upload },
  { href: '/historial', label: 'Historial Nómina', icon: FileSpreadsheet },
  { href: '/ubicaciones', label: 'Ubicaciones', icon: MapPin },
  { href: '/festivos', label: 'Días Festivos', icon: CalendarDays },
  { href: '/reglas', label: 'Reglas de Negocio', icon: Settings },
];

export default function Layout({ children }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <div className="app-layout">
      <button className="mobile-toggle" onClick={() => setOpen(!open)}>
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>

      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <h1>EXTEPAR</h1>
          <p>Sistema de Nómina</p>
        </div>
        <nav className="sidebar-nav">
          {NAV.map(({ href, label, icon: Icon }) => (
            <a
              key={href}
              className={`sidebar-link ${router.pathname === href ? 'active' : ''}`}
              onClick={() => { router.push(href); setOpen(false); }}
            >
              <Icon />
              {label}
            </a>
          ))}
        </nav>
        <div className="sidebar-footer">
          Noviq Automatizaciones © 2026
        </div>
      </aside>

      <main className="main-content">
        {children}
      </main>
    </div>
  );
}
