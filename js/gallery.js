// ============================================================
//  NeoCrime — Блок "Галерея" на головній сторінці
//  Джерело даних: https://api.neocrime.space/gallery
// ============================================================
(function () {
  const API_URL = "https://api.neocrime.space/gallery";
  const MAX_ITEMS = 3;

  const container = document.getElementById("gallery-container");
  const lightbox = document.getElementById("gallery-lightbox");
  const lightboxImg = document.getElementById("gallery-lightbox-img");
  const lightboxClose = document.querySelector(".gallery-lightbox-close");

  if (!container) return;

  function escHtml(str) {
    const d = document.createElement("div");
    d.textContent = String(str || "");
    return d.innerHTML;
  }

  // SVG-іконка "розгорнути" — 4 стрілки, що дивляться по кутах від центру
  const EXPAND_ICON = `
    <svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polyline class="arrow-tl" points="9 3 3 3 3 9"></polyline>
      <polyline class="arrow-tr" points="15 3 21 3 21 9"></polyline>
      <polyline class="arrow-bl" points="9 21 3 21 3 15"></polyline>
      <polyline class="arrow-br" points="15 21 21 21 21 15"></polyline>
    </svg>
  `;

  async function loadGallery() {
    try {
      const res = await fetch(API_URL);
      const data = await res.json();
      if (data && data.status === "success" && Array.isArray(data.items) && data.items.length) {
        // Беремо лише останні 3 (на випадок, якщо API віддасть не в тому порядку — сортуємо за датою)
        const sorted = [...data.items].sort((a, b) => {
          return new Date(b.created_at) - new Date(a.created_at);
        });
        renderGallery(sorted.slice(0, MAX_ITEMS));
      } else {
        container.innerHTML = '<p style="color:#9c9c9c; grid-column:1/-1;">Фотографій немає.</p>';
      }
    } catch (e) {
      console.error("[Gallery] Помилка завантаження:", e);
      container.innerHTML = '<p style="color:#9c9c9c; grid-column:1/-1;">Помилка завантаження галереї.</p>';
    }
  }

  function renderGallery(items) {
    container.innerHTML = items.map(cardHTML).join("");

    container.querySelectorAll(".gallery-card").forEach((card) => {
      card.addEventListener("click", () => {
        openLightbox(card.dataset.fullImg);
      });
    });
  }

  function cardHTML(item) {
    const url = item.photo_url || "";
    const title = item.title || "";
    return `
      <div class="gallery-card" data-full-img="${url.replace(/"/g, "&quot;")}">
        <img class="gallery-card-img" src="${url.replace(/"/g, "&quot;")}" alt="${escHtml(title)}" loading="lazy" draggable="false">
        <div class="gallery-card-overlay"></div>
        <div class="gallery-card-expand">${EXPAND_ICON}</div>
        <div class="gallery-card-title">${escHtml(title)}</div>
      </div>
    `;
  }

  // ------------------------------------------------------------
  //  Лайтбокс: відкриття/закриття
  // ------------------------------------------------------------
  function openLightbox(src) {
    if (!lightbox || !lightboxImg) return;
    lightboxImg.src = src;
    lightbox.classList.add("active");
    document.body.style.overflow = "hidden";
  }

  function closeLightbox() {
    if (!lightbox) return;
    lightbox.classList.remove("active");
    document.body.style.overflow = "";
  }

  if (lightbox) {
    // Закриття при кліку по будь-якому порожньому місцю (фону), але не по самій фотографії
    lightbox.addEventListener("click", (e) => {
      if (e.target === lightbox) closeLightbox();
    });
  }
  if (lightboxClose) {
    lightboxClose.addEventListener("click", closeLightbox);
  }
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeLightbox();
  });

  loadGallery();
})();