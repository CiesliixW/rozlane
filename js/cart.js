const fmt = (v) => v.toFixed(2).replace(".", ",") + " zł";

// Defense in depth: product data and Stripe-returned customer fields go
// through innerHTML in a few places, so escape before interpolating even
// though writes to the product catalog are already blocked by RLS.
const escapeHtml = (str) => String(str).replace(/[&<>"']/g, (c) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[c]));

const SHIPPING_PRICE = 16.99;

const Cart = (() => {
  const STORAGE_KEY = "rozlane_cart";
  const POINT_KEY = "rozlane_delivery_point";
  let lines = load();
  let deliveryPoint = loadPoint();

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  }

  function loadPoint() {
    try {
      const raw = localStorage.getItem(POINT_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function savePoint() {
    if (deliveryPoint) {
      localStorage.setItem(POINT_KEY, JSON.stringify(deliveryPoint));
    } else {
      localStorage.removeItem(POINT_KEY);
    }
  }

  function findProduct(id) {
    return PRODUCTS.find((p) => p.id === id);
  }

  function priceOf(line) {
    const product = findProduct(line.id);
    return product.pr[SIZES.indexOf(line.size)];
  }

  function countForSize(size) {
    return lines.filter((l) => l.size === size).reduce((s, l) => s + l.qty, 0);
  }

  function buildPromoMessage(size, count, celebrationPrefix) {
    const status = Promotions.getSizeStatus(size, count);
    if (!status) return null;
    const parts = [];

    if (celebrationPrefix) {
      parts.push(celebrationPrefix);
    } else if (status.freeShippingMet) {
      parts.push("Masz darmową wysyłkę!");
    } else {
      parts.push(`Dodaj jeszcze ${status.freeShippingRemaining} i miej darmową wysyłkę!`);
    }

    if (status.nextFreeTier) {
      const noun = status.nextFreeTier.count === 1 ? "odlewkę" : "odlewki";
      parts.push(`Dodaj jeszcze ${status.nextFreeTier.remaining} i zyskaj ${noun} gratis!`);
    } else if (!celebrationPrefix && status.currentFreeCount > 0) {
      const noun = status.currentFreeCount === 1 ? "1 odlewka" : `${status.currentFreeCount} odlewki`;
      parts.push(`${noun} gratis!`);
    }

    return parts.join(" ");
  }

  function showToast(promoHtml, celebrate) {
    const toast = document.getElementById("toast");
    const promoEl = document.getElementById("toastPromo");
    promoEl.innerHTML = promoHtml || "";
    toast.classList.toggle("celebrate", !!celebrate);
    toast.classList.add("show");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => toast.classList.remove("show", "celebrate"), promoHtml ? 4200 : 2000);
  }

  function buildUnlockMessage(size, before, after) {
    if (!before || !after) return null;
    const gains = [];
    if (!before.freeShippingMet && after.freeShippingMet) gains.push("darmową wysyłkę");
    const newFree = after.currentFreeCount - before.currentFreeCount;
    if (newFree > 0) gains.push(newFree === 1 ? "odlewkę gratis" : `${newFree} odlewki gratis`);
    if (!gains.length) return null;
    return `🎉 Odblokowano: ${gains.join(" + ")}!`;
  }

  function addItem(id, size, qty = 1) {
    const beforeStatus = Promotions.getSizeStatus(size, countForSize(size));

    const existing = lines.find((l) => l.id === id && l.size === size);
    if (existing) {
      existing.qty += qty;
    } else {
      lines.push({ id, size, qty });
    }
    save();
    render();

    const count = countForSize(size);
    const afterStatus = Promotions.getSizeStatus(size, count);
    const unlockMessage = buildUnlockMessage(size, beforeStatus, afterStatus);

    let promoHtml = "";
    if (afterStatus) {
      const message = buildPromoMessage(size, count, unlockMessage);
      promoHtml = `<div class="toast-promo-msg">${message}</div>${buildPromoBar(size, count)}<a class="toast-promo-link" href="zasady-promocji.html">Zobacz zasady promocji</a>`;
    }
    showToast(promoHtml, !!unlockMessage);
  }

  function setQty(index, qty) {
    if (qty <= 0) {
      lines.splice(index, 1);
    } else {
      lines[index].qty = qty;
    }
    save();
    render();
  }

  function removeLine(index) {
    lines.splice(index, 1);
    save();
    render();
  }

  function clear() {
    lines = [];
    deliveryPoint = null;
    save();
    savePoint();
    render();
  }

  function setDeliveryPoint(point) {
    deliveryPoint = point;
    savePoint();
    render();
  }

  function getDeliveryPoint() {
    return deliveryPoint;
  }

  function getItems() {
    return lines.map((l) => ({ id: l.id, size: l.size, qty: l.qty }));
  }

  function getSubtotal() {
    return lines.reduce((sum, l) => sum + priceOf(l) * l.qty, 0);
  }

  function getCount() {
    return lines.reduce((sum, l) => sum + l.qty, 0);
  }

  function buildPromoBar(size, count) {
    const rule = Promotions.PROMO_RULES[size];
    if (!rule) return "";
    const milestones = [
      { at: rule.freeShippingAt, label: "Darmowa wysyłka" },
      ...rule.freeItemTiers.map((t) => ({ at: t.at, label: t.count === 1 ? "Odlewka gratis" : `${t.count} odlewki gratis` })),
    ].sort((a, b) => a.at - b.at);
    const max = milestones[milestones.length - 1].at;
    const pct = Math.min(100, (count / max) * 100);
    const dots = milestones.map((m) => {
      const reached = count >= m.at;
      return `<div class="promo-dot${reached ? " reached" : ""}" style="left:${(m.at / max) * 100}%" title="${m.label} - ${m.at} szt.">${reached ? "✓" : m.at}</div>`;
    }).join("");
    return `<div class="promo-track"><div class="promo-track-fill" style="width:${pct}%"></div>${dots}</div>`;
  }

  function promoProgressHtml() {
    return Object.keys(Promotions.PROMO_RULES).map((size) => {
      const count = countForSize(size);
      if (!count) return "";
      const message = buildPromoMessage(size, count);
      return `
        <div class="promo-note">
          <div class="promo-note-head"><b>${size}</b><span>${count} szt.</span></div>
          ${buildPromoBar(size, count)}
          <div class="promo-note-msg">${message}</div>
        </div>`;
    }).join("");
  }

  function render() {
    // Self-heal: drop any cart lines whose product no longer exists in the
    // catalog (e.g. removed in Supabase) so a single bad reference can't
    // crash the rest of the render (badge/list/total all read `lines`).
    const validLines = lines.filter((l) => findProduct(l.id));
    if (validLines.length !== lines.length) {
      lines = validLines;
      save();
    }

    const badge = document.getElementById("badge");
    const count = getCount();
    badge.textContent = count;
    badge.classList.toggle("on", count > 0);

    const itemsEl = document.getElementById("cartItems");
    const totalEl = document.getElementById("cartTotal");
    const shippingRow = document.getElementById("cartShippingRow");
    const discountRow = document.getElementById("cartDiscountRow");
    const checkoutBtn = document.getElementById("cartCheckout");
    if (!itemsEl) return;

    const promoEl = document.getElementById("promoProgress");
    if (promoEl) promoEl.innerHTML = promoProgressHtml();

    if (!lines.length) {
      itemsEl.innerHTML = '<div class="cart-empty">Koszyk jest pusty.</div>';
    } else {
      itemsEl.innerHTML = lines.map((line, i) => {
        const product = findProduct(line.id);
        const linePrice = priceOf(line) * line.qty;
        return `
          <div class="cart-item">
            <img src="${escapeHtml(product.img)}" alt="${escapeHtml(product.h)} ${escapeHtml(product.n)}">
            <div class="cart-item-info">
              <div class="cart-item-name">${escapeHtml(product.h)} ${escapeHtml(product.n)}</div>
              <div class="cart-item-size">${line.size}</div>
              <div class="cart-item-qty">
                <button class="qty-btn" data-i="${i}" data-d="-1">−</button>
                <span>${line.qty}</span>
                <button class="qty-btn" data-i="${i}" data-d="1">+</button>
              </div>
            </div>
            <div class="cart-item-price">${fmt(linePrice)}</div>
            <button class="cart-item-remove" data-i="${i}" aria-label="Usuń">✕</button>
          </div>`;
      }).join("");
    }

    const promo = Promotions.computePromo(getItems());
    const shippingCost = promo.freeShipping ? 0 : SHIPPING_PRICE;

    shippingRow.style.display = lines.length ? "flex" : "none";
    const shippingPriceEl = document.getElementById("cartShippingPrice");
    shippingPriceEl.textContent = shippingCost === 0 ? "Gratis" : fmt(SHIPPING_PRICE);
    shippingPriceEl.classList.toggle("free", shippingCost === 0);

    if (promo.discount > 0) {
      discountRow.style.display = "flex";
      document.getElementById("cartDiscountPrice").textContent = "−" + fmt(promo.discount);
    } else {
      discountRow.style.display = "none";
    }

    const total = getSubtotal() - promo.discount + (lines.length ? shippingCost : 0);
    totalEl.textContent = fmt(total);

    const deliveryRow = document.getElementById("cartDeliveryRow");
    if (deliveryRow) {
      deliveryRow.style.display = lines.length && deliveryPoint ? "flex" : "none";
      if (deliveryPoint) {
        document.getElementById("cartDeliveryCode").textContent = deliveryPoint.code;
      }
    }

    checkoutBtn.disabled = !lines.length || !termsAccepted();
  }

  function termsAccepted() {
    const el = document.getElementById("acceptTerms");
    return !!el && el.checked;
  }

  async function checkout() {
    if (!lines.length) return;
    if (!termsAccepted()) {
      alert("Zaznacz akceptację Regulaminu i Polityki Prywatności, aby kontynuować.");
      return;
    }
    if (!deliveryPoint) {
      document.dispatchEvent(new CustomEvent("cart:need-point"));
      return;
    }
    const checkoutBtn = document.getElementById("cartCheckout");
    checkoutBtn.disabled = true;
    checkoutBtn.textContent = "Przekierowuję…";
    try {
      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: getItems(),
          deliveryPoint,
          origin: window.location.origin,
        }),
      });
      if (!res.ok) throw new Error("Checkout session request failed");
      const { url } = await res.json();
      window.location.href = url;
    } catch (err) {
      checkoutBtn.disabled = false;
      checkoutBtn.textContent = "Przejdź do płatności";
      alert("Nie udało się przejść do płatności. Spróbuj ponownie.");
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    // Cart lines reference products by id, so don't render until the
    // Supabase-backed catalog has actually loaded (see render()'s
    // self-heal above for what happens if that's skipped).
    productsReady.then(render);

    document.getElementById("cartItems").addEventListener("click", (e) => {
      const qtyBtn = e.target.closest(".qty-btn");
      const removeBtn = e.target.closest(".cart-item-remove");
      if (qtyBtn) {
        const i = +qtyBtn.dataset.i;
        setQty(i, lines[i].qty + (+qtyBtn.dataset.d));
      } else if (removeBtn) {
        removeLine(+removeBtn.dataset.i);
      }
    });

    document.getElementById("cartCheckout").addEventListener("click", checkout);

    document.getElementById("cartDeliveryChange").addEventListener("click", () => {
      document.dispatchEvent(new CustomEvent("cart:need-point"));
    });

    document.getElementById("acceptTerms").addEventListener("change", () => {
      document.getElementById("cartCheckout").disabled = !lines.length || !termsAccepted();
    });
  });

  return { addItem, getCount, getDeliveryPoint, setDeliveryPoint, checkout, clear, render };
})();
