const fmt = (v) => v.toFixed(2).replace(".", ",") + " zł";

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
    return PRICE_TABLE[product.t][SIZES.indexOf(line.size)];
  }

  function countForSize(size) {
    return lines.filter((l) => l.size === size).reduce((s, l) => s + l.qty, 0);
  }

  function buildPromoMessage(size, count) {
    const status = Promotions.getSizeStatus(size, count);
    if (!status) return null;
    const parts = [];

    if (status.freeShippingMet) {
      parts.push("Masz darmową wysyłkę!");
    } else {
      parts.push(`Dodaj jeszcze ${status.freeShippingRemaining} (${size}) i miej darmową wysyłkę!`);
    }

    if (status.nextFreeTier) {
      const noun = status.nextFreeTier.count === 1 ? "odlewkę" : "odlewki";
      parts.push(`Dodaj jeszcze ${status.nextFreeTier.remaining} i zyskaj ${noun} gratis!`);
    } else if (status.currentFreeCount > 0) {
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
      const message = unlockMessage || buildPromoMessage(size, count);
      promoHtml = `<div class="toast-promo-msg">${message}</div>${buildPromoBar(size, count)}`;
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
      return `<div class="promo-dot${reached ? " reached" : ""}" style="left:${(m.at / max) * 100}%" title="${m.label} — ${m.at} szt.">${reached ? "✓" : m.at}</div>`;
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
    const badge = document.getElementById("badge");
    const count = getCount();
    badge.textContent = count;
    badge.classList.toggle("on", count > 0);

    const itemsEl = document.getElementById("cartItems");
    const totalEl = document.getElementById("cartTotal");
    const shippingRow = document.getElementById("cartShippingRow");
    const discountRow = document.getElementById("cartDiscountRow");
    const pointEl = document.getElementById("deliveryPointStatus");
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
            <img src="${product.img}" alt="${product.h} ${product.n}">
            <div class="cart-item-info">
              <div class="cart-item-name">${product.h} ${product.n}</div>
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

    if (deliveryPoint) {
      pointEl.innerHTML = `<b>Paczkomat ${deliveryPoint.code}</b><span>${deliveryPoint.address || ""}</span>`;
      pointEl.classList.add("set");
    } else {
      pointEl.innerHTML = "Nie wybrano paczkomatu";
      pointEl.classList.remove("set");
    }

    checkoutBtn.disabled = !lines.length;
  }

  async function checkout() {
    if (!lines.length) return;
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
    render();

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
  });

  return { addItem, getCount, getDeliveryPoint, setDeliveryPoint, clear, render };
})();
