const fmt = (v) => v.toFixed(2).replace(".", ",") + " zł";

const grid = document.getElementById("grid");
const badge = document.getElementById("badge");
const toast = document.getElementById("toast");
const countEl = document.getElementById("count");

function stars(rating) {
  const full = Math.round(rating);
  return "★★★★★".slice(0, full) + "☆☆☆☆☆".slice(0, 5 - full);
}

function media(product) {
  if (product.img) {
    return `<div class="photowrap"><img src="${product.img}" alt="${product.h} ${product.n}" loading="lazy"></div>`;
  }
  return `<div class="vialwrap"><div class="vial"><div class="cap"></div><div class="neck"></div><div class="body"><div class="fill" style="height:${product.fill || 70}%"></div></div><div class="shine"></div></div></div>`;
}

function sizeOptions(prices) {
  return SIZES.map((s, j) => j === 0 ? s : `${s}[+${(prices[j] - prices[0]).toFixed(2)}]`).join("|");
}

function card(product) {
  const prices = PRICE_TABLE[product.t];
  const slug = product.img.split("/").pop().replace(/\.\w+$/, "");
  const el = document.createElement("article");
  el.className = "card";
  el.innerHTML = `
    ${product.best ? '<span class="badge-best">Bestseller</span>' : ""}
    <button class="fav" aria-label="Ulubione"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/></svg></button>
    ${media(product)}
    <div class="house">${product.h}</div>
    <div class="pname">${product.n}</div>
    <div class="notes">${product.no}</div>
    <div class="rating"><span class="stars">${stars(product.r)}</span> ${product.r.toFixed(1).replace(".", ",")} · ${product.c} opinii</div>
    <div class="sizes">${SIZES.map((s, j) => `<div class="size${j === 0 ? " active" : ""}" data-i="${j}">${s}</div>`).join("")}</div>
    <div class="buyrow">
      <div class="price">${fmt(prices[0])}<small>za 2 ml</small></div>
      <button
        class="add snipcart-add-item"
        type="button"
        data-item-id="${slug}"
        data-item-name="${product.h} ${product.n}"
        data-item-price="${prices[0]}"
        data-item-image="${product.img}"
        data-item-url="/"
        data-item-custom1-name="Rozmiar"
        data-item-custom1-options="${sizeOptions(prices)}"
        data-item-custom1-value="${SIZES[0]}"
      ><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 5v14M5 12h14"/></svg>Dodaj</button>
    </div>`;

  const sizeEls = el.querySelectorAll(".size");
  const priceEl = el.querySelector(".price");
  const addEl = el.querySelector(".add");
  sizeEls.forEach((sizeEl) => sizeEl.addEventListener("click", () => {
    sizeEls.forEach((x) => x.classList.remove("active"));
    sizeEl.classList.add("active");
    const j = +sizeEl.dataset.i;
    priceEl.innerHTML = `${fmt(prices[j])}<small>za ${SIZES[j]}</small>`;
    addEl.dataset.itemCustom1Value = SIZES[j];
  }));

  el.querySelector(".fav").addEventListener("click", (e) => e.currentTarget.classList.toggle("active"));

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
  all: ["Katalog", "Wszystkie odlewki w ofercie"],
  best: ["Bestsellery", "Najczęściej zamawiane w tym miesiącu"],
  meskie: ["Perfumy męskie", "Odlewki zapachów męskich"],
  damskie: ["Perfumy damskie", "Odlewki zapachów damskich"],
  unisex: ["Unisex", "Zapachy dla każdego"],
  nisza: ["Nisza", "Zapachy niszowe i selektywne"],
};

let currentFilter = "all";

function applyFilters() {
  const query = document.getElementById("search").value.trim().toLowerCase();
  const list = PRODUCTS.filter((p) => {
    const matchesFilter = currentFilter === "all" ? true : currentFilter === "best" ? p.best : p.g.includes(currentFilter);
    const matchesQuery = !query || (p.h + " " + p.n).toLowerCase().includes(query);
    return matchesFilter && matchesQuery;
  });
  render(list);
}

document.querySelectorAll(".chip").forEach((chip) => chip.addEventListener("click", () => {
  document.querySelectorAll(".chip").forEach((x) => x.classList.remove("active"));
  chip.classList.add("active");
  currentFilter = chip.dataset.filter;
  const [title, subtitle] = FILTER_LABELS[currentFilter];
  document.getElementById("grid-title").textContent = title;
  document.getElementById("grid-sub").textContent = subtitle;
  applyFilters();
}));

document.getElementById("search").addEventListener("input", applyFilters);

render(PRODUCTS);

document.addEventListener("snipcart.ready", () => {
  const syncBadge = () => {
    const count = Snipcart.store.getState().cart.items.count || 0;
    badge.classList.toggle("on", count > 0);
  };
  Snipcart.store.subscribe(syncBadge);
  syncBadge();
  Snipcart.events.on("item.added", () => {
    toast.classList.add("show");
    clearTimeout(document._toastTimer);
    document._toastTimer = setTimeout(() => toast.classList.remove("show"), 1400);
  });
});
