// Se carga de forma bloqueante en <head>, antes del CSS, para aplicar el
// tema guardado sin parpadeo. La lógica del botón vive en app.js; este
// archivo solo debe fijar el atributo lo antes posible.
(function () {
  try {
    // Misma clave que THEME_KEY en app.js. Sin elección guardada: modo oscuro.
    var saved = localStorage.getItem("wispr_theme_v2");
    var theme = saved === "light" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", theme);
  } catch (e) {}
})();
