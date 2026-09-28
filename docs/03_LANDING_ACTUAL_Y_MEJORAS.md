# Landing actual y propuesta de mejora

URL actual: https://arquitectodeexito.es/bescansa-modulares/ (alojada en el dominio de la agencia, no en uno de Bescansa). Título: "Estudio Bescansa Modulares".

## 1. Estructura actual (una sola página)

1. **Cabecera**: logo Estudio Bescansa, menú (Casas modulares, Sistema, Galería), botón "Solicitar información".
2. **Hero**: "Tu vivienda de diseño en plazos y costes más controlados". Subtítulo con sistema industrializado, garantía de +20 años construyendo en Galicia. Dos botones: "Solicitar información sin compromiso" y "Ver casas realizadas". Tres datos: 100 % personalizable, A+ eficiencia energética, llave en mano.
3. **Por qué el sistema modular EB**: cita de Lina Bo Bardi, texto de posicionamiento, CTA.
4. **Ventajas (6)**: plazos más cortos, costes predecibles, eficiencia A+, diseño 100 % personalizable, calidad industrial, llave en mano.
5. **Sistema constructivo**: cimentación tipo, forjado/losa industrializada, fachada ventilada, cubierta plana con EPDM.
6. **Tipologías (6)**: T1 Compacta (hasta 60 m²), T2 Familiar (hasta 90), T3 Amplia (hasta 120), T4 Premium (desde 165), T5 con garaje (desde 130), T6 a medida.
7. **Galería**: 7 ejemplos "Casa Modular EB · Galicia".
8. **Proceso en 5 pasos**: consulta, diseño y proyecto, licencias, fabricación y montaje, entrega llave en mano.
9. **Por qué Bescansa**: +20 años en Galicia, un testimonio anónimo, garantías (presupuesto cerrado y vinculante, equipo técnico propio, eficiencia certificada).
10. **Contacto + formulario**: dirección C/ Francisco Mariño 3, A Coruña; teléfono 981 91 22 29; info@estudiobescansa.com. "Respondemos personalmente en 48 horas".

Estilo visual: fondo blanco/oscuro con foto de vivienda, acento **turquesa/celeste**, tipografía sans light con énfasis en cursiva y negrita, botones planos turquesa. Logo con isotipo poligonal.

## 2. Formulario actual

| Campo | Obligatorio | Tipo |
|---|---|---|
| Nombre | Sí | texto |
| Apellidos | Sí | texto |
| Teléfono | Sí | texto |
| Email | Sí | texto |
| Metros cuadrados de vivienda deseados | Sí | texto |
| ¿Qué te interesa? | Sí | lista: Casa Modular EB · Tengo parcela propia / Busco terreno / Quiero información y presupuesto orientativo / Otro |
| ¿En qué fase está tu proyecto? | No | lista: Explorando ideas / Tengo el terreno, busco proyecto / Tengo el proyecto, quiero presupuesto / Listo para empezar cuanto antes |
| Cuéntanos tu proyecto | No | texto largo |

Botón: "Solicitar información gratuita →". Pie: "Revisamos cada solicitud de forma personal · Respuesta en 48 h".

## 3. Carencias detectadas

- **Sin casilla de consentimiento RGPD**, sin enlace a política de privacidad ni aviso legal visibles (obligatorio en España).
- No se detectó gestión de cookies/consentimiento ni Meta Pixel / GA4 / GTM en la parte que pude leer (la consola bloquea leer los scripts; hay que confirmarlo con la agencia).
- 5 campos obligatorios de texto + 2 listas: fricción alta para un lead frío de Meta. El teléfono acepta cualquier formato.
- Sin UTM/gclid/fbclid capturados, sin ID de campaña.
- Sin precio orientativo ni rangos ("presupuesto cerrado" pero cero cifras): el visitante no puede autocalificarse.
- Testimonio anónimo, sin nombre, foto ni ubicación: poca credibilidad. Galería sin metros, precio ni plazo reales.
- "Respuesta en 48 h" es lenta frente a la competencia; los datos muestran una mediana real de ≈16 h y 65 % nunca contactado.
- El dominio pertenece a la agencia: se debe migrar a un dominio propio de Bescansa.
- Copy centrado en Galicia; el objetivo es España (definir si la oferta es nacional o regional, ya que fabricación/transporte cambian el precio).

## 4. Propuesta de la nueva landing

Objetivo: convertir visitas de Meta y Google Ads en leads calificados, medibles y con consentimiento válido.

Estructura (misma línea visual y de contenidos, con mejoras):

1. **Hero** con propuesta clara + beneficio cuantificable + CTA único ("Recibe tu presupuesto orientativo").
2. **Calculadora/estimador breve** (opcional, fase 2): m² + acabados → rango de precio "desde X €".
3. **Tipologías con precio orientativo** (desde/hasta) y plazo real.
4. **Proceso y plazos** (5 pasos) con duración por etapa.
5. **Casos reales**: proyectos con ubicación, m², plazo y coste; testimonios con nombre y foto/vídeo.
6. **Garantías** + certificaciones + años de experiencia.
7. **FAQ** (precio, terreno, licencias, plazos, financiación, hipoteca, qué incluye/no incluye).
8. **Formulario en 2–3 pasos** (ver `04_FORMULARIO_Y_BUYER_PERSONA.md`), con barra de progreso, teléfono validado (+34) y consentimiento.
9. **Confirmación** con siguiente paso claro y opción de agendar llamada; disparo de eventos de conversión.
10. Footer legal: política de privacidad, aviso legal, cookies.

Técnico:
- Estática (Astro o HTML + JS) desplegada en Netlify, dominio propio de Bescansa.
- Captura de UTM, `gclid`, `fbclid`, referrer, landing y variante, guardados en campos ocultos.
- Banner de cookies (CMP) con Consent Mode v2 antes de cargar Meta Pixel / Google tag.
- Meta Pixel + Conversions API (con `event_id` para deduplicar) y Google Ads (conversiones mejoradas / offline con `gclid`).
- Envío a un endpoint del CRM (API de Netlify Functions o Supabase Edge Function) con verificación anti-spam (honeypot + Turnstile/hCaptcha).
- Rendimiento: imágenes optimizadas (AVIF/WebP), LCP < 2,5 s móvil; el tráfico de Meta es casi todo móvil, así que se diseña **mobile first** aunque el CRM no lo sea.
- Variantes A/B para titular y CTA.

## 5. Lo que se conserva

Marca, paleta turquesa, tono, las 6 tipologías, las 5 etapas del proceso, las garantías y los datos de contacto. Se mejora la prueba social y se añaden cifras.
