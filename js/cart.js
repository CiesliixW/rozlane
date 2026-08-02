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

  function addItem(id, size, qty = 1) {
    const existing = lines.find((l) => l.id === id && l.size === size);
    if (existing) {
      existing.qty += qty;
    } else {
      lines.push({ id, size, qty });
    }
    save();
    render();
    document.dispatchEvent(new CustomEvent("cart:item-added"));
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

  function setDeliveryPoint(point) {
    deliveryPoint = point;
    savePoint();
    render();
  }

  function getDeliveryPoint() {
    return deliveryPoint;
  }

  function getSubtotal() {
    return lines.reduce((sum, l) => sum + priceOf(l) * l.qty, 0);
  }

  function getTotal() {
    return getSubtotal() + (lines.length ? SHIPPING_PRICE : 0);
  }

  function getCount() {
    return lines.reduce((sum, l) => sum + l.qty, 0);
  }

  function render() {
    const badge = document.getElementById("badge");
    const count = getCount();
    badge.textContent = count;
    badge.classList.toggle("on", count > 0);

    const itemsEl = document.getElementById("cartItems");
    const totalEl = document.getElementById("cartTotal");
    const shippingRow = document.getElementById("cartShippingRow");
    const pointEl = document.getElementById("deliveryPointStatus");
    const checkoutBtn = document.getElementById("cartCheckout");
    if (!itemsEl) return;

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

    shippingRow.style.display = lines.length ? "flex" : "none";
    document.getElementById("cartShippingPrice").textContent = fmt(SHIPPING_PRICE);
    totalEl.textContent = fmt(getTotal());

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
          items: lines.map((l) => ({ id: l.id, size: l.size, qty: l.qty })),
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

  return { addItem, getCount, getDeliveryPoint, setDeliveryPoint, render };
})();
