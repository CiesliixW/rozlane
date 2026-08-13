(function () {
  const input = document.getElementById("search");
  const clearBtn = document.getElementById("searchClear");
  const box = document.getElementById("searchSuggestions");
  const MAX_RESULTS = 6;

  let activeIndex = -1;

  function itemId(i) {
    return `search-suggestion-${i}`;
  }

  function hide() {
    box.hidden = true;
    box.innerHTML = "";
    activeIndex = -1;
    input.setAttribute("aria-expanded", "false");
    input.removeAttribute("aria-activedescendant");
  }

  function renderSuggestions(query) {
    const matches = PRODUCTS.filter((p) => SearchMatch.matches(p, query)).slice(0, MAX_RESULTS);
    activeIndex = -1;
    input.setAttribute("aria-expanded", "true");

    if (!matches.length) {
      box.innerHTML = '<div class="search-empty">Brak podpowiedzi. Wciśnij Enter, aby zobaczyć wszystkie dopasowania.</div>';
      box.hidden = false;
      return;
    }

    box.innerHTML = matches.map((p, i) => `
      <div class="search-suggestion" id="${itemId(i)}" role="option" data-id="${p.id}">
        <img src="${escapeHtml(p.img)}" alt="" loading="lazy">
        <span><span class="ss-house">${escapeHtml(p.h)}</span><span class="ss-name">${escapeHtml(p.n)}</span></span>
      </div>`).join("");
    box.hidden = false;
  }

  function selectSuggestion(el) {
    const id = el.dataset.id;
    const product = PRODUCTS.find((p) => p.id === id);
    if (!product) return;
    input.value = `${product.h} ${product.n}`;
    hide();
    applyFilters();
    grid.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function setActive(i) {
    const options = box.querySelectorAll(".search-suggestion");
    if (!options.length) return;
    activeIndex = (i + options.length) % options.length;
    options.forEach((el, idx) => el.classList.toggle("active", idx === activeIndex));
    input.setAttribute("aria-activedescendant", itemId(activeIndex));
    options[activeIndex].scrollIntoView({ block: "nearest" });
  }

  input.addEventListener("input", () => {
    const query = input.value.trim();
    clearBtn.hidden = !query;
    if (query.length < 2) {
      hide();
      return;
    }
    renderSuggestions(query);
  });

  input.addEventListener("keydown", (e) => {
    if (box.hidden) return;
    const options = box.querySelectorAll(".search-suggestion");
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive(activeIndex + 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive(activeIndex - 1);
    } else if (e.key === "Enter") {
      if (activeIndex >= 0 && options[activeIndex]) {
        e.preventDefault();
        selectSuggestion(options[activeIndex]);
      } else {
        hide();
      }
    } else if (e.key === "Escape") {
      hide();
    }
  });

  // A click on a suggestion fires blur on the input first; delay the hide
  // so the click handler below still sees the suggestion in the DOM.
  input.addEventListener("blur", () => setTimeout(hide, 150));

  box.addEventListener("click", (e) => {
    const el = e.target.closest(".search-suggestion");
    if (el) selectSuggestion(el);
  });

  clearBtn.addEventListener("click", () => {
    input.value = "";
    clearBtn.hidden = true;
    hide();
    applyFilters();
    input.focus();
  });
})();
