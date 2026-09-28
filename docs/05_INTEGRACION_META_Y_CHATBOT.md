# Integración con Meta (y Google) y estrategia de chatbot

Investigación del 2026-09-25 con documentación oficial de Meta y Google y guías de terceros. Las cifras de precios de WhatsApp vienen de fuentes de terceros y deben confirmarse antes de contratar.

## 1. Situación de partida

- Todos los leads actuales llegan por **formularios nativos de Meta (Lead Ads / "Instant Forms")**. Es decir, la persona rellena el formulario dentro de Facebook o Instagram y nunca pisa la landing.
- Una conexión, montada por la agencia, copia cada lead a Pipefy. Nadie en Bescansa sabe cómo está hecha ni tiene contacto con la agencia.
- **Riesgo inmediato:** Meta solo conserva los datos de un lead unos **90 días**. Si la conexión se corta, los leads nuevos dejan de llegar y los que no se descarguen a tiempo se pierden.

## 2. Primero: recuperar el control de las cuentas (antes de programar)

Hay que confirmar que Bescansa es **propietaria** (no invitada) de estos activos. Si están a nombre de la agencia, hay que pedir la transferencia o crear cuentas propias:

1. **Página de Facebook** de Estudio Bescansa: ¿quién es administrador?
2. **Meta Business Manager / Business Suite** (business.facebook.com): ¿a nombre de quién está el negocio?
3. **Cuenta publicitaria** (Ad Account): ¿pertenece al negocio de Bescansa o al de la agencia?
4. **Píxel de Meta** y **dominio verificado**.
5. **Instagram** y su vínculo con la página.
6. **Google Ads**, **Google Analytics** y **Search Console** (misma pregunta).

Dónde ver cómo está conectado el CRM actual (se puede hacer sin la agencia): en Meta Business Suite → Configuración del negocio → **Integraciones → Acceso a clientes potenciales (Leads Access)**. Ahí aparecen las aplicaciones y personas con permiso para descargar leads (será la app de la agencia o de una herramienta tipo Zapier/Make). También en la Página → Herramientas de publicación → **Formularios** se ven los formularios con su historial de leads y se pueden **descargar en CSV** como copia de seguridad manual.

Acción recomendada ya: **descargar hoy el CSV de todos los formularios** (ya hay copia en Pipefy, pero es un seguro) y anotar quién tiene acceso.

## 3. Cómo llegan los leads de Meta a nuestro CRM: opciones

### Opción A — Intermediario (Make, Zapier, n8n, LeadSync, LeadsBridge)

Se conecta la cuenta de Facebook a la herramienta; ella recibe el lead y lo envía por HTTP al CRM.
- Ventajas: sale en **un día**, sin revisión de Meta (la app ya está aprobada por la herramienta), fácil de cambiar.
- Inconvenientes: cuota mensual (≈ 10–60 €), depende de un tercero, latencia y límites del plan, control menor sobre los reintentos.

### Opción B — Integración directa con webhook (recomendada a medio plazo)

Meta avisa a nuestro servidor cada vez que hay un lead (webhook `leadgen` sobre el objeto Página); nuestro servidor pide los datos con el `leadgen_id` a la Graph API y los guarda en el CRM.
- Ventajas: **gratis**, casi tiempo real, control total (reintentos, deduplicación, guardado del `leadgen_id` y `fbclid`), base necesaria para la **API de conversiones para CRM**.
- Requisitos técnicos (según la documentación de Meta): crear una **app de Meta**, suscribir el webhook al campo `leadgen`, suscribir la app a la Página (`POST /{page-id}/subscribed_apps?subscribed_fields=leadgen`), permisos `leads_retrieval`, `pages_manage_metadata`, `pages_show_list`, `pages_read_engagement` y `ads_management`, y pasar la **revisión de la app (App Review)**, que en la práctica exige verificación del negocio. El plazo de aprobación no está garantizado (días o semanas), por eso se tramita cuanto antes.
- Se usa un **token de usuario del sistema** (System User) de larga duración, no de un empleado, para que no caduque ni dependa de una persona.

### Recomendación

**Fase 1 (para poder lanzar en 1–2 meses):** Opción A con Make o n8n, en cuanto el CRM tenga el endpoint de captura. Coste bajo y riesgo mínimo.
**En paralelo:** iniciar verificación del negocio y App Review para la Opción B.
**Fase 2:** cambiar a webhook directo y apagar el intermediario cuando esté aprobada.

Todos los caminos terminan en el mismo endpoint del CRM (`POST /api/leads`), así que cambiar de A a B no exige rehacer nada.

## 4. Qué debe guardar cada lead de Meta

`leadgen_id` (el ID de 15–17 dígitos, clave para la API de conversiones para CRM), `form_id`, `page_id`, `ad_id`, `adset_id`, `campaign_id` y sus nombres, `created_time`, plataforma (Facebook/Instagram), respuestas del formulario (incluida la pregunta de calificación) y texto de consentimiento aceptado. Con los IDs se evita el problema actual de nombres escritos a mano.

## 5. Devolver resultados a Meta (lo que más mejora el rendimiento)

**API de conversiones para CRM ("Conversion Leads")**: el CRM envía a Meta eventos como *contactado*, *calificado*, *visita*, *propuesta*, *cierre*. Meta aprende qué leads valen la pena y optimiza los anuncios hacia personas parecidas a las que compran, no a las que solo rellenan.

Requisitos que indica Meta:
- Compatible **solo con Lead Ads (formularios instantáneos)**.
- Enviar el **ID de lead de Meta** y una etapa del embudo que ocurra dentro de **28 días** tras el lead.
- La tasa de conversión de esa etapa debe estar entre 1 % y 40 %.
- Al menos **200 leads al mes** y subida de datos **al menos una vez al día**.

Bescansa ya cumple el volumen (≈300 leads/mes en verano). La etapa a optimizar sería "Lead Calificado" (≈8 %) o "Reunión/visita agendada", que están dentro del rango. **Cerrar** (0,5 %) queda fuera del rango, así que no sirve como evento de optimización todavía.

Para los anuncios que lleven a la **landing** (no a formulario instantáneo) se usa Píxel + API de conversiones estándar (evento `Lead`) con `fbc`/`fbp`/`fbclid` y `event_id` para evitar duplicados.

## 6. Google Ads

- **Formularios de Google (lead form assets):** webhook oficial. Se configura una URL y una clave; cada lead llega por POST con la clave `google_key`, que hay que **verificar** en el servidor. Mismo endpoint del CRM.
- **Tráfico a la landing:** capturar `gclid`, `gbraid`, `wbraid` y UTM; luego subir conversiones offline (calificado, visita, cierre) o usar conversiones mejoradas para clientes potenciales.

## 7. Diseño del endpoint único de entrada

`POST /api/leads` con: `source` (meta_lead_ad | landing | google_lead_form | manual | import), datos del contacto, respuestas, atribución, consentimiento y `external_id`. El CRM valida, normaliza teléfono (+34), **detecta duplicados** (teléfono/email), crea el lead, dispara la asignación y las alertas y registra el evento. Los reintentos son idempotentes (mismo `external_id` no duplica).

## 8. Chatbot: ¿antes o después de las respuestas automáticas?

**Mi recomendación: primero respuestas automáticas y un proceso humano rápido; el chatbot va después y con un alcance estrecho.**

Razones:
1. El problema medido no es la falta de conversación automática, sino que el **65 % de los leads nunca fue contactado**. Con ≈10 leads al día, dos personas pueden responder cada lead en minutos si el CRM les avisa. Un chatbot sin proceso detrás solo mueve el cuello de botella.
2. Datos de la propia industria: contactar a un lead **en menos de 5 minutos** convierte mucho más que a la media hora. Eso se resuelve con avisos y asignación, sin IA.
3. WhatsApp exige **consentimiento explícito (opt-in)** antes de escribir a alguien, y el primer mensaje fuera de una conversación iniciada por el cliente tiene que ser una **plantilla aprobada** (con coste). El formulario de Meta y el de la landing deben incluir una casilla clara: "Acepto que Estudio Bescansa me contacte por WhatsApp".
4. La política de WhatsApp desde 2026 prohíbe los chatbots de IA generalistas, pero **permite bots con función concreta** (cualificar, agendar visitas, atender consultas) con salida a una persona. Un bot mal acotado puede poner en riesgo el número de teléfono de la empresa.

### Fases propuestas

**Fase 0 — Respuestas automáticas y alertas (con el CRM, semana 1 tras el lanzamiento)**
- Email inmediato al lead: "Hemos recibido tu solicitud" + qué pasa ahora + plazo real + enlace para completar la ficha (paso 2–5 del formulario).
- Aviso al equipo por email (y push/Telegram si se quiere) con datos del lead; tarea "contactar en < 5–30 min en horario laboral".
- Asignación por turnos y alerta de "sin contactar" a las 2 h y a las 24 h.

**Fase 1 — WhatsApp con plantilla y respuestas guiadas (sin IA)**
- Al entrar el lead con opt-in, se envía una plantilla: "Hola {nombre}, soy del equipo de Estudio Bescansa, hemos recibido tu solicitud sobre una casa modular. ¿Tienes ya el terreno?" con **botones**: Sí, tengo terreno / Estoy buscando / Aún no.
- Flujo de 4–5 preguntas con botones (terreno, m², presupuesto, plazo) que rellena los campos del CRM y puntúa al lead.
- Cuando el lead responde, se abre una ventana de **24 h** en la que las respuestas son gratuitas.
- Al terminar o ante cualquier duda, **se pasa a un humano** con el resumen ya cargado en la ficha.

**Fase 2 — IA acotada (cuando la Fase 1 funcione)**
- Un modelo de lenguaje atiende preguntas frecuentes (plazos, qué incluye, licencias) usando solo una base de conocimiento de Bescansa; no responde precios cerrados ni promete nada fuera de lo definido; deriva a persona ante cualquier duda.
- Registra todas las conversaciones en la ficha del CRM.

### Construir o comprar

- **Herramientas listas** (Landbot, Manychat, Respond.io, Wati, etc.): rápidas de arrancar, con coste mensual (≈ 30–150 €/mes) y menos control de los datos.
- **A medida** sobre la API oficial de WhatsApp Business (Cloud API) y nuestro CRM: más control y datos propios, pero exige alta de la cuenta de WhatsApp Business y una plantilla aprobada, y más desarrollo.

Sugerencia: empezar con una herramienta lista o con un flujo mínimo propio (Fase 1) para validar, y llevarlo a medida solo si el volumen y la necesidad lo justifican.

### Costes orientativos de WhatsApp en España (a confirmar)

Según fuentes de terceros para 2026: mensajes de utilidad ≈ 0,017 € cada uno, de marketing ≈ 0,051 €, y las respuestas dentro de las 24 h posteriores a un mensaje del cliente son gratuitas. Con 300 leads al mes, una plantilla de entrada costaría entre ≈ 5 y 15 €/mes más el IVA (21 %) y la cuota de la plataforma. El coste no es el obstáculo; lo son el consentimiento, la aprobación de plantillas y el diseño del flujo.

## 9. Sobre el chatbot actual de Pipefy

No se sabe cómo funciona (nadie lo ha visto desde Bescansa). Los datos indican que:
- 215 leads tienen la etiqueta "Seguimiento CHATBOT" y 68 "Cualificado CHATBOT".
- Es decir, califica a menos de un tercio de los leads que toca.
- Probablemente lo opera y factura la agencia.

Hay que decidir si se conserva (dependería de la agencia) o si se reemplaza por el flujo propio de la Fase 1. Mi propuesta es reemplazarlo, porque un chatbot que la empresa no controla no se puede medir ni mejorar.

## 10. Plan de acción resumido

| # | Acción | Quién | Cuándo |
|---|---|---|---|
| 1 | Confirmar propiedad de Página, Business Manager, cuenta publicitaria, píxel, Google Ads | Fernando | Esta semana |
| 2 | Descargar CSV de formularios de Meta y revisar Leads Access | Fernando | Esta semana |
| 3 | Iniciar verificación del negocio y crear la app de Meta | Fernando + Claude | Semana 1–2 |
| 4 | Construir el endpoint `POST /api/leads` y las alertas | Claude | Con el CRM |
| 5 | Conectar Meta con Make/n8n al endpoint | Claude | Antes de lanzar |
| 6 | Presentar App Review y pasar a webhook directo | Claude + Fernando | Semanas 3–8 |
| 7 | Envío de eventos a Meta (API de conversiones para CRM) | Claude | Tras 2–4 semanas de datos |
| 8 | WhatsApp Fase 1 (plantilla + botones) | Claude | Después del lanzamiento |

## Fuentes

- [Lead Ads · Meta for Developers](https://developers.facebook.com/documentation/ads-commerce/marketing-api/guides/lead-ads)
- [Webhooks para Lead Ads y CRM · Meta](https://developers.facebook.com/documentation/ads-commerce/marketing-api/guides/lead-ads/quickstart/webhooks-integration)
- [Conversions API para integración con CRM · Meta](https://developers.facebook.com/documentation/ads-commerce/conversions-api/conversion-leads-integration)
- [Lead Form Webhook · Google for Developers](https://developers.google.com/google-ads/webhook/docs/overview)
- [Webhook para formularios de Google Ads · Ayuda](https://support.google.com/google-ads/answer/16729613?hl=en)
- [Política de IA de WhatsApp 2026 · respond.io](https://respond.io/blog/whatsapp-general-purpose-chatbots-ban)
- [Precios WhatsApp Business API en España 2026](https://whautomate.com/whatsapp-business-api-pricing-spain)
- [Meta Instant Forms y chatbots de WhatsApp · Landbot](https://landbot.io/blog/meta-instant-forms-whatsapp-chatbots)
