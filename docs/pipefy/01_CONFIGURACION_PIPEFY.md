# Configuración de Pipefy — "CRM DE VENTAS <> ESTUDIO BESCANSA"

Relevado el 2026-09-25 en modo solo lectura, con la sesión de Pipefy abierta por el usuario.
Organización: Estudio Bescansa (id 302444736). Pipe id **307067345**.

## 1. Resumen ejecutivo

- Pipe único de ventas, con **11 fases**, pensado a partir de una plantilla genérica de Pipefy (quedan textos en portugués: "Nome do contato", "Telefone", "Valor do negócio", "Lembre-se de atualizar…").
- **0 automatizaciones**, **0 plantillas de email propias**, 2 miembros.
- Los leads los crea siempre el usuario **"Arquitecto de éxito"** (la agencia, `info@arquitectodeexito.es`): 977/977 tarjetas. Es decir, hay una integración externa (Meta Lead Ads / landing → Pipefy) que escribe las tarjetas. Los detalles de esa integración no están visibles desde el pipe (hay que preguntarle a la agencia cómo está montada: Zapier, Make, API…).
- Además hay un **chatbot** (etiquetas "Seguimiento CHATBOT" / "Cualificado CHATBOT") que califica leads antes de que los vea una persona.

## 2. Fases (orden del embudo)

| # | Fase | Tarjetas hoy | Tipo | Campos propios de la fase |
|---|---|---|---|---|
| 1 | 🔵 Lead Nuevo | 636 | inicial | (formulario de inicio) |
| 2 | 🟡 Lead Contactado | 101 | intermedia | Necesidades del cliente (texto largo) |
| 3 | 🟠 Lead Calificado | 38 | intermedia | Qué servicios adquiere (texto largo), Descuentos (moneda), Descriptivo de descuentos, Fecha de validez de la propuesta, Propuesta (archivo). Aviso: "actualizar el valor final del negocio". |
| 4 | ⚫️ Reagendar Visita | 15 | intermedia | Fecha del próximo follow up (fecha y hora) |
| 5 | 🟣 Diagnóstico / Visita Agendada | 0 (73 pasaron) | intermedia | Valor final de la oportunidad, Info de negociación, Contrato (archivo), **Status** (Ganado / Perdido), **Motivo de pérdida** (Otra herramienta / Falta de respuesta / Precio / Fit con el producto / Otros / Desconocido), Fecha de cierre |
| 6 | 🔷 Llamada o Visita Realizada / Briefing Completo | 0 (54 pasaron) | intermedia | ninguno |
| 7 | 🚀 Preparando Propuesta/Presupuesto | 0 (43 pasaron) | intermedia | ninguno |
| 8 | 🟢 Propuesta Enviada | 48 | intermedia | ninguno |
| 9 | Seguimiento Bescansa - Caliente | 0 (1 pasó) | intermedia | no revisada |
| 10 | ✅ Cierre | 5 | final | ninguno |
| 11 | 🔴 Descartado/Perdido | 134 | final | ninguno |

Observaciones:
- El orden real en pantalla es: Nuevo → Contactado → Calificado → Reagendar Visita → Diagnóstico/Visita → Llamada/Briefing → Preparando Propuesta → Propuesta Enviada → Seguimiento Caliente → Cierre → Descartado.
- Los campos de **Status / Motivo de pérdida / Valor final** están en la fase "Diagnóstico", que casi nadie usa como fase de reposo. Los motivos de pérdida heredados de una plantilla SaaS ("otra herramienta", "fit con el producto") no encajan con vivienda modular. En el CRM nuevo el motivo de pérdida debe pedirse **al mover a Descartado/Perdido**.
- Hay 3 fases vacías o casi vacías: candidatas a fusionarse.

## 3. Formulario de inicio ("Nova oportunidade" / "Formulário de Registro de Lead")

| Campo | Tipo | Notas |
|---|---|---|
| Nome do contato | Texto corto | Nombre |
| Apellidos | Texto corto | Vacío en 85 % de los leads |
| Telefone | Teléfono, Spain +34 | 971/977 llenos |
| Email profissional | Email | 969/977 llenos |
| Empresa | Texto corto | **Vacío en el 100 %** → eliminar |
| Valor do negócio | Moneda | **Vacío en el 100 %** → se rehace como "valor estimado del proyecto" |
| Data do fechamento esperado | Fecha | 4 de 977 |
| Temperatura do negócio | Etiquetas | 3 de 977 → sustituir por un campo de "prioridad/temperatura" o puntuación |
| Tipo de proyecto | Texto corto | Viene del formulario de la landing (140 tarjetas) |
| Pregunta de Calificación | Texto corto | Viene de Meta Lead Ads (933 tarjetas) |
| Nombre del Ad | Texto corto | Atribución manual (800) |
| Nombre del Conjunto | Texto corto | Atribución manual (800) |
| Nombre de la campaña | Texto corto | Atribución manual (800) |
| Notas sobre o negócio | Texto largo | 149 |
| Documentos | Archivo | 16 |

Ningún campo es obligatorio a nivel de captura salvo lo que exige la integración.

## 4. Vista de tarjeta y ajustes del pipe

- Vista por defecto: Kanban.
- Campos en la tarjeta kanban: Nombre, Valor del negocio, Email, Teléfono, Pregunta de calificación, Nombre del Ad.
- Vistas disponibles: Mapa, Flujo, Kanban, Lista, Informes, Formulario, Emails, Panels, Importer.
- Alerta de vencimiento: configurable (no está definida en la práctica).
- Columnas de la vista Lista: Fase, Título, Vencimiento, Asignados, Etiquetas, Tiempo en fase…

## 5. Etiquetas usadas (uso real, 340 tarjetas con alguna)

Estas etiquetas revelan el **proceso comercial real** y deben pasar al CRM nuevo como campos estructurados, no como etiquetas libres:

| Etiqueta | Usos | Significado inferido |
|---|---|---|
| Seguimiento CHATBOT | 215 | El chatbot está en conversación |
| Casa Modular | 77 | Interés: casa modular |
| No coge llamadas | 69 | Intento de contacto fallido |
| Cualificado CHATBOT | 68 | El chatbot lo calificó |
| no responde mensajes | 52 | Sin respuesta |
| esperando respuesta | 46 | Pelota en el cliente |
| Seguimiento | 27 | En seguimiento humano |
| Reunión agendada | 22 | Reunión/visita confirmada |
| Fuera de Radar | 16 | Se enfrió |
| Fria | 15 | Temperatura baja |
| Orientativo | 11 | Pide presupuesto orientativo |
| No le interesa | 10 | Descarte |
| orientativo enviado / aceptado | 6 / 4 | Estados del presupuesto orientativo |
| TERRENO | 4 | Interés: terreno |
| Vivienda Unifamiliar, Reforma Integral | 3 / 2 | Tipo de proyecto |
| rechazado, solo estaba mirando, No Cualifica, seguimiento correo, el lead va a la agencia | 1 c/u | varios |

Conclusión: existen dos dimensiones que el CRM nuevo debe modelar: **estado del contacto** (intentos, respuesta) y **tipo de interés** (casa modular / reforma / terreno).

## 6. Miembros y permisos

- 2 miembros, ambos **Administrador del pipe**: `info@estudiobescansa.com` (usuario actual) y `info@arquitectodeexito.es` (agencia).
- 325/977 tarjetas tienen asignado a alguien, casi siempre la agencia: **no hay reparto real entre vendedores**.

## 7. Correo e integraciones

- Sin plantillas de email propias (solo la predeterminada). Sin SMTP propio conectado. Sin dirección de correo del pipe configurada.
- Automatizaciones: 0. La pestaña "Integraciones" no muestra nada legible sin entrar a configuración de terceros.
- Informe guardado: **"Leads Bescansa"** (id 301088513, 977 filas). Se puede exportar por descarga o por email.

## 8. Qué se replica, qué se descarta

Replicar: fases claras, tablero kanban, ficha con historial y comentarios, adjuntos (propuestas/contratos), fecha de próximo follow-up, informe exportable, tiempo en fase.
Descartar: campos vacíos (Empresa, Valor del negocio tal cual), etiquetas libres, textos en portugués, motivos de pérdida de plantilla SaaS.
Añadir (ver `docs/04_FORMULARIO_Y_BUYER_PERSONA.md`): atribución estructurada (UTM, gclid, fbclid), reparto/asignación, SLA de primer contacto, intentos de contacto, duplicados, motivos de pérdida propios, consentimiento RGPD, reportes de coste por lead.

## 9. Pendientes de verificar

No hay contacto con la agencia, así que estos puntos se resuelven desde las cuentas propias (ver `docs/05_INTEGRACION_META_Y_CHATBOT.md`):

1. ¿Cómo entran los leads de Meta a Pipefy (Zapier/Make/API/webhook)? Se puede ver en Meta Business Suite → Integraciones → Acceso a clientes potenciales. Hay que reemplazarlo por una conexión hacia el CRM nuevo.
2. ¿Cómo funciona el chatbot (herramienta, WhatsApp, qué califica)? Se propone reemplazarlo por un flujo propio.
3. ¿Quién es propietario de la Página, el Business Manager, la cuenta publicitaria y el píxel?
4. La última entrada con volumen fue el 29-ago-2026; en septiembre solo entraron 4 leads. Hay que confirmar si las campañas están pausadas.
