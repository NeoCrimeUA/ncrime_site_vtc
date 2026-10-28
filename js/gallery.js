// ============================================================
//  NeoCrime — Блок "Галерея" на головній сторінці
//  Джерело даних: https://api.neocrime.space/gallery
// ============================================================
(function () {
  const API_URL = "https://api.neocrime.space/gallery";
  const MAX_ITEMS = 9;   // до 9 фото — на головній листаються каруселлю по 3

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

  // Клік по картці (делегування — працює і для клонів каруселі)
  container.addEventListener("click", (e) => {
    const card = e.target.closest(".gallery-card");
    if (card) openLightbox(+card.dataset.idx);
  });

  async function loadGallery() {
    try {
      const res = await fetch(API_URL);
      const data = await res.json();
      if (data && data.status === "success" && Array.isArray(data.items) && data.items.length) {
        // Беремо до 9 останніх (на випадок, якщо API віддасть не в тому порядку — сортуємо за датою)
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
    currentItems = items;
    container.innerHTML = items.map((it, i) => cardHTML(it, i)).join("");
  }

  function cardHTML(item, idx) {
    const url = item.photo_url || "";
    const title = item.title || "";
    return `
      <div class="gallery-card" data-idx="${idx}" data-full-img="${url.replace(/"/g, "&quot;")}">
        <img class="gallery-card-img" src="${url.replace(/"/g, "&quot;")}" alt="${escHtml(title)}" loading="lazy" draggable="false">
        <div class="gallery-card-overlay"></div>
        <div class="gallery-card-expand">${EXPAND_ICON}</div>
        <div class="gallery-card-title">${escHtml(title)}</div>
      </div>
    `;
  }

  // ------------------------------------------------------------
  //  Лайтбокс з перелистуванням (як на сторінці галереї).
  //  Гортаються лише ті фото, що показані на головній (до 9).
  // ------------------------------------------------------------
  const lightboxCaption = document.getElementById("lightbox-caption");
  const lightboxPrev = document.getElementById("lightbox-prev");
  const lightboxNext = document.getElementById("lightbox-next");
  let currentItems = [];
  let currentIdx = 0;

  if (lightboxImg) lightboxImg.style.transition = "opacity 0.15s ease, transform 0.3s ease";

  function showItem(idx) {
    const item = currentItems[idx];
    lightboxImg.src = item.photo_url || "";
    if (lightboxCaption) lightboxCaption.textContent = item.title || "";
    updateNav();
  }

  function openLightbox(idx) {
    if (!lightbox || !lightboxImg || !currentItems[idx]) return;
    currentIdx = idx;
    showItem(idx);
    if (location.hash !== '#gallery') {
      history.pushState({ ...history.state, neoGallery: true }, '', '#gallery');
    }
    lightbox.classList.add("active");
    document.body.style.overflow = "hidden";
  }

  function closeLightbox(fromHistory) {
    if (fromHistory !== true && location.hash === '#gallery') {
      if (history.state && history.state.neoGallery) {
        history.back();
        return;
      }
      history.replaceState(history.state, '', location.pathname + location.search);
    }

    if (!lightbox) return;
    lightbox.classList.remove("active");
    document.body.style.overflow = "";
    setTimeout(() => {
      if (!lightbox.classList.contains("active")) lightboxImg.src = "";
    }, 300);
  }


  // Back closes the photo; Forward restores the viewer without adding history.
  window.addEventListener('popstate', function () {
    if (location.hash === '#gallery') {
      if (!lightbox.classList.contains('active')) openLightbox(currentIdx);
    } else if (lightbox.classList.contains('active')) {
      closeLightbox(true);
    }
  });

  function navigateLightbox(dir) {
    const n = currentIdx + dir;
    if (n < 0 || n >= currentItems.length) return;
    currentIdx = n;
    lightboxImg.style.opacity = "0";
    setTimeout(() => {
      showItem(currentIdx);
      lightboxImg.style.opacity = "1";
    }, 150);
  }

  function updateNav() {
    if (lightboxPrev) lightboxPrev.style.display = currentIdx > 0 ? "flex" : "none";
    if (lightboxNext) lightboxNext.style.display = currentIdx < currentItems.length - 1 ? "flex" : "none";
  }

  if (lightbox) {
    // Закриття при кліку по фону, але не по самій фотографії
    lightbox.addEventListener("click", (e) => {
      if (e.target === lightbox) closeLightbox();
    });
  }
  if (lightboxClose) lightboxClose.addEventListener("click", closeLightbox);
  if (lightboxPrev) lightboxPrev.addEventListener("click", () => navigateLightbox(-1));
  if (lightboxNext) lightboxNext.addEventListener("click", () => navigateLightbox(+1));

  document.addEventListener("keydown", (e) => {
    if (!lightbox || !lightbox.classList.contains("active")) return;
    if (e.key === "Escape") closeLightbox();
    if (e.key === "ArrowLeft") navigateLightbox(-1);
    if (e.key === "ArrowRight") navigateLightbox(+1);
  });

  loadGallery();
})();