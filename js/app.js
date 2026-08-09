const grid = document.getElementById("grid");
const countEl = document.getElementById("count");

function stars(rating) {
  const full = Math.round(rating);
  return "★★★★★".slice(0, full) + "☆☆☆☆☆".slice(0, 5 - full);
}

function media(product) {
  if (product.img) {
    return `<div class="photowrap"><img src="${escapeHtml(product.img)}" alt="${escapeHtml(product.h)} ${escapeHtml(product.n)}" loading="lazy"></div>`;
  }
  return `<div class="vialwrap"><div class="vial"><div class="cap"></div><div class="neck"></div><div class="body"><div class="fill" style="height:${product.fill || 70}%"></div></div><div class="shine"></div></div></div>`;
}

function card(product) {
  const prices = PRICE_TABLE[product.t];
  let selectedSize = SIZES[0];
  const el = document.createElement("article");
  el.className = "card";
  el.innerHTML = `
    ${product.best ? '<span class="badge-best">Bestseller</span>' : ""}
    ${media(product)}
    <div class="house">${escapeHtml(product.h)}</div>
    <div class="decant-tag">Odlewka Perfum</div>
    <div class="pname">${escapeHtml(product.n)}</div>
    <div class="notes">${escapeHtml(product.no)}</div>
    <div class="rating"><span class="stars" aria-hidden="true">${stars(product.r)}</span> <span>${product.r.toFixed(1).replace(".", ",")} · ${product.c} opinii</span></div>
    <div class="sizes" role="group" aria-label="Pojemność">${SIZES.map((s, j) => `<button type="button" class="size${j === 0 ? " active" : ""}" data-i="${j}">${s}</button>`).join("")}</div>
    <div class="spray-info">~${Promotions.spraysForSize(SIZES[0])} psiknięć</div>
    <div class="buyrow">
      <div class="price">${fmt(prices[0])}<small>za 2 ml</small></div>
      <button class="add" type="button"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 5v14M5 12h14"/></svg>Dodaj</button>
    </div>`;

  const sizeEls = el.querySelectorAll(".size");
  const priceEl = el.querySelector(".price");
  const sprayEl = el.querySelector(".spray-info");
  sizeEls.forEach((sizeEl) => sizeEl.addEventListener("click", () => {
    sizeEls.forEach((x) => x.classList.remove("active"));
    sizeEl.classList.add("active");
    const j = +sizeEl.dataset.i;
    selectedSize = SIZES[j];
    priceEl.innerHTML = `${fmt(prices[j])}<small>za ${selectedSize}</small>`;
    sprayEl.textContent = `~${Promotions.spraysForSize(selectedSize)} psiknięć`;
  }));

  el.querySelector(".add").addEventListener("click", () => Cart.addItem(product.id, selectedSize));

  return el;
}

function render(list) {
  grid.innerHTML = "";
  if (!list.length) {
    grid.innerHTML = '<div class="empty">Brak perfum dla tego filtra.</div>';
    countEl.textContent = "0 produktów";
    return;
  }
  list.forEach((p) => grid.appendChild(card(p)));
  countEl.textContent = list.length + " produktów";
}

const FILTER_LABELS = {
  all: ["Produkty", "Wszystkie odlewki w ofercie"],
  best: ["Bestsellery", "Najczęściej zamawiane w tym miesiącu"],
  meskie: ["Perfumy męskie", "Odlewki zapachów męskich"],
  damskie: ["Perfumy damskie", "Odlewki zapachów damskich"],
  unisex: ["Unisex", "Zapachy dla każdego"],
  nisza: ["Nisza", "Zapachy niszowe i selektywne"],
};

let currentFilter = "all";
let currentBrand = "";
let currentSort = "default";

function applyFilters() {
  const query = document.getElementById("search").value.trim().toLowerCase();
  let list = PRODUCTS.filter((p) => {
    const matchesFilter = currentFilter === "all" ? true : currentFilter === "best" ? p.best : p.g.includes(currentFilter);
    const matchesQuery = !query || (p.h + " " + p.n).toLowerCase().includes(query);
    const matchesBrand = !currentBrand || p.h === currentBrand;
    return matchesFilter && matchesQuery && matchesBrand;
  });

  if (currentSort === "price-asc") {
    list = list.slice().sort((a, b) => PRICE_TABLE[a.t][0] - PRICE_TABLE[b.t][0]);
  } else if (currentSort === "price-desc") {
    list = list.slice().sort((a, b) => PRICE_TABLE[b.t][0] - PRICE_TABLE[a.t][0]);
  }

  render(list);
}

function populateBrandFilter() {
  const brandSelect = document.getElementById("brandFilter");
  const brands = [...new Set(PRODUCTS.map((p) => p.h))].sort((a, b) => a.localeCompare(b, "pl"));
  brandSelect.innerHTML = '<option value="">Wszystkie marki</option>'
    + brands.map((b) => `<option value="${escapeHtml(b)}">${escapeHtml(b)}</option>`).join("");
}

function setFilter(filterKey) {
  currentFilter = filterKey;
  document.querySelectorAll(".chip").forEach((x) => x.classList.toggle("active", x.dataset.filter === filterKey));
  const [title, subtitle] = FILTER_LABELS[filterKey];
  document.getElementById("grid-title").textContent = title;
  document.getElementById("grid-sub").textContent = subtitle;
  applyFilters();
}

document.querySelectorAll(".chip").forEach((chip) => chip.addEventListener("click", () => setFilter(chip.dataset.filter)));
document.querySelectorAll("[data-filter]").forEach((el) => {
  if (el.classList.contains("chip")) return;
  el.addEventListener("click", () => setFilter(el.dataset.filter));
});
document.getElementById("search").addEventListener("input", applyFilters);

document.getElementById("brandFilter").addEventListener("change", (e) => {
  currentBrand = e.target.value;
  applyFilters();
});
document.getElementById("sortFilter").addEventListener("change", (e) => {
  currentSort = e.target.value;
  applyFilters();
});

grid.innerHTML = '<div class="empty">Ładowanie katalogu…</div>';
productsReady.then(() => {
  populateBrandFilter();
  render(PRODUCTS);
});

// Minimal WAI-ARIA dialog behavior shared by every overlay+panel modal on
// the page (cart drawer, point picker, order confirmation): traps Tab
// inside the topmost open panel, closes the topmost one on Escape, and
// returns focus to whatever triggered it.
const openModals = [];

function openModal(panel, overlay) {
  panel.classList.add("open");
  if (overlay) overlay.classList.add("open");
  const trigger = document.activeElement;
  openModals.push({ panel, trigger });
  const focusTarget = panel.querySelector("button, [href], input, select, textarea, [tabindex]") || panel;
  requestAnimationFrame(() => focusTarget.focus({ preventScroll: true }));
}

function closeModal(panel, overlay) {
  panel.classList.remove("open");
  if (overlay) overlay.classList.remove("open");
  const idx = openModals.findIndex((m) => m.panel === panel);
  if (idx === -1) return;
  const [entry] = openModals.splice(idx, 1);
  if (entry.trigger && document.body.contains(entry.trigger)) entry.trigger.focus({ preventScroll: true });
}

document.addEventListener("keydown", (e) => {
  if (!openModals.length) return;
  const panel = openModals[openModals.length - 1].panel;
  if (e.key === "Escape") {
    panel.dispatchEvent(new CustomEvent("modal:close"));
  } else if (e.key === "Tab") {
    const focusable = Array.from(panel.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])')).filter((el) => el.offsetParent !== null);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
});

const cartIcon = document.getElementById("cart");
const cartDrawer = document.getElementById("cartDrawer");
const cartOverlay = document.getElementById("cartOverlay");

function openCart() {
  openModal(cartDrawer, cartOverlay);
}
function closeCart() {
  closeModal(cartDrawer, cartOverlay);
}

cartIcon.addEventListener("click", openCart);
cartOverlay.addEventListener("click", closeCart);
document.getElementById("cartClose").addEventListener("click", closeCart);
cartDrawer.addEventListener("modal:close", closeCart);

const pointPicker = document.getElementById("pointPicker");
const pointOverlay = document.getElementById("pointOverlay");

// The InPost widget is a third-party embed that only matters once someone
// actually asks to pick a parcel locker, so it's fetched on demand instead
// of on every page load.
let inpostWidgetPromise = null;
function loadInpostWidget() {
  if (!inpostWidgetPromise) {
    inpostWidgetPromise = new Promise((resolve) => {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://geowidget.inpost.pl/inpost-geowidget.css";
      document.head.appendChild(link);

      const script = document.createElement("script");
      script.src = "https://geowidget.inpost.pl/inpost-geowidget.js";
      script.onload = resolve;
      document.head.appendChild(script);
    });
  }
  return inpostWidgetPromise;
}

function openPointPicker() {
  openModal(pointPicker, pointOverlay);
  loadInpostWidget();
}
function closePointPicker() {
  closeModal(pointPicker, pointOverlay);
}

pointOverlay.addEventListener("click", closePointPicker);
document.getElementById("pointClose").addEventListener("click", closePointPicker);
pointPicker.addEventListener("modal:close", closePointPicker);

document.addEventListener("cart:need-point", () => {
  openCart();
  openPointPicker();
});

window.onInpostPointSelected = function (point) {
  const address = point.address ? [point.address.line1, point.address.line2].filter(Boolean).join(", ") : "";
  Cart.setDeliveryPoint({ code: point.name, address });
  closePointPicker();
  Cart.checkout();
};
