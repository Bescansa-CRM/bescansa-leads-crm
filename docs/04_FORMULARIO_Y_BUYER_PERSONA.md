# Formulario de la landing y captura del buyer persona

Base: la respuesta de Codex sobre información mínima para presupuestar una vivienda modular + lo observado en Pipefy y en la landing actual. Principio: **pedir poco al principio, permitir "No lo sé", usar rangos y dejar opcional todo lo que no bloquea el primer contacto.**

## 1. Formulario recomendado: 5 pasos cortos

### Paso 1 — Ubicación y terreno
| Campo | Tipo | Obligatorio |
|---|---|---|
| Provincia y municipio (o código postal) | selector / CP | Sí |
| Situación del terreno | Tengo terreno propio / Lo tengo reservado / Busco terreno / No tengo terreno | Sí |
| Superficie de la parcela (m²) | número o "No lo sé" | No |
| Referencia catastral o dirección | texto | No |

### Paso 2 — La vivienda
| Campo | Tipo | Obligatorio |
|---|---|---|
| Superficie deseada | rangos (hasta 60 / 60–90 / 90–120 / 120–165 / más de 165 / no lo sé) + m² exactos opcional | Sí |
| Dormitorios | 1 / 2 / 3 / 4 / 5+ | Sí |
| Baños | 1 / 2 / 3+ | No |
| Plantas | Una / Dos / Indiferente | No |
| Uso | Habitual / Segunda residencia / Alquiler | Sí |
| Alcance | Solo vivienda / Vivienda instalada / Llave en mano / No lo sé | No |

### Paso 3 — Acabados y extras (todo opcional)
Estilo (tarjetas visuales), nivel de acabados (esencial / estándar / superior), cocina incluida, porche/garaje/terraza, climatización (aerotermia / otro / recomendar), eficiencia, necesidades especiales (accesibilidad, teletrabajo, mascotas…).

### Paso 4 — Presupuesto y plazo
| Campo | Tipo | Obligatorio |
|---|---|---|
| Presupuesto orientativo | rangos (<150.000 € / 150–200 mil / 200–300 mil / >300 mil / no lo sé) | Sí |
| Plazo previsto | Urgente / 6–12 meses / 12–24 meses / Sin definir | Sí |
| Financiación | Recursos propios / Hipoteca / Sin decidir | No |

### Paso 5 — Contacto y buyer persona
| Campo | Tipo | Obligatorio |
|---|---|---|
| Nombre | texto | Sí |
| Apellidos | texto | No |
| Teléfono (+34) | validado | Sí |
| Email | validado | Sí |
| Mejor forma/horario de contacto | Llamada / WhatsApp / Email + franja horaria | No |
| Planos, fotos o documentación | archivo | No |
| Consentimiento de privacidad | casilla, no premarcada | Sí |
| Comunicaciones comerciales | casilla separada | No |

Mínimo real obligatorio: **ubicación, situación del terreno, superficie (rango), dormitorios, uso, presupuesto (rango), plazo, nombre, teléfono, email, consentimiento**. Con eso se puede generar el presupuesto orientativo y detectar solicitudes inviables (superficie incoherente con el presupuesto).

Si se prefiere una conversión máxima en frío (Meta), existe una **versión corta de 2 pasos** (situación del terreno, superficie, presupuesto, nombre, teléfono, email, consentimiento) y el resto se completa en la llamada o en un enlace posterior ("completa tu ficha").

## 2. Captura para entender al buyer persona

Objetivo: aprender quién compra, sin frenar el envío ni recopilar datos innecesarios (RGPD: minimización). Todo se pone como **bloque opcional** "Ayúdanos a personalizar tu propuesta" al final del paso 5.

| Dato | Opciones sugeridas | Para qué sirve |
|---|---|---|
| **Rango de edad** | 18–24 / 25–34 / 35–44 / 45–54 / 55–64 / 65+ / Prefiero no decirlo | Segmentar anuncios, tono, financiación |
| **Composición del hogar** | Vivo solo/a / En pareja / Familia con hijos pequeños / Familia con hijos mayores / Otros | Tipología y m² |
| **Nº de personas que vivirán en la casa** | 1 / 2 / 3 / 4 / 5+ | Dormitorios/baños |
| **Situación actual de vivienda** | Alquiler / Propiedad que quiero vender / Vivo con familia / Otra | Urgencia y financiación |
| **Motivo principal del proyecto** | Primera vivienda / Cambio a una casa mayor / Segunda residencia / Inversión-alquiler / Jubilación / Otro | Mensaje del anuncio |
| **Qué es lo más importante** (ordenar o elegir 2) | Precio / Plazo / Diseño / Eficiencia energética / Trámites resueltos / Calidad | Argumentos de venta |
| **Cómo nos conociste** | Instagram / Facebook / Google / YouTube / Recomendación / Otro | Contrastar contra la atribución técnica |
| **Situación laboral / perfil** (opcional) | Empleado/a / Autónomo/a-empresario/a / Funcionario/a / Jubilado/a / Otro | Financiación, capacidad de compra |
| **Teletrabajo** | Sí / Parcial / No | Necesidad de estudio/despacho |
| **Mascotas / accesibilidad** | Casillas | Diseño |
| **¿Has consultado otras opciones?** | Otras casas modulares / Construcción tradicional / Compra de vivienda hecha / No | Competencia |
| **Principal preocupación** | Coste final / Plazos / Licencias / Financiación / Calidad de la construcción | Contenido de FAQ y nurturing |

Recomendación de fase 1: elegir **5 datos** (edad, composición del hogar, motivo, situación actual y "qué es lo más importante") y sumar el resto por oleadas para no alargar el formulario.

Notas de privacidad: son datos no sensibles en sentido RGPD (no revelan salud, ideología, etc.), pero se informan en la política de privacidad, van con finalidad "personalizar y mejorar el servicio" y se pueden pedir de forma opcional.

## 3. Campos ocultos (automáticos)

`utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`, `gclid`, `fbclid`, `fbc`/`fbp` (Meta), `landing_url`, `referrer`, `variant`, `device`, `created_at`, `consent_text_version`, `consent_at`, `ip_hash`.

## 4. Mapa de campos: Pipefy → CRM nuevo

| Pipefy | CRM nuevo |
|---|---|
| Nome do contato + Apellidos | `nombre`, `apellidos` |
| Telefone | `telefono` (E.164) |
| Email profissional | `email` |
| Empresa | (se elimina) |
| Valor do negócio | `valor_estimado` (calculado / manual) |
| Data do fechamento esperado | `fecha_cierre_estimada` |
| Temperatura | `prioridad` (calor) |
| Tipo de proyecto | `interes` (casa modular / reforma / terreno / otro) |
| Pregunta de Calificación | `etapa_proyecto` (lista cerrada normalizada) |
| Nombre del Ad / Conjunto / Campaña | `anuncio_id`, `conjunto_id`, `campana_id` (tablas de referencia) |
| Notas | `notas` + historial de actividad |
| Documentos | adjuntos |
| Etiquetas | `estado_contacto`, `intentos`, `interes`, `origen_chatbot` |
| Fase actual | `etapa` |
| Creado el | `created_at` |
| Últ. comentario | actividad |

Normalización de "Pregunta de Calificación" al importar:
- "sí, me gustaría recibirlo" → `solicita_informacion`
- "solo quiero recibir información por ahora" → `solo_informacion`
- "Tengo el terreno, busco proyecto" → `tiene_terreno`
- "Explorando ideas, quiero orientación" / "Explorar ideas, buscar orientación" → `explorando`
- "Tengo el proyecto, quiero presupuesto" → `tiene_proyecto`
- "Listo para empezar (lo antes posible / cuanto antes)" → `listo_para_empezar`
