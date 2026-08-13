(function () {
  const FLAG_KEY = "rozlane_newsletter_seen";
  const DELAY_MS = 25000;
  const DISCOUNT_CODE = "NEWSLETTER10";

  // Don't interrupt someone who just landed back from Stripe (order-status.js
  // opens its own modal immediately for that), and don't nag repeat visitors.
  if (new URLSearchParams(window.location.search).get("checkout")) return;
  if (localStorage.getItem(FLAG_KEY)) return;

  const overlay = document.getElementById("newsletterOverlay");
  const modal = document.getElementById("newsletterModal");
  const form = document.getElementById("newsletterForm");
  const success = document.getElementById("newsletterSuccess");
  const errorEl = document.getElementById("newsletterError");
  const submitBtn = document.getElementById("newsletterSubmit");
  const codeEl = document.getElementById("newsletterCode");
  const copyBtn = document.getElementById("newsletterCopy");

  function close() {
    closeModal(modal, overlay);
  }

  overlay.addEventListener("click", close);
  document.getElementById("newsletterClose").addEventListener("click", close);
  document.getElementById("newsletterDone").addEventListener("click", close);
  modal.addEventListener("modal:close", close);

  copyBtn.addEventListener("click", () => {
    navigator.clipboard.writeText(DISCOUNT_CODE).then(() => {
      copyBtn.textContent = "Skopiowano!";
      setTimeout(() => { copyBtn.textContent = "Kopiuj"; }, 1600);
    });
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("newsletterEmail").value.trim();
    if (!email || !document.getElementById("newsletterConsent").checked) return;

    errorEl.style.display = "none";
    submitBtn.disabled = true;
    submitBtn.textContent = "Wysyłam…";

    try {
      // Plain insert, not an on_conflict upsert: Postgres RLS requires SELECT
      // visibility to evaluate ON CONFLICT (even DO NOTHING), which the
      // insert-only policy here deliberately doesn't grant. A duplicate
      // email just means they're already subscribed -- still show the code.
      const res = await fetch(`${SUPABASE_URL}/rest/v1/newsletter_subscribers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_ANON_KEY,
          Prefer: "return=minimal",
        },
        body: JSON.stringify({ email }),
      });
      if (!res.ok && res.status !== 409) throw new Error("insert failed");
      codeEl.textContent = DISCOUNT_CODE;
      form.style.display = "none";
      success.style.display = "block";
    } catch (err) {
      errorEl.textContent = "Nie udało się zapisać. Spróbuj ponownie za chwilę.";
      errorEl.style.display = "block";
      submitBtn.disabled = false;
      submitBtn.textContent = "Odbierz kod";
    }
  });

  setTimeout(() => {
    // Don't pop up over the cart, point picker, or any other open dialog.
    if (openModals.length) return;
    localStorage.setItem(FLAG_KEY, "1");
    openModal(modal, overlay);
  }, DELAY_MS);
})();
