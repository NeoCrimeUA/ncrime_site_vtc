// ============================================================
//  NeoCrime — Партнери (карусель по 3 картки, без обмеження кількості)
//  Джерело даних: https://api.neocrime.space/partners
//  Саме перегортання робить Carousel() у index.html.
// ============================================================
(function () {
  const API_URL = "https://api.neocrime.space/partners";

  const track = document.getElementById("partners-track");
  if (!track) return;

  function escHtml(str) {
    const d = document.createElement("div");
    d.textContent = String(str || "");
    return d.innerHTML;
  }

  async function loadPartners() {
    try {
      const res = await fetch(API_URL);
      const data = await res.json();
      if (data && data.status === "success" && Array.isArray(data.items) && data.items.length) {
        // якщо партнерів менше 3 — дублюємо набір, щоб карусель мала що перегортати
        // розвертаємо порядок: від старих партнерів до нових
        let list = data.items.slice().reverse();
        while (list.length < 3) list = list.concat(data.items.slice().reverse());
        track.innerHTML = list.map(cardHTML).join("");
      } else {
        track.innerHTML = '<p style="color:#9c9c9c;">Партнерів не знайдено.</p>';
      }
    } catch (e) {
      console.error("[Partners] Помилка завантаження:", e);
      track.innerHTML = '<p style="color:#9c9c9c;">Помилка завантаження партнерів.</p>';
    }
  }

  function cardHTML(item) {
    const banner = item.banner_link || item.photo_link || "";
    const logo = item.photo_link || "";
    const link = item.vtc_link || "#";
    const name = item.vtc_name || "Невідомо";
    return `
      <div class="partner-card">
        <div class="partner-card-banner" style="background-image:url('${banner.replace(/'/g, "%27")}')"></div>
        <div class="partner-card-overlay"></div>
        <div class="partner-card-content">
          <img class="partner-card-logo" src="${logo.replace(/"/g, "&quot;")}" alt="${escHtml(name)}" loading="lazy" draggable="false">
          <div class="partner-card-name">${escHtml(name)}</div>
        </div>
        <a class="partner-card-link" href="${link.replace(/"/g, "&quot;")}" target="_blank" rel="noopener noreferrer" aria-label="${escHtml(name)}" draggable="false"></a>
      </div>
    `;
  }

  loadPartners();
})();