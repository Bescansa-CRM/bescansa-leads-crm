# Meta Business: configuración relevada (para poder reconstruirla)

Relevado el 2026-09-25 en modo solo lectura con la sesión de Chrome del usuario. No se cambió nada. Este documento es una copia de seguridad de la configuración por si alguien borra o altera los activos.

## 1. Alerta urgente: se están perdiendo leads

Comparando el Centro de clientes potenciales de Meta (836 leads descargados) con Pipefy:
- **310 leads de Meta no existen en Pipefy** (por email o teléfono): 3 en julio, 98 en agosto y **209 en septiembre**.
- En septiembre, Meta registró 216 leads y Pipefy solo tiene 4 tarjetas creadas ese mes. La conexión entre Meta y Pipefy dejó de funcionar hacia finales de agosto y nadie contactó a esos leads.
- Los leads siguen entrando en Meta (hay de hoy, 25-sep).
- Meta solo conserva los leads unos 90 días. La lista está guardada en `data-private/LEADS_META_NO_ENTRARON_A_PIPEFY.csv` (contiene datos personales, no compartir).
- El coste por lead es de ≈ 1 €. Cada lead sin contactar es dinero de publicidad perdido.

Acciones inmediatas: (1) contactar a los 310 leads, empezando por los más recientes; (2) importarlos al CRM nuevo; (3) hasta que exista el CRM, descargar el CSV del Centro de clientes potenciales cada pocos días.

## 2. Activos y propiedad

| Activo | Dato | Estado |
|---|---|---|
| Portfolio comercial (Business) | "Estudio Bescansa", id 2422295041524857 | Es el negocio activo (1 cuenta publicitaria, 1 página, 2 personas) |
| Otros negocios de Fernando | "Estudio Bescansa" (sin activos) y "Estudio Bescansa Ads" (sin activos) | Vacíos |
| Página de Facebook | "Estudio Bescansa", id 1010348402166306 | Propiedad de Estudio Bescansa; 2 personas con acceso total |
| Cuenta publicitaria | "Estudio Bescansa", id 1075058761494496 | Propiedad de Estudio Bescansa; 2 personas con acceso total |
| Instagram | Ninguna cuenta agregada al portfolio (los anuncios usan la identidad "e_bescansa") | Sin vincular al portfolio |
| WhatsApp | Sin cuentas | Vacío |
| Apps | Ninguna | Vacío |
| Socios (partners) | Ninguno | Vacío |
| Usuarios del sistema | Ninguno | Vacío |
| Dominios verificados | Ninguno | Vacío |
| Píxel / conjuntos de datos | No se pudo consultar (el Administrador de eventos no cargó) | Pendiente |

Personas con acceso total al portfolio y a la cuenta publicitaria (incluye "Finanzas: ver y administrar"):
1. **Fernando Sagardia** (fsagardia@estudiobescansa.com).
2. **Felipe Moraes** (cuenta personal de Gmail). No se sabe si es de la agencia; conviene confirmarlo.

Riesgo: cualquiera de los dos administradores puede quitar al otro o borrar activos. Ver sección 8.

## 3. Campaña

**CASAS MODULARES | LEAD NATIVO | 04.06.26** (activa)
- Objetivo: clientes potenciales, con formularios instantáneos (Instant Forms).
- Presupuesto de campaña: 15,33 €/día (se reparte entre los conjuntos).
- Últimos 30 días (26-ago a 24-sep): 294 leads, 1,13 € por lead, 331,30 € gastados, 57.028 impresiones.
- Recomendaciones de Meta pendientes: 2 (Advantage+ ubicaciones y campaña de clientes potenciales Advantage+); puntuación de la cuenta 82/100.

**CONVERSIÓN LEAD NATIVO | 13.03.26** (desactivada, 10 €/día, sin gasto reciente). Es la campaña original de marzo.

## 4. Conjunto de anuncios (único)

**ARQUITECTURA | HM | FEED REELS | 25 - 60** (activo, 9 anuncios)
- Ubicación de la conversión: **Formularios instantáneos**, página Estudio Bescansa (Condiciones de anuncios de clientes potenciales aceptadas).
- Objetivo de rendimiento: **Maximizar el número de clientes potenciales**.
- Estrategia de puja: **volumen más alto**, sin objetivo de coste por resultado.
- Presupuesto: el de la campaña (sin límites de gasto por conjunto). Calendario: continuo.
- Público: **Advantage+ activado**. Lugar: **España: La Coruña (+37 millas), Galicia** (solo Galicia, no toda España). Edad mínima 18 (el nombre dice 25–60, pero no es un límite duro con Advantage+). Idiomas: todos. Sin públicos personalizados incluidos ni excluidos. Sin segmentación detallada.
- Contenido dinámico: desactivado. Reglas de valor: no.
- Tamaño de público estimado: 822.500 – 967.700 personas.

## 5. Anuncios (18 en la cuenta, 9 en este conjunto)

En este conjunto: AD01 Reforma tu piso, AD01 Casas modulares Coruña, AD02 Reforma integral cocina, AD02 Diseño modular premium, AD03 Creativo antes y después, AD04 Reforma integral espacio abierto, AD05 Reformas integrales, AD06 Construye tu casa, AD07 Reforma integral.

Formato: imagen o vídeo único, con "publicación existente" como base; identidad: página Estudio Bescansa e Instagram e_bescansa.

Rendimiento de los últimos 30 días (solo los activos):

| Anuncio | Leads | Coste por lead | Gasto |
|---|---|---|---|
| AD01 – Casas modulares Coruña | 264 | 0,97 € | 256,39 € |
| AD02 – Diseño modular premium | 30 | 2,49 € | 74,57 € |
| AD07 – Reforma integral | 0 | — | 0,34 € |

Solo AD01, AD02 y AD07 están activos (los demás están desactivados). Los textos, imágenes y titulares de cada anuncio **no se pudieron leer** (usan publicaciones existentes); habrá que guardarlos por separado, ver sección 7.

## 6. Formulario de clientes potenciales (definición completa)

**FORM FLOJO BESCANSA**: activo, creado el 13-mar-2026, 838 leads, uso compartido "Restringido", 0 caducados. Es el único formulario.

Estructura (5 pantallas, tipo "más volumen"):
1. **Introducción** (pantalla "Formulario"): título *"Solicita tu presupuesto gratuito para tu reforma"*; texto *"Si lo deseas, también podemos enviarte un presupuesto orientativo gratuito para tu reforma en La Coruña y alrededores."* (Atención: habla de **reforma**, no de casa modular.)
2. **Pregunta personalizada** (opción única): *"¿Le gustaría recibir un presupuesto orientativo gratuito?"* con tres respuestas: "Sí, me gustaría recibirlo", "Solo quiero recibir información por ahora", "He pulsado por error".
3. **Información de contacto**: *"Nuestro equipo te enviará información sobre tu proyecto."* Campos: correo electrónico, nombre y apellidos, número de teléfono.
4. **Política de privacidad**: *"Al hacer clic en Enviar, aceptas que tu información se envíe a Estudio Bescansa, que la usará según su política de privacidad. Facebook también la usará según nuestra Política de datos..."* Enlace a la política de privacidad de Estudio Bescansa. Botón: Enviar.
5. **Pantalla final**: *"Gracias, todo está listo. Nuestro equipo revisará tu información y se pondrá en contacto contigo lo antes posible. También puedes visitar nuestra web si lo deseas."* Botón "Visitar sitio web". Si eligen "He pulsado por error" se muestra un agradecimiento y no se envía nada.

Observaciones:
- **Consentimiento a nombre de Estudio Bescansa únicamente.** El texto legal dice que los datos se envían a Estudio Bescansa. Compartirlos con otras constructoras o gestores no está cubierto por lo que aceptó la persona (consultar con un abogado).
- **Texto de "reforma":** el formulario habla de reforma, mientras que la oferta es vivienda modular. Eso explica en parte los leads de reforma y el alto descarte que se vio en Pipefy. Debe corregirse en la versión nueva.
- La pregunta pide respuesta sobre presupuesto orientativo, no sobre terreno ni tipo de proyecto; por eso Pipefy solo tiene la respuesta a esa pregunta y no la etapa del proyecto.
- El CSV de Meta trae solo nombre, correo y teléfono (la respuesta a la pregunta no viene). Todos los leads: origen "Pagada", canal "Correo electrónico", etapa "Registrado", sin propietario asignado.
- Los valores "Explorando ideas", "Tengo el terreno, busco proyecto" y "Tengo el proyecto, quiero presupuesto" que aparecen en Pipefy pertenecen al formulario de la landing de la agencia, no a este formulario.

**Anuncio principal (AD01 – Casas modulares Coruña):** texto principal que empieza por *"¿Buscas una vivienda moderna, eficiente y diseñada para ti?…"* (el resto no se pudo leer), botón "Registrarte", dos imágenes de casa modular con el texto "Casas modulares A Coruña", identidad Facebook Estudio Bescansa e Instagram e_bescansa. Formato: imagen única/secuencia sobre una publicación existente.

## 6 bis. Cómo llegan los leads a Pipefy: no consta en Meta

En Meta Business Suite → Formularios → Configuración de CRM **no hay ningún CRM conectado** (Excel, Google Sheets, Zapier, HubSpot, Gmail aparecen como opciones sin conectar). Tampoco hay apps, socios ni usuarios del sistema en el portfolio.

Eso significa que la conexión con Pipefy usa otro camino, casi seguro una herramienta (Zapier, Make u otra) autenticada con la cuenta personal de Facebook de un administrador de la Página, o una app externa con acceso a leads. Por lo tanto:
- La conexión depende de una persona: si esa persona cambia la contraseña, sale de la Página o revoca el permiso, los leads dejan de llegar sin ningún aviso. Encaja con lo que se ve (los leads siguen en Meta pero no en Pipefy).
- Para saber quién la creó hay que revisar en Pipefy la integración del pipe (Pipefy → Integraciones/Conexiones) y en la cuenta de Facebook de cada administrador → Configuración → Apps y sitios web.
- La "Configuración de acceso a clientes potenciales" de la Página está en "por defecto": cualquier administrador de la Página y cualquier CRM conectado puede leer los leads.

## 7. Qué falta copiar (y cómo hacerlo en 10 minutos)

Para poder reconstruir todo, hay que guardar además, desde la interfaz de Meta:
1. **Formulario instantáneo**: Meta Business Suite → Más herramientas → Formularios (o desde el anuncio, "Editar formulario") → capturar pantallas de cada paso: introducción, preguntas, política de privacidad, mensaje final.
2. **Cada anuncio activo**: Administrador de anuncios → abrir el anuncio → capturas del texto principal, titular, descripción, llamada a la acción, imagen o vídeo (descargar la creatividad en la biblioteca de medios).
3. **Píxel y eventos**: Administrador de eventos → Orígenes de datos.
4. **Métodos de pago y facturación**: solo por seguridad, sin guardar datos de tarjeta.
5. **Página**: nombre, categoría, foto de perfil, portada, biografía, teléfono, dirección, horario.
6. **Descargar las imágenes y vídeos** de los anuncios desde la Biblioteca de medios.

## 8. Cómo protegerse del "administrador que borra todo"

Sin cambiar nada todavía (son decisiones tuyas):
1. **Verificar quién es Felipe Moraes** y qué relación tiene con Bescansa o con la agencia.
2. **Añadir a otra persona de confianza de Bescansa** como administrador con un correo corporativo, para que no dependa de una sola cuenta.
3. **Reducir los permisos de Felipe** a acceso parcial (por ejemplo, solo gestionar anuncios) y quitar el permiso "Finanzas" si no lo necesita. Un administrador con acceso total puede quitar a otros.
4. **Activar la autenticación en dos pasos** en tu cuenta y la de cualquier administrador.
5. **Iniciar la verificación del negocio** en Configuración del negocio → Centro de seguridad, y añadir el dominio propio cuando exista.
6. **Vincular la cuenta de Instagram** y el píxel al portfolio de Bescansa.
7. Guardar esta documentación, las creatividades y los CSV en un almacenamiento propio de la empresa.

## 9. Datos guardados

- `data-private/meta_leads_export_2026-09-25.csv`: 836 leads de Meta (datos personales).
- `data-private/LEADS_META_NO_ENTRARON_A_PIPEFY.csv`: 310 leads sin contactar.
- `data-private/pipefy_leads_full_2026-09-25.xlsx`: 977 leads de Pipefy.
