# Bescansa Leads CRM

CRM ligero e independiente para captar, gestionar y medir leads de Estudio Bescansa (casas modulares, España), con landing propia y atribución de anuncios de Meta y Google.

## Estado: aplicación completa en modo demostración; falta conectarla a un Supabase real (ver docs/08)

| Documento | Contenido |
|---|---|
| [docs/pipefy/01_CONFIGURACION_PIPEFY.md](docs/pipefy/01_CONFIGURACION_PIPEFY.md) | Configuración interna del pipe actual: fases, campos, etiquetas, miembros, correo, integraciones |
| [docs/pipefy/02_ANALISIS_DATOS_LEADS.md](docs/pipefy/02_ANALISIS_DATOS_LEADS.md) | Análisis de 977 leads: volumen, embudo, rendimiento por anuncio, calidad de datos |
| [docs/03_LANDING_ACTUAL_Y_MEJORAS.md](docs/03_LANDING_ACTUAL_Y_MEJORAS.md) | Landing actual de la agencia y propuesta de nueva landing |
| [docs/04_FORMULARIO_Y_BUYER_PERSONA.md](docs/04_FORMULARIO_Y_BUYER_PERSONA.md) | Formulario en 5 pasos, captura de buyer persona y mapeo Pipefy → CRM |
| [docs/05_INTEGRACION_META_Y_CHATBOT.md](docs/05_INTEGRACION_META_Y_CHATBOT.md) | Cómo conectar Meta y Google Ads con el CRM y estrategia de chatbot por fases |
| [docs/06_META_BUSINESS_CONFIGURACION_RELEVADA.md](docs/06_META_BUSINESS_CONFIGURACION_RELEVADA.md) | Copia de la configuración de Meta Business (cuentas, campaña, conjunto, anuncios, formulario) y los 310 leads perdidos |
| [docs/07_DISENO_CRM_MINIMO.md](docs/07_DISENO_CRM_MINIMO.md) | Diseño del CRM mínimo: alcance, embudo de 8 fases, modelo de datos, hitos |
| [docs/08_PUESTA_EN_MARCHA.md](docs/08_PUESTA_EN_MARCHA.md) | **Guía paso a paso** para conectar Supabase, cargar datos, Resend, Meta (Make), publicar CRM y landing |
| Bescansa_CRM_Leads_Documento_Descubrimiento.docx | Todo lo anterior reunido en un único Word para compartir |

## Decisiones tomadas

- CRM independiente, con imagen y stack de bescansa-app (Next.js + Supabase), proyecto Supabase nuevo y separado.
- Landing separada del CRM, estática en Netlify, que envía los leads a un endpoint del CRM.
- Todo en castellano; solo España; hasta 3–4 usuarios; escritorio primero (la landing sí es mobile first).
- Importar el histórico de Pipefy (977 leads).
- Sin dominio propio todavía para la landing.

## Datos privados

`data-private/` contiene la exportación de Pipefy con datos personales. **No se versiona ni se comparte.** El `.gitignore` la excluye.

## Qué hay construido

- **CRM** (`src/`): Hoy, Tablero (arrastrar y soltar), Leads con filtros, Ficha con historial y tareas, Reportes (por anuncio, embudo, tiempos, motivos de pérdida, coste por lead y por cierre), Campañas y gasto (carga manual o del CSV de Meta), login con Supabase Auth. Sin Supabase configurado funciona con datos ficticios.
- **Base de datos** (`supabase/migrations/`): esquema, seguridad por filas, importación, alta de usuarios.
- **Entrada de leads**: `POST /api/leads/ingest` (Make/webhooks, con clave) y `POST /api/leads/landing` (formulario público con consentimiento, antispam y límite por IP).
- **Avisos por email** (Resend): lead nuevo, reingreso, recordatorios de leads sin contactar (30 min al responsable, 2 h a administración, solo en horario laboral), resumen diario y confirmación al cliente (esta última desactivada por defecto). Tareas programadas en `vercel.json`.
- **Landing** (`landing/`): estática para Netlify, formulario en 3 pasos, captura de UTM, banner de cookies y borradores de textos legales.
- **Importador** del histórico de Pipefy y Meta.

## Cómo trabajar con el proyecto

```bash
npm install
npm test                 # 81 pruebas: esquema y RLS sobre Postgres embebido, importación, API, landing, emails, reportes
npm run import:preview   # fusiona Pipefy + Meta y muestra estadísticas (no toca ninguna base de datos)
npm run import:load      # carga el plan en Supabase (necesita .env.local; ver .env.example)
npm run check            # lint + tipos + pruebas + compilación
```

- `supabase/migrations/`: 001 esquema, 002 seguridad (RLS), 003 importación y reparto. Se aplican en orden en el proyecto de Supabase (editor SQL o CLI). Una vez aplicadas no se editan: los cambios van en migraciones nuevas.
- `POST /api/leads/ingest`: entrada de leads servidor a servidor (Make, webhooks). Exige `Authorization: Bearer <INGEST_SECRET>`.
- `data-private/`: exportaciones con datos personales y plan de importación. No se versiona.

## Resultado de la importación en seco (datos reales, 2026-09-25)

1.256 leads únicos a partir de 1.813 registros (977 de Pipefy y 836 de Meta): 557 duplicados fusionados, 5 cierres conservados y 309 leads que solo existían en Meta, que entran como prioridad alta con una tarea de contacto y se pueden repartir entre el equipo con `distribute_unassigned('sin-contactar-agencia')`.
