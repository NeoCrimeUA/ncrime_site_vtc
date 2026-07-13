// ============================================================
//  NeoCrime — Карусель партнерів
//  Джерело даних: https://api.neocrime.space/partners
// ============================================================
(function () {
  const API_URL = "https://api.neocrime.space/partners";
  const AUTOPLAY_SPEED = 1.60;   // px за кадр (~60fps) — швидкість автоматичного руху
  const AUTOPLAY_INTERVAL_PAUSE = 5000; // не використовується для зупинки, лишено для довідки

  const viewport = document.getElementById("partners-viewport");
  const track = document.getElementById("partners-track");
  if (!viewport || !track) return;

  let items = [];
  let cardWidth = 0;   // ширина однієї картки разом з gap, рахується після рендеру
  let trackWidth = 0;  // повна ширина одного "комплекту" карток (до дублювання)
  let posX = 0;         // поточний зсув треку (від'ємний, рухається вліво)

  let isDragging = false;
  let dragStartX = 0;
  let dragStartPos = 0;
  let lastDragX = 0;
  let lastDragTime = 0;
  let dragVelocity = 0; // px/ms, для інерції після відпускання

  let inertiaActive = false;
  let rafId = null;

  let isHovering = false;      // пауза автоплею при наведенні мишкою (десктоп)
  let activeTouchCard = null;  // картка, яку зараз тримають пальцем (мобільний)

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
        items = data.items;
        renderPartners();
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

  function renderPartners() {
    // Потроюємо набір карток — стрічка виходить довшою і безшовною
    // навіть коли партнерів мало (менше видно "склейку" циклу)
    const singleSetHTML = items.map(cardHTML).join("");
    track.innerHTML = singleSetHTML.repeat(3);

    // Рахуємо ширину після рендеру (потрібно дочекатись layout)
    requestAnimationFrame(() => {
      measure();
      startAutoplay();
    });
  }

  function measure() {
    const cards = track.querySelectorAll(".partner-card");
    if (!cards.length) return;
    const firstCard = cards[0];
    const gap = parseFloat(getComputedStyle(track).gap) || 0;
    cardWidth = firstCard.getBoundingClientRect().width + gap;
    trackWidth = cardWidth * items.length; // ширина одного "комплекту" (половина треку)
  }

  function setTrackPosition(x) {
    posX = x;
    // Нормалізуємо в межах [-trackWidth, 0), щоб створити ілюзію бескінечної стрічки
    if (trackWidth > 0) {
      while (posX <= -trackWidth) posX += trackWidth;
      while (posX > 0) posX -= trackWidth;
    }
    track.style.transform = `translateX(${posX}px)`;
  }

  // ------------------------------------------------------------
  //  Основний цикл анімації: автоплей + інерція
  // ------------------------------------------------------------
  function tick() {
    if (!isDragging && !isHovering) {
      if (inertiaActive) {
        // Інерційне доїзжання після відпускання, швидкість поступово згасає
        setTrackPosition(posX + dragVelocity);
        dragVelocity *= 0.95; // згасання
        if (Math.abs(dragVelocity) < 0.05) {
          inertiaActive = false;
        }
      } else {
        // Звичайний автоматичний рух стрічки вліво (картки "приїжджають" справа)
        setTrackPosition(posX - AUTOPLAY_SPEED);
      }
    }
    rafId = requestAnimationFrame(tick);
  }

  function startAutoplay() {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(tick);
  }

  // ------------------------------------------------------------
  //  Drag (мишею) — ручне перетягування з інерцією після відпускання
  // ------------------------------------------------------------
  const DRAG_CLICK_THRESHOLD = 6; // px — якщо зрушили більше, це драг, а не клік по посиланню

  let dragMoved = 0; // загальна дистанція переміщення під час поточного драгу

  function onPointerDown(e) {
    // Забороняємо нативний drag посилання/картинки браузером (саме через це з'являлась
    // підказка з URL і виносило сторінку — браузер намагався "перетягнути" лінк)
    e.preventDefault();

    isDragging = true;
    inertiaActive = false;
    dragMoved = 0;
    viewport.classList.add("dragging");
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    dragStartX = clientX;
    dragStartPos = posX;
    lastDragX = clientX;
    lastDragTime = performance.now();
    dragVelocity = 0;

    // На мобільному — знімаємо блюр з картки, яку саме тримають пальцем
    if (e.touches) {
      const card = e.target.closest(".partner-card");
      if (card) {
        activeTouchCard = card;
        card.classList.add("touch-active");
      }
    }
  }

  function onPointerMove(e) {
    if (!isDragging) return;
    if (e.cancelable) e.preventDefault();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const now = performance.now();
    const dt = now - lastDragTime;

    setTrackPosition(dragStartPos + (clientX - dragStartX));
    dragMoved += Math.abs(clientX - lastDragX);

    // Швидкість руху миші — використовується для інерції після відпускання.
    // Ігноруємо занадто малі dt (перший кадр після mousedown), щоб не отримати
    // аномально величезну швидкість через ділення на майже нуль.
    if (dt >= 8) {
      dragVelocity = (clientX - lastDragX) / dt * 16; // переводимо в px/кадр (~16мс)
    }
    lastDragX = clientX;
    lastDragTime = now;
  }

  function onPointerUp() {
    if (!isDragging) return;
    isDragging = false;
    viewport.classList.remove("dragging");
    // Запускаємо інерцію тільки якщо швидкість реалістична (захист від випадкових сплесків)
    const v = Math.max(-40, Math.min(40, dragVelocity));
    dragVelocity = v;
    inertiaActive = Math.abs(v) > 0.3;

    if (activeTouchCard) {
      activeTouchCard.classList.remove("touch-active");
      activeTouchCard = null;
    }
  }

  viewport.addEventListener("mousedown", onPointerDown);
  window.addEventListener("mousemove", onPointerMove);
  window.addEventListener("mouseup", onPointerUp);

  viewport.addEventListener("touchstart", onPointerDown, { passive: false });
  viewport.addEventListener("touchmove", onPointerMove, { passive: false });
  viewport.addEventListener("touchend", onPointerUp);
  viewport.addEventListener("touchcancel", onPointerUp);

  // Пауза автоплею при наведенні мишкою — без цього картка "втікає" з-під
  // курсору кожні кілька кадрів і блюр встигає лише мигнути, а не плавно зникнути
  viewport.addEventListener("mouseenter", () => { isHovering = true; });
  viewport.addEventListener("mouseleave", () => { isHovering = false; });

  // Забороняємо браузеру тягнути картинку логотипу/посилання як файл
  viewport.addEventListener("dragstart", (e) => e.preventDefault());

  // Якщо це був реальний драг (а не клік), гасимо клік по посиланню партнера,
  // щоб після перетягування не відкривався перехід на сайт VTC
  viewport.addEventListener(
    "click",
    (e) => {
      if (dragMoved > DRAG_CLICK_THRESHOLD) {
        e.preventDefault();
        e.stopPropagation();
      }
    },
    true
  );

  // Перерахунок ширини карток при зміні розміру вікна (адаптивність)
  window.addEventListener("resize", () => {
    measure();
  });

  loadPartners();
})();