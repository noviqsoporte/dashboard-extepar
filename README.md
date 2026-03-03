# EXTEPAR - Sistema de Nómina Semanal

Dashboard para el sistema de nómina semanal de EXTEPAR Construcciones.

**Stack:** Next.js (Pages Router) + Airtable + Vercel

**Desarrollado por:** Noviq Automatizaciones

---

## Setup

### 1. Clonar e instalar

```bash
git clone <repo-url>
cd extepar-nomina
npm install
```

### 2. Configurar variables de entorno

Copiar `.env.example` a `.env.local` y completar:

```bash
cp .env.example .env.local
```

Editar `.env.local`:

```env
AIRTABLE_PAT=pat_XXXXXXXXXX
AIRTABLE_BASE_ID=appNwMJ4eAzsgRfZ3
AIRTABLE_TABLE_EMPLEADOS=tbl6v1okElmUldo48
AIRTABLE_TABLE_NOMINA=tbl4w6GmHNDaLYoBB
AIRTABLE_TABLE_UBICACIONES=<TABLE_ID>
AIRTABLE_TABLE_REGLAS=<TABLE_ID>
AIRTABLE_TABLE_FESTIVOS=<TABLE_ID>
N8N_WEBHOOK_URL=https://n8n.srv1104036.hstgr.cloud/webhook/exteparnomina
```

> Los Table IDs se obtienen de la URL de cada tabla en Airtable.

### 3. Correr local

```bash
npm run dev
```

Abrir http://localhost:3000

### 4. Deploy en Vercel

```bash
npx vercel
```

Agregar las variables de entorno en Vercel Dashboard → Settings → Environment Variables.

---

## Arquitectura

```
Frontend (React pages)
       ↓
  /pages/api/*  (API Routes - server-side)
       ↓
  Airtable API
```

❌ El frontend NUNCA accede a Airtable directamente.
❌ Las API keys NUNCA se exponen al navegador.

---

## Secciones

| Sección | Ruta | Funcionalidad |
|---------|------|--------------|
| Dashboard | `/` | KPIs, gráficas por ubicación, top empleados |
| Empleados | `/empleados` | CRUD completo (crear, editar, eliminar) |
| Procesar Nómina | `/nomina` | Upload de archivos Sesame → n8n |
| Historial | `/historial` | Consultar nóminas procesadas por semana |
| Ubicaciones | `/ubicaciones` | Ver/editar horarios por ubicación |
| Días Festivos | `/festivos` | CRUD de días festivos |
| Reglas | `/reglas` | Editar parámetros del sistema |
