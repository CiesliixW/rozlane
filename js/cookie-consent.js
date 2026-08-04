(function () {
  const KEY = "rozlane_cookies";
  if (localStorage.getItem(KEY)) return;

  const banner = document.getElementById("cookieBanner");
  if (!banner) return;

  function dismiss(value) {
    localStorage.setItem(KEY, value);
    banner.classList.remove("show");
  }

  document.getElementById("cookieAcceptAll").addEventListener("click", () => dismiss("all"));
  document.getElementById("cookieNecessary").addEventListener("click", () => dismiss("necessary"));

  requestAnimationFrame(() => banner.classList.add("show"));
})();
