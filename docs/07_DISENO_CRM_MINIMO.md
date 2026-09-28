# Diseño del CRM mínimo (v1)

Objetivo: que cada lead que llegue de Meta, Google o la landing quede guardado en un sistema propio, se asigne, se contacte rápido y se pueda medir de qué anuncio vino y cuánto cuesta cada venta. Sin depender de la agencia.

## 1. Alcance de la v1

**Incluye:** login, tablero por fases, lista con filtros, ficha del lead con historial, tareas y seguimientos, asignación, avisos por email, importación del histórico, carga de gasto publicitario, reportes básicos y un punto de entrada único para leads.

**No incluye (v2):** WhatsApp y chatbot, subida de eventos a Meta/Google (API de conversiones), presupuestos, calendario integrado, app móvil.

## 2. Stack (el mismo que bescansa-app)

- Next.js 16 (App Router), React 19, TypeScript, Tailwind 4.
- Supabase nuevo y separado (Postgres, Auth, RLS, Storage para adjuntos).
- Resend para los emails.
- Design kit `Documents/bescansa-design-kit` (tokens, fuentes, componentes: tabla, filtros, tarjetas KPI).
- Tests con `node --test` y validación real contra Postgres antes de dar por bueno el esquema.
- Hosting: la app en Vercel o Netlify (a elegir); la landing, estática, en Netlify.

## 3. Embudo: de 11 fases a 8

| Nueva fase | Reemplaza en Pipefy | Regla |
|---|---|---|
| 1. Nuevo | Lead Nuevo | Alerta si nadie lo contacta en 30 min (horario laboral) |
| 2. Contactado | Lead Contactado | Se registran intentos (llamada sin respuesta, mensaje sin respuesta) |
| 3. Calificado | Lead Calificado | Datos mínimos completos: terreno, superficie, presupuesto, plazo |
| 4. Visita / reunión | Reagendar Visita, Diagnóstico/Visita, Llamada/Briefing | Con fecha; "reagendar" pasa a ser un seguimiento con fecha, no una fase |
| 5. Propuesta | Preparando Propuesta, Propuesta Enviada | Adjunto de propuesta y validez |
| 6. Negociación | Seguimiento Bescansa – Caliente | Seguimiento activo |
| 7. Ganado | Cierre | Valor final y fecha |
| 8. Perdido | Descartado/Perdido | **Motivo obligatorio** (lista propia: sin respuesta, precio, sin terreno, no es su perfil, compró a otro, reforma, ya no le interesa, duplicado) |

## 4. Modelo de datos (tablas principales)

- `leads`: id, creado, origen (meta_form, landing, google_form, manual, import), `external_id` (único por origen), nombre, apellidos, email, teléfono E.164, municipio/provincia, fase, prioridad, responsable, interés (casa modular / reforma / terreno / otro), etapa de proyecto (lista cerrada), superficie y presupuesto (rangos), plazo, financiación, datos de buyer persona (edad, hogar, motivo…), valor estimado, motivo de pérdida, primer contacto, intentos, próxima acción, atribución (campaña, conjunto, anuncio, `utm_*`, `fbclid`, `gclid`), consentimiento (texto, fecha, versión), `raw` (JSON original).
- `lead_events`: historial (nota, llamada, email, cambio de fase, reingreso, importación) con autor y fecha.
- `tasks`: tarea con fecha límite, responsable y lead.
- `campaigns`, `adsets`, `ads`: ids y nombres normalizados (Meta/Google).
- `ad_spend`: gasto diario por anuncio (carga manual o CSV) para calcular coste por lead, visita, propuesta y cierre.
- `profiles`: usuarios, rol (admin, ventas), activo.
- `notifications_log`, `import_batches` (trazabilidad de cada importación).

Seguridad: RLS en todas las tablas; solo usuarios autenticados y activos; la clave de servicio nunca sale del servidor; el endpoint de entrada exige un secreto firmado.

## 5. Entrada de leads (un solo punto)

`POST /api/leads/ingest` con clave secreta. Lo llaman: la landing, Make/Zapier con el formulario de Meta (fase inicial), el webhook oficial de Meta (fase 2) y el de Google Ads.

Pasos: validar → normalizar teléfono (+34) → buscar duplicado por teléfono o email → si existe, añadir evento "reingreso" y avisar; si no, crear lead → asignar → crear tarea "contactar" → enviar email → responder. Es idempotente: reenviar el mismo `external_id` no duplica.

**Asignación:** reparto rotativo entre usuarios activos, con reasignación manual.

**Alertas (horario laboral configurable):** email al responsable en cuanto entra; alerta a 30 min si sigue en "Nuevo"; escalado a administradores a las 2 h; resumen diario de leads sin contactar.

## 6. Pantallas

1. Login.
2. **Tablero** por fases (arrastrar y soltar), con contadores y filtros por responsable, origen y campaña.
3. **Lista** con búsqueda, filtros guardables y exportación a CSV.
4. **Ficha del lead:** datos, atribución, historial, tareas, adjuntos, cambio de fase (con motivo si es Perdido).
5. **Hoy:** tareas y leads sin contactar (la pantalla de trabajo diaria).
6. **Reportes:** leads por día, campaña y anuncio; % contactado en menos de 1 h y de 24 h; embudo; motivos de pérdida; coste por lead, por visita, por propuesta y por cierre.
7. **Campañas y gasto:** tabla de campañas/anuncios y carga de gasto.
8. **Importar:** Pipefy y Meta, con vista previa y detección de duplicados.
9. **Ajustes:** usuarios, roles, horario laboral, plazos de alerta, correos de aviso.

Todo en castellano, estilo del design kit.

## 7. Importación del histórico

Fuentes: Pipefy (977) y CSV de Meta (836).
- Se unifican por teléfono y correo. Se preserva el historial (fases por las que pasó, fechas, etiquetas, comentarios).
- Etiquetas de Pipefy se convierten en campos (estado de contacto, interés, origen chatbot).
- "Pregunta de calificación" se normaliza a lista cerrada; los anuncios se normalizan a `ads`.
- Los **310 leads de Meta que no estaban en Pipefy** entran como "Nuevo – urgente", asignados y con tarea de contacto.
- Se guarda cada lote en `import_batches` y se puede revertir.

## 8. Entrega por hitos

| Hito | Contenido | Resultado visible |
|---|---|---|
| H1 | Proyecto, esquema Supabase con RLS, login, design kit, importación, tablero y lista | Ver los 1.300 leads ordenados por fase |
| H2 | Punto de entrada, duplicados, asignación, tareas y avisos por email | Leads nuevos entran solos y avisan |
| H3 | Ficha completa, pantalla "Hoy", carga de gasto, reportes | Coste por lead y por venta |
| H4 | Endurecimiento (pruebas, revisión de seguridad), despliegue y copia de seguridad | Puesta en producción |

## 9. Lo que necesito de vos para empezar

1. Un **proyecto nuevo de Supabase** (creado por vos) y sus claves puestas por vos en un archivo `.env.local`; yo nunca las veo.
2. Nombre y correo de los 3–4 usuarios y su rol.
3. Correo(s) donde llegan los avisos y horario laboral (por ejemplo, lunes a viernes de 9 a 19 h).
4. Dónde alojar la app (Vercel o Netlify) y si hay un dominio para el CRM.
5. Un remitente de email verificado en Resend (o crear la cuenta).

Con la respuesta 1 puedo avanzar el H1 mientras se resuelve el resto.
