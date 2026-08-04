(function () {
  const params = new URLSearchParams(window.location.search);
  const checkout = params.get("checkout");
  if (!checkout) return;

  const sessionId = params.get("session_id");
  const overlay = document.getElementById("orderOverlay");
  const modal = document.getElementById("orderModal");
  const body = document.getElementById("orderModalBody");

  function open() {
    openModal(modal, overlay);
  }
  function close() {
    closeModal(modal, overlay);
  }

  function wireContinue() {
    document.getElementById("orderContinue").addEventListener("click", close);
  }

  function renderLoading() {
    body.innerHTML = '<p class="order-note">Ładowanie szczegółów zamówienia…</p>';
  }

  function renderCancelled() {
    body.innerHTML = `
      <div class="order-icon cancel">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </div>
      <h3>Płatność anulowana</h3>
      <p class="order-status">Zamówienie nie zostało opłacone. Koszyk został zachowany — możesz spróbować ponownie.</p>
      <button class="cart-checkout" id="orderContinue">Wróć do sklepu</button>`;
    wireContinue();
  }

  function renderError() {
    body.innerHTML = `
      <h3>Nie udało się pobrać zamówienia</h3>
      <p class="order-status">Jeśli płatność się powiodła, potwierdzenie dotrze mailem. W razie wątpliwości napisz na <a href="mailto:kontakt@rozlane.pl">kontakt@rozlane.pl</a>.</p>
      <button class="cart-checkout" id="orderContinue">Wróć do sklepu</button>`;
    wireContinue();
  }

  function renderSuccess(order) {
    const paid = order.status === "paid";
    body.innerHTML = `
      <div class="order-icon success">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6"><path d="M20 6 9 17l-5-5"/></svg>
      </div>
      <h3>Dziękujemy za zamówienie!</h3>
      <p class="order-status">Numer zamówienia: <b class="order-id">${escapeHtml(order.orderId)}</b></p>
      <p class="order-status">Status płatności: <b>${paid ? "opłacone" : escapeHtml(order.status)}</b></p>
      <div class="order-lines">${order.lineItems.map((li) => `
        <div class="order-line"><span>${li.quantity}× ${escapeHtml(li.name)}</span><span>${fmt(li.amountTotal / 100)}</span></div>`).join("")}
      </div>
      <div class="order-total"><span>Razem</span><strong>${fmt(order.amountTotal / 100)}</strong></div>
      ${order.inpostPoint ? `<div class="order-delivery">Odbiór: Paczkomat <b>${escapeHtml(order.inpostPoint)}</b></div>` : ""}
      ${order.phone ? `<div class="order-delivery">Kontakt: <b>${escapeHtml(order.phone)}</b></div>` : ""}
      ${order.email ? `<p class="order-note">Potwierdzenie zamówienia wysłaliśmy na adres ${escapeHtml(order.email)}.</p>` : ""}
      <button class="cart-checkout" id="orderContinue">Kontynuuj zakupy</button>`;
    wireContinue();
    if (paid) Cart.clear();
  }

  overlay.addEventListener("click", close);
  document.getElementById("orderClose").addEventListener("click", close);
  modal.addEventListener("modal:close", close);

  window.history.replaceState(null, "", window.location.pathname);
  open();

  if (checkout === "cancelled") {
    renderCancelled();
  } else if (checkout === "success" && sessionId) {
    renderLoading();
    fetch(`/api/get-checkout-session?session_id=${encodeURIComponent(sessionId)}`)
      .then((res) => {
        if (!res.ok) throw new Error("bad response");
        return res.json();
      })
      .then(renderSuccess)
      .catch(renderError);
  } else {
    renderError();
  }
})();
