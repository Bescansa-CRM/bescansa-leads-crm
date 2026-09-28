# Análisis de los datos de Pipefy (977 leads)

Fuente: exportación del informe "Leads Bescansa" el 2026-09-25. Archivo con datos personales en `data-private/` (no se versiona ni se comparte). Este documento no contiene datos personales.

## Volumen

| Mes | Leads |
|---|---|
| 2026-03 | 27 (desde el 23-mar) |
| 2026-04 | 66 |
| 2026-05 | 56 |
| 2026-06 | 231 |
| 2026-07 | 305 |
| 2026-08 | 288 |
| 2026-09 | 4 (hasta el 25-sep) |

Total: 977. Con campañas activas entran unos **10 leads/día** (≈300/mes); las expectativas de "10–20 leads por mes" que se manejaban quedan muy por debajo de lo que ya se ha visto. La entrada casi se frena en septiembre (pausa de campaña).

## Embudo (por fase alcanzada al menos una vez)

| Etapa | Leads que pasaron | % sobre el total |
|---|---|---|
| Lead Nuevo | 977 | 100 % |
| Lead Contactado | 185 | 19 % |
| Lead Calificado | 79 | 8 % |
| Diagnóstico / Visita Agendada | 73 | 7,5 % |
| Llamada o Visita Realizada / Briefing | 54 | 5,5 % |
| Preparando Propuesta | 43 | 4,4 % |
| Propuesta Enviada | 54 | 5,5 % |
| **Cierre** | **5** | **0,5 %** |
| Descartado/Perdido | 135 | 14 % |

Fase actual: 636 siguen en "Lead Nuevo" (65 %), es decir, **nunca fueron contactados en Pipefy**. Es el mayor hallazgo: el cuello de botella no es el anuncio, es el seguimiento.

## Tiempo de respuesta

De los 185 contactados, la mediana entre entrada y primer contacto es de **≈16 h** y el percentil 75 **≈47 h**. La landing promete "respuesta en 48 h".

## Rendimiento por anuncio (nombre del Ad)

| Anuncio | Leads | Cierre | Propuesta | Descartados | Sin tocar |
|---|---|---|---|---|---|
| AD01 – Casas Modulares Coruña | 618 | 2 | 17 | 8 | 473 |
| AD06 – Construye tu casa | 101 | 1 | 12 | 83 | 0 |
| AD02 – Diseño Modular Premium | 44 | 1 | 0 | 1 | 32 |
| AD07 – Reforma Integral | 18 | 0 | 0 | 0 | 18 |
| AD03 – Creativo antes y después | 10 | 0 | 0 | 10 | 0 |
| AD05 – Reformas integrales | 6 | 0 | 3 | 3 | 0 |
| AD02 – Reforma integral cocina | 3 | 0 | 0 | 3 | 0 |
| (sin dato de anuncio) | 177 | 1 | 16 | 26 | 113 |

Lectura cuidadosa: AD01 tiene volumen pero casi todo sin contactar, así que no se puede juzgar su calidad; AD06 tiene 83 % de descarte (mala calidad o mala cualificación); los anuncios de "reforma" atraen un público que no es el objetivo. Los 177 leads sin anuncio muestran que la atribución hoy es incompleta.

- Campañas: "CASAS MODULARES | LEAD NATIVO | 04.06.26" (613) y "CONVERSIÓN LEAD NATIVO | 13.03.26" (187). Un único conjunto de anuncios: "ARQUITECTURA | HM | FEED REELS | 25 - 60" (público de 25 a 60 años).
- Los datos de anuncio/conjunto/campaña son texto libre: hay que normalizarlos al importar y crear la tabla de campañas.

## Respuesta a la pregunta de calificación (Meta Lead Ads)

| Respuesta | Leads |
|---|---|
| "Sí, me gustaría recibirlo" | 536 |
| "Solo quiero recibir información por ahora" | 264 |
| "Tengo el terreno, busco proyecto" | 64 |
| "Explorando ideas, quiero orientación" | 59 |
| "Tengo el proyecto, quiero presupuesto" | 7 |
| Otras variantes de texto | 4 |
| Vacío | 44 |

De los 5 cierres, 4 respondieron "Sí, me gustaría recibirlo" y 1 no tiene dato. Las respuestas con distintas redacciones (p. ej. "Listo para empezar…") demuestran que el campo debe ser una **lista cerrada**, no texto.

## Tipo de proyecto (formulario de la landing, 140 leads)

- "Quiero información y presupuesto orientativo": 65
- "Casa Modular EB · Tengo parcela propia": 63
- "Casa Modular EB · Busco terreno" y variantes: 10
- "Otro": 2

## Calidad de datos

- Teléfono: 863 con prefijo +34; otros sin prefijo → normalizar a E.164.
- **14 teléfonos y 19 emails duplicados** → el CRM nuevo necesita detección de duplicados.
- Apellidos vacíos en 85 %; teléfono vacío en 6; email vacío en 8.
- Empresa y Valor del negocio: 0 % de uso.
- Notas / último comentario: 274 tarjetas con comentario, 149 con notas → el equipo usa esos campos como historial.

## Cierres (5)

Creados entre abril y junio de 2026. Anuncios: AD06, AD01 (2), AD02, sin dato (1). Tiempo entre creación y cierre: semanas o meses, típico de un ciclo largo de compra de vivienda; el CRM debe tolerar ciclos de 3–6 meses con seguimiento.

## Implicaciones para el diseño

1. **Prioridad 1: no perder leads nuevos.** Alertas y SLA de primer contacto, asignación automática, cola de "sin contactar".
2. Estructurar atribución (tabla de campañas, UTM, ids de Meta) en vez de texto libre.
3. Modelar intentos de contacto (llamada sin respuesta, mensaje sin respuesta) en lugar de etiquetas.
4. Detectar duplicados por teléfono/email.
5. Mantener vías separadas de entrada: Meta Lead Ads (calificación breve), landing (formulario completo), manual/importado.
6. Reportes clave: leads por campaña/anuncio, % contactado en <24 h, embudo, motivos de pérdida, coste por lead y por cierre (con el gasto cargado).
