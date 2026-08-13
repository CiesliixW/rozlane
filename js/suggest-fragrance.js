(function () {
  const suggestOverlay = document.getElementById("suggestOverlay");
  const suggestModal = document.getElementById("suggestModal");
  const suggestForm = document.getElementById("suggestForm");
  const suggestError = document.getElementById("suggestError");
  const suggestSubmit = document.getElementById("suggestSubmit");
  const suggestSuccess = document.getElementById("suggestSuccess");

  function resetSuggestModal() {
    suggestForm.reset();
    suggestForm.style.display = "";
    suggestSuccess.style.display = "none";
    suggestError.style.display = "none";
    suggestSubmit.disabled = false;
    suggestSubmit.textContent = "Wyślij propozycję";
  }

  function openSuggest() {
    resetSuggestModal();
    openModal(suggestModal, suggestOverlay);
  }
  function closeSuggest() {
    closeModal(suggestModal, suggestOverlay);
  }

  suggestOverlay.addEventListener("click", closeSuggest);
  document.getElementById("suggestClose").addEventListener("click", closeSuggest);
  document.getElementById("suggestDone").addEventListener("click", closeSuggest);
  suggestModal.addEventListener("modal:close", closeSuggest);

  // The suggestion tile is rendered dynamically inside #grid on every
  // render(), so its open button is wired via delegation instead of a
  // direct listener.
  grid.addEventListener("click", (e) => {
    if (e.target.closest(".suggest-open")) openSuggest();
  });

  suggestForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fragrance = document.getElementById("suggestFragrance").value.trim();
    if (!fragrance) return;

    suggestError.style.display = "none";
    suggestSubmit.disabled = true;
    suggestSubmit.textContent = "Wysyłam…";

    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/fragrance_suggestions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_ANON_KEY,
          Prefer: "return=minimal",
        },
        body: JSON.stringify({
          fragrance,
          contact: document.getElementById("suggestContact").value.trim() || null,
          note: document.getElementById("suggestNote").value.trim() || null,
        }),
      });
      if (!res.ok) throw new Error("insert failed");
      suggestForm.style.display = "none";
      suggestSuccess.style.display = "block";
    } catch (err) {
      suggestError.textContent = "Nie udało się wysłać. Spróbuj ponownie za chwilę.";
      suggestError.style.display = "block";
      suggestSubmit.disabled = false;
      suggestSubmit.textContent = "Wyślij propozycję";
    }
  });
})();
