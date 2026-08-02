const fmt = (v) => v.toFixed(2).replace(".", ",") + " zł";

const Cart = (() => {
  const STORAGE_KEY = "rozlane_cart";
  let lines = load();

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

  function getTotal() {
    return lines.reduce((sum, l) => sum + priceOf(l) * l.qty, 0);
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
    totalEl.textContent = fmt(getTotal());
  }

  async function checkout() {
    if (!lines.length) return;
    const checkoutBtn = document.getElementById("cartCheckout");
    checkoutBtn.disabled = true;
    checkoutBtn.textContent = "Przekierowuję…";
    try {
      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: lines.map((l) => ({ id: l.id, size: l.size, qty: l.qty })),
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

  return { addItem, getCount, render };
})();
