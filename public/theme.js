/* Tema claro/oscuro — cargar en <head>, sin defer/async, justo después de tokens.css.
   Sin esto: por defecto sigue la preferencia del sistema (prefers-color-scheme).
   Con un tema elegido a mano (localStorage), ese tema manda siempre. */
(function () {
  try {
    var stored = localStorage.getItem("bescansa-theme");
    if (stored === "light" || stored === "dark") {
      document.documentElement.setAttribute("data-theme", stored);
    }
  } catch (e) {}
})();

function bescansaToggleTheme() {
  var root = document.documentElement;
  var systemDark = window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches;
  var current = root.getAttribute("data-theme") || (systemDark ? "dark" : "light");
  var next = current === "dark" ? "light" : "dark";
  root.setAttribute("data-theme", next);
  try { localStorage.setItem("bescansa-theme", next); } catch (e) {}
}
