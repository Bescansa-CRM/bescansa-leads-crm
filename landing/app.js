(function () {
  "use strict";
  var CFG = window.CRM_CONFIG || {};
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  // ── Datos de contacto y texto legal desde config.js ──────────────────────────
  if (CFG.telefono) { ["tel-link", "tel-link-2"].forEach(function (id) { var a = document.getElementById(id); if (a) { a.textContent = CFG.telefono; a.href = "tel:" + (CFG.telefonoLink || CFG.telefono.replace(/\s/g, "")); } }); }
  if (CFG.email) { var m = document.getElementById("mail-link"); if (m) { m.textContent = CFG.email; m.href = "mailto:" + CFG.email; } }
  var consentEl = document.getElementById("consent-text");
  var consentText = (consentEl && consentEl.textContent.trim()) || "";
  if (CFG.consentText && consentEl) {
    consentEl.textContent = "";
    // Se conserva el enlace a la política de privacidad dentro de la frase
    CFG.consentText.split(/(política de privacidad)/i).forEach(function (p) {
      if (/^política de privacidad$/i.test(p)) { var a = document.createElement("a"); a.href = "privacidad.html"; a.target = "_blank"; a.rel = "noopener"; a.textContent = p; consentEl.appendChild(a); }
      else consentEl.appendChild(document.createTextNode(p));
    });
    consentEl.appendChild(document.createTextNode(" *"));
    consentText = CFG.consentText;
  }

  // ── Atribución: UTM, gclid, fbclid (se conservan durante la sesión) ───────────
  var KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "gclid", "fbclid"];
  function readStore() { try { return JSON.parse(sessionStorage.getItem("attr") || "{}"); } catch { return {}; } }
  var attr = readStore();
  var qs = new URLSearchParams(location.search);
  KEYS.forEach(function (k) { var v = qs.get(k); if (v) attr[k] = v.slice(0, 300); });
  if (!attr.landing_url) { attr.landing_url = location.origin + location.pathname; attr.referrer = document.referrer || ""; }
  try { sessionStorage.setItem("attr", JSON.stringify(attr)); } catch { /* modo privado */ }

  // ── Cookies y medición (solo con consentimiento) ─────────────────────────────
  var banner = $("#cookie");
  function consentState() { try { return localStorage.getItem("cookie-consent"); } catch { return null; } }
  function loadScript(src) { var s = document.createElement("script"); s.async = true; s.src = src; document.head.appendChild(s); }
  function loadTracking() {
    if (CFG.metaPixelId && !window.fbq) {
      /* eslint-disable */
      !function (f, b, e, v, n, t, s) { if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); }; if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = "2.0"; n.queue = []; t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s); }(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
      /* eslint-enable */
      window.fbq("init", CFG.metaPixelId);
      window.fbq("track", "PageView");
    }
    if (CFG.googleTagId && !window.gtag) {
      window.dataLayer = window.dataLayer || [];
      window.gtag = function () { window.dataLayer.push(arguments); };
      window.gtag("js", new Date());
      window.gtag("config", CFG.googleTagId);
      loadScript("https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(CFG.googleTagId));
    }
  }
  function setConsent(v) { try { localStorage.setItem("cookie-consent", v); } catch { /* */ } banner.classList.remove("show"); if (v === "granted") loadTracking(); }
  if (consentState() === "granted") loadTracking(); else if (!consentState()) banner.classList.add("show");
  $("#cookie-accept").addEventListener("click", function () { setConsent("granted"); });
  $("#cookie-reject").addEventListener("click", function () { setConsent("denied"); });
  $("#cookie-settings").addEventListener("click", function (e) { e.preventDefault(); banner.classList.add("show"); });

  // ── Formulario en 3 pasos ────────────────────────────────────────────────────
  var form = $("#lead-form");
  var steps = $$("fieldset[data-step]", form);
  var bars = $$(".progress span", form);
  var titleEl = $("#step-title"), btnBack = $("#btn-back"), btnNext = $("#btn-next"), btnSend = $("#btn-send");
  var errBox = $("#form-error");
  var current = 0, startedAt = 0, sending = false;

  function markStarted() { if (!startedAt) startedAt = Date.now(); }
  form.addEventListener("focusin", markStarted);
  form.addEventListener("input", markStarted);

  function show(n) {
    current = n;
    steps.forEach(function (s, i) { s.hidden = i !== n; });
    bars.forEach(function (b, i) { b.classList.toggle("on", i <= n); });
    titleEl.textContent = "Paso " + (n + 1) + " de " + steps.length;
    btnBack.hidden = n === 0;
    btnNext.hidden = n === steps.length - 1;
    btnSend.hidden = n !== steps.length - 1;
    var first = $("input,select,textarea", steps[n]);
    if (first && n > 0) first.focus({ preventScroll: true });
    if (n === steps.length - 1) mountTurnstile();
  }

  function setError(field, msg) {
    var box = field.closest("[data-field]") || field;
    box.classList.toggle("error", !!msg);
    var t = $(".error-text", box) || (box.getAttribute("data-field") === "consent" ? $('[data-error-for="consent"]') : null);
    if (t) t.textContent = msg || "";
  }
  function phoneOk(v) { var d = v.replace(/[^\d+]/g, ""); if (d.charAt(0) === "+") return d.replace(/\D/g, "").length >= 8; d = d.replace(/\D/g, ""); return /^(34)?[6-9]\d{8}$/.test(d) || /^00\d{8,}$/.test(d); }
  function emailOk(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v); }

  function validateStep(n) {
    var ok = true, firstBad = null;
    $$("[data-field]", steps[n]).forEach(function (box) {
      var name = box.getAttribute("data-field");
      var el = $('[name="' + name + '"]', box);
      if (!el) return;
      var msg = "";
      if (el.type === "radio") { if (!$('[name="' + name + '"]:checked', box)) msg = "Elige una opción"; }
      else if (el.type === "checkbox") { if (el.required && !el.checked) msg = "Necesitamos tu aceptación para poder contactarte"; }
      else {
        var v = (el.value || "").trim();
        if (el.required && !v) msg = "Este campo es obligatorio";
        else if (name === "telefono" && v && !phoneOk(v)) msg = "Introduce un teléfono válido, por ejemplo 600 000 000";
        else if (name === "email" && v && !emailOk(v)) msg = "Introduce un email válido";
      }
      setError(box, msg);
      if (msg) { ok = false; if (!firstBad) firstBad = el; }
    });
    if (firstBad) firstBad.focus();
    return ok;
  }

  btnNext.addEventListener("click", function () { if (validateStep(current)) { errBox.hidden = true; show(current + 1); } });
  btnBack.addEventListener("click", function () { show(current - 1); });
  form.addEventListener("keydown", function (e) { if (e.key === "Enter" && e.target.tagName !== "TEXTAREA" && current < steps.length - 1) { e.preventDefault(); btnNext.click(); } });
  $$("input,select", form).forEach(function (el) { el.addEventListener("change", function () { var b = el.closest("[data-field]"); if (b) setError(b, ""); }); });

  // Turnstile (opcional)
  var turnstileToken = "", turnstileMounted = false;
  function mountTurnstile() {
    if (!CFG.turnstileSiteKey || turnstileMounted) return;
    turnstileMounted = true;
    window.__onTurnstile = function (t) { turnstileToken = t; };
    var d = $("#turnstile"); d.className = "cf-turnstile"; d.setAttribute("data-sitekey", CFG.turnstileSiteKey); d.setAttribute("data-callback", "__onTurnstile");
    loadScript("https://challenges.cloudflare.com/turnstile/v0/api.js");
  }

  function uuid() { return (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : "e" + Date.now().toString(36) + Math.random().toString(36).slice(2, 10); }
  function val(name) { var el = form.elements[name]; return el ? String(el.value || "").trim() : ""; }

  function buildPayload(eventId) {
    var perfil = {};
    [["uso", "uso"], ["edad_rango", "edad_rango"], ["hogar", "hogar"], ["motivo", "motivo"], ["prioridad", "prioridad_cliente"]].forEach(function (p) { if (val(p[0])) perfil[p[1]] = val(p[0]); });
    var payload = {
      event_id: eventId, started_at: startedAt || Date.now() - 60000,
      interes: "casa_modular",
      nombre: val("nombre"), apellidos: val("apellidos"), email: val("email"), telefono: val("telefono"),
      municipio: val("municipio"), terreno: (form.querySelector('[name="terreno"]:checked') || {}).value || "",
      superficie_rango: val("superficie_rango"), presupuesto_rango: val("presupuesto_rango"), plazo: val("plazo"),
      dormitorios: val("dormitorios"), perfil: perfil, mensaje: val("mensaje"),
      consent: form.elements.consent.checked === true, consent_text: consentText,
      consent_whatsapp: form.elements.consent_whatsapp.checked === true,
      website: val("website"), cf_token: turnstileToken || undefined,
    };
    KEYS.concat(["landing_url", "referrer"]).forEach(function (k) { if (attr[k]) payload[k] = attr[k]; });
    return payload;
  }

  function showError(msg) { errBox.textContent = msg; errBox.hidden = false; errBox.scrollIntoView({ block: "nearest" }); }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (sending) return;
    if (!validateStep(current)) return;
    errBox.hidden = true;
    sending = true; btnSend.disabled = true; btnSend.textContent = "Enviando…";
    var eventId = uuid();
    fetch((CFG.apiUrl || "") + "/api/leads/landing", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(buildPayload(eventId)) })
      .then(function (res) { return res.json().catch(function () { return {}; }).then(function (data) { return { res: res, data: data }; }); })
      .then(function (r) {
        if (r.res.ok) { onSuccess(eventId); return; }
        var detail = r.data && r.data.detalles && r.data.detalles.length ? " " + r.data.detalles.join(" ") : "";
        showError((r.data && r.data.error ? r.data.error : "No se pudo enviar el formulario.") + detail);
      })
      .catch(function () { showError("No hemos podido enviar el formulario. Comprueba tu conexión o llámanos al " + (CFG.telefono || "") + "."); })
      .then(function () { sending = false; btnSend.disabled = false; btnSend.textContent = "Enviar solicitud"; });
  });

  function onSuccess(eventId) {
    form.hidden = true;
    $("#success").hidden = false;
    $("#success").scrollIntoView({ block: "center", behavior: "smooth" });
    try { if (window.fbq) window.fbq("track", "Lead", {}, { eventID: eventId }); } catch { /* */ }
    try { if (window.gtag) window.gtag("event", "generate_lead"); } catch { /* */ }
    try { window.dataLayer = window.dataLayer || []; window.dataLayer.push({ event: "lead_submitted", event_id: eventId }); } catch { /* */ }
  }

  // Los botones "solicitar" también marcan de dónde viene el clic
  $$("[data-cta]").forEach(function (a) { a.addEventListener("click", function () { try { if (window.gtag) window.gtag("event", "cta_click", { cta: a.getAttribute("data-cta") }); } catch { /* */ } }); });

  show(0);
})();
