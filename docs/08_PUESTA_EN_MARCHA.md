# Puesta en marcha (guía paso a paso)

Todo lo de esta guía lo puede hacer una persona sin conocimientos técnicos siguiendo los pasos. Lo que requiere claves o cuentas lo hace el propietario; nadie más necesita ver las claves.

## 0. Antes de empezar

En la carpeta del proyecto (`C:\Users\ferna\Documents\bescansa-leads-crm`) hay una aplicación completa que funciona hoy en **modo demostración** (datos inventados). Para verla:

```bash
npm install
npm run dev
```

y abrir http://localhost:3000. Los pasos siguientes la conectan a datos reales.

## 1. Crear el proyecto en Supabase (10 min)

1. Entrar en https://supabase.com con tu cuenta → **New project**.
2. Nombre: `bescansa-leads`. **Región: una de la Unión Europea** (por ejemplo Frankfurt o París), para cumplir el RGPD.
3. Definir una contraseña de base de datos y **guardarla en un gestor de contraseñas**.
4. Esperar a que el proyecto esté listo (1–2 minutos).

## 2. Crear las tablas (5 min)

En Supabase → **SQL Editor** → **New query**. Copiar y pegar el contenido de cada archivo, **en este orden**, y pulsar **Run** en cada uno. Debe aparecer «Success».

1. `supabase/migrations/202609250001_schema.sql`
2. `supabase/migrations/202609250002_rls.sql`
3. `supabase/migrations/202609250003_import.sql`
4. `supabase/migrations/202609250004_new_user_profile.sql`
5. `supabase/migrations/202609250005_sla_alerts.sql`

## 3. Cerrar los registros y crear usuarios (5 min)

1. **Authentication → Sign In / Providers → Email**: desactivar **«Allow new users to sign up»** (imprescindible: así solo entra quien tú des de alta).
2. **Authentication → Users → Add user → Create new user**: correo y contraseña, marcando «Auto Confirm User».
3. **El primer usuario que crees será administrador** (crea primero el tuyo). Los siguientes serán «ventas» y podrás cambiar su rol después.
4. Pasar a cada persona su correo y contraseña por un canal seguro; que la cambie al entrar.

## 4. Configurar las claves (5 min)

1. Copiar `.env.example` a `.env.local` (mismo directorio).
2. En Supabase → **Project Settings → API**, copiar:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` `public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (**secreta**: nunca en la landing ni en correos).
3. Generar una clave para las integraciones y ponerla en `INGEST_SECRET`:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
4. Reiniciar `npm run dev`. Al entrar en http://localhost:3000 ya pedirá iniciar sesión.

## 5. Cargar el histórico (5 min)

```bash
npm run import:preview          # muestra estadísticas; no toca nada
npm run import:load -- --dry-run
npm run import:load             # carga 1.256 leads; se puede repetir sin duplicar
```

Después, en el SQL Editor, repartir entre el equipo los 309 leads que la agencia nunca pasó a Pipefy:

```sql
select public.distribute_unassigned('sin-contactar-agencia');
```

(Los reparte por igual entre los usuarios activos y crea una tarea de contacto para cada uno.)

## 6. Correo de avisos con Resend (10 min)

1. Crear cuenta en https://resend.com y **verificar un dominio** de la empresa (para que los correos no caigan en spam).
2. Crear una API key → `RESEND_API_KEY`; el remitente en `EMAIL_FROM` (por ejemplo `CRM Bescansa <avisos@estudiobescansa.com>`).
3. Definir `APP_URL` con la dirección pública del CRM.
4. En Supabase → Table editor → `app_settings` → fila `alertas` → añadir los correos de administración en `emails_admin` (por ejemplo `{"minutos_sin_contactar":30,"minutos_escalado":120,"emails_admin":["info@estudiobescansa.com"]}`).
5. La confirmación automática al cliente está **desactivada**. Para activarla, `SEND_LEAD_CONFIRMATION=1` (revisar antes el texto y la política de privacidad).

## 7. Publicar el CRM (15 min)

Opción recomendada: **Vercel** (es lo que usa bescansa-app); también sirve Netlify.
1. Subir el proyecto a un repositorio privado de GitHub e importarlo en Vercel.
2. Cargar en Vercel las mismas variables de `.env.local` (Settings → Environment Variables).
3. Asignar un dominio (por ejemplo `crm.estudiobescansa.com`) y ponerlo en `APP_URL`.

**Recordatorios automáticos.** Definir `CRON_SECRET` (una clave larga, como `INGEST_SECRET`). `vercel.json` programa dos tareas: los recordatorios de leads sin contactar (cada 10 minutos) y el resumen diario (lunes a viernes por la mañana). **Atención:** el plan gratuito de Vercel solo admite tareas diarias; para cada 10 minutos hace falta el plan Pro o un servicio externo gratuito como https://cron-job.org, que llame a `https://TU-CRM/api/cron/sla` cada 10 minutos con la cabecera `Authorization: Bearer <CRON_SECRET>`. Se aplican los plazos y el horario de la fila `alertas`/`horario` de `app_settings`. Aplicar también la migración `202609250005_sla_alerts.sql` (paso 2).

> `data-private/` ya está excluida del repositorio (`.gitignore`): contiene datos personales y **no debe subirse**.

## 8. Conectar el formulario de Meta (30 min)

Los leads del formulario de Meta se enviarán al CRM con **Make** (cuenta gratuita al principio).

1. En Make: nuevo escenario → módulo **Facebook Lead Ads → Watch Leads**. Conectar **tu propia cuenta de Facebook** (la que administra la Página de Estudio Bescansa) y elegir la Página y el formulario «FORM FLOJO BESCANSA».
2. Segundo módulo: **HTTP → Make a request**:
   - URL: `https://TU-CRM/api/leads/ingest` · Método: POST · Tipo de cuerpo: JSON
   - Cabecera: `Authorization: Bearer <INGEST_SECRET>`
   - Cuerpo:

   | Campo del CRM | Valor de Make |
   |---|---|
   | `source` | `meta_form` |
   | `external_id` | ID del lead de Meta (Lead ID) |
   | `meta_lead_id` | ID del lead de Meta |
   | `nombre` | Full name |
   | `email` | Email |
   | `telefono` | Phone number |
   | `etapa_proyecto` | Respuesta a «¿Le gustaría recibir un presupuesto orientativo gratuito?» |
   | `campaign` / `adset` / `ad` | Campaign name / Ad set name / Ad name |
   | `campaign_id` / `adset_id` / `ad_id` | Campaign ID / Ad set ID / Ad ID |
   | `platform` | `meta` |
   | `consent_text` | Texto legal del formulario |
3. Probar con un lead de prueba (Meta ofrece una herramienta de «Lead ads testing tool») y comprobar que aparece en el CRM y llega el aviso.
4. Activar el escenario. Cuando el volumen lo justifique, se pasa a la conexión directa por webhook (ver `docs/05`).

Mientras esta conexión no esté activa, seguir **descargando cada pocos días** el CSV del Centro de clientes potenciales: Meta solo conserva los leads unos 90 días.

## 9. Publicar la landing (20 min)

1. Editar `landing/config.js`: `apiUrl` con la dirección del CRM, teléfono y, si se usan, los identificadores del píxel de Meta y de la etiqueta de Google.
2. En el CRM, añadir la variable `LANDING_ORIGINS` con la dirección de la landing (por ejemplo `https://casas.estudiobescansa.com`).
3. Crear un sitio en **Netlify**: importar el repositorio; el archivo `netlify.toml` ya indica que se publica la carpeta `landing`. Ajustar en `netlify.toml` el dominio permitido en `connect-src`.
4. Sustituir en `landing/img/` las fotos de ejemplo (`casa-01.jpg`, `casa-02.jpg`, `casa-03.jpg`) por fotos reales.
5. **Revisar con un asesor legal** `privacidad.html`, `aviso-legal.html` y `cookies.html` y completar los datos de la empresa (marcados entre corchetes). No publicar sin este paso.
6. Confirmar con Fernando los textos marcados como `CONFIRMAR` en `index.html` (años de experiencia, presupuesto cerrado, etc.).

## 10. Lista de comprobación antes de encender la publicidad

- [ ] Entrar al CRM con cada usuario y comprobar que ve el tablero.
- [ ] Un lead de prueba de Meta llega al CRM en menos de un minuto y avisa por email.
- [ ] Un envío de prueba de la landing llega al CRM con su UTM y se guarda el consentimiento.
- [ ] La landing se ve bien en móvil y el banner de cookies funciona (los píxeles no cargan hasta aceptar).
- [ ] Los 1.256 leads históricos están y los 309 sin atender están repartidos.
- [ ] Copia de seguridad: en Supabase (plan de pago) o exportación periódica de las tablas `leads` y `lead_events`.
- [ ] Tú eres el único propietario de la Página, la cuenta publicitaria y el píxel (ver `docs/06`).
