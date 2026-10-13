// Se carga de forma bloqueante en <head>, antes del CSS, para aplicar el
// tema guardado sin parpadeo. La lógica del botón vive en app.js; este
// archivo solo debe fijar el atributo lo antes posible.
(function () {
  try {
    var saved = localStorage.getItem("wispr_theme_v1");
    var theme = saved === "light" || saved === "dark"
      ? saved
      : (window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
    document.documentElement.setAttribute("data-theme", theme);
  } catch (e) {}
})();
