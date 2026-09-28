// Configuración de la landing. Editar antes de publicar.
window.CRM_CONFIG = {
  // URL del CRM donde vive el endpoint del formulario (sin barra final). Ej.: "https://crm.estudiobescansa.com"
  apiUrl: "http://localhost:3100",
  // Píxel de Meta y etiqueta de Google: se cargan SOLO si la persona acepta las cookies. Dejar en "" para no cargarlos.
  metaPixelId: "",
  googleTagId: "",
  // Cloudflare Turnstile (antispam opcional). Clave pública del sitio; la secreta va en el CRM (TURNSTILE_SECRET).
  turnstileSiteKey: "",
  // Datos de contacto visibles
  telefono: "981 91 22 29",
  telefonoLink: "+34981912229",
  email: "info@estudiobescansa.com",
  // Texto legal mostrado junto a la casilla. Si se cambia, sube también el número de versión en src/lib/landing.ts
  consentText:
    "He leído y acepto la política de privacidad. Estudio Bescansa tratará mis datos para responder a mi solicitud y contactarme sobre mi proyecto.",
};
