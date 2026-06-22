document.addEventListener('DOMContentLoaded', () => {

  // Якщо елемент вже знаходиться у зоні видимості (наприклад, картки
  // довантажились пізніше, ніж відпрацював scroll-reveal observer),
  // примусово показуємо його — без цього блок міг лишитися з opacity:0
  // назавжди, бо observer вже зняв спостереження за заглушкою.
  function revealIfVisible(el) {
    if (!el || el.classList.contains('revealed')) return;
    const rect = el.getBoundingClientRect();
    const inViewport = rect.top < window.innerHeight && rect.bottom > 0;
    if (inViewport) {
      el.classList.add('revealed');
    }
  }

  // Будуємо одну картку події (однаковий вигляд для обох блоків)
  function renderEventCard(item) {
    // Обрезаем секунды у даты: "2026-07-28 16:00:00" -> "2026-07-28 16:00"
    const cleanDate = item.meetup_at ? item.meetup_at.substring(0, 16) : 'Невідомо';

    // Безопасное извлечение данных (если какое-то поле будет отсутствовать)
    const serverName = item.server && item.server.name ? item.server.name : 'Невідомо';
    const startCity = item.departure && item.departure.city ? item.departure.city : 'Невідомо';
    const startLoc = item.departure && item.departure.location ? item.departure.location : '';
    const finishCity = item.arrive && item.arrive.city ? item.arrive.city : 'Невідомо';
    const finishLoc = item.arrive && item.arrive.location ? item.arrive.location : '';

    const card = document.createElement('div');
    card.className = 'event-card';

    card.innerHTML = `
      <img src="${item.banner}" alt="${item.name}" class="event-img" loading="lazy">
      <div class="event-content">
        <h3 class="event-title" title="${item.name}">${item.name}</h3>

        <div class="event-details">
          <div class="event-detail-item">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/></svg>
            <span><strong>Date:</strong> ${cleanDate}</span>
          </div>

          <div class="event-detail-item">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
            <span><strong>Start:</strong> ${startCity} ${startLoc ? '— ' + startLoc : ''}</span>
          </div>

          <div class="event-detail-item">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" x2="4" y1="22" y2="15"/></svg>
            <span><strong>Finish:</strong> ${finishCity} ${finishLoc ? '— ' + finishLoc : ''}</span>
          </div>

          <div class="event-detail-item">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="8" x="2" y="2" rx="2" ry="2"/><rect width="20" height="8" x="2" y="14" rx="2" ry="2"/><line x1="6" x2="6.01" y1="6" y2="6"/><line x1="6" x2="6.01" y1="18" y2="18"/></svg>
            <span><strong>Server:</strong> ${serverName}</span>
          </div>
        </div>

        <a href="https://truckersmp.com/events/${item.id}" target="_blank" class="btn-event">
          View Event
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>
        </a>
      </div>
    `;

    return card;
  }

  // Завантажує події з вказаного ендпоінту в вказаний контейнер.
  // sortEvents=true потрібен для /attending, бо API віддає події в розкид (не по даті).
  async function loadEventsInto(containerId, apiUrl, { sortEvents = false, emptyText, errorText, retries = 4 } = {}) {
    const container = document.getElementById(containerId);
    if (!container) return;

    let lastError = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000); // 20с — щоб не висіти вічно

      try {
        const response = await fetch(apiUrl, { cache: 'no-store', signal: controller.signal });
        clearTimeout(timeoutId);
        if (!response.ok) throw new Error('HTTP ' + response.status);

        const data = await response.json();

        if (data && Array.isArray(data.events)) {
          let events = data.events;

          if (events.length === 0) {
            container.innerHTML = `<p style="color: #9c9c9c; grid-column: 1/-1;">${emptyText}</p>`;
            return;
          }

          // Сортуємо за зростанням дати (ближчі — перші).
          // Обов'язково для /attending — там дані приходять не по порядку.
          if (sortEvents) {
            events.sort((a, b) => new Date(a.meetup_at) - new Date(b.meetup_at));
          }

          container.innerHTML = '';

          events.forEach(item => {
            try {
              container.appendChild(renderEventCard(item));
            } catch (cardError) {
              // Одна "погана" подія (наприклад, відсутнє поле) не повинна
              // валити рендер усіх інших карток — просто пропускаємо її.
              console.error('[Events] Не вдалося відрендерити картку:', item, cardError);
            }
          });

          // Якщо після фільтрації "поганих" карток контейнер лишився
          // порожнім — показуємо повідомлення замість пустого блоку.
          if (!container.children.length) {
            container.innerHTML = `<p style="color: #9c9c9c; grid-column: 1/-1;">${errorText}</p>`;
            return;
          }

          // Контейнер щойно заповнився картками.
          // Примусово розкриваємо сам контейнер та всіх його .reveal-предків —
          // незалежно від того, чи observer вже відпрацював чи ні.
          // Це виправляє race condition: observer міг спостерігати елемент
          // поки всередині був лише плейсхолдер, додати .revealed і зняти
          // спостереження — після чого нові картки лишалися з opacity:0 назавжди.
          const revealTarget = container.closest('.reveal') || container;
          let el = revealTarget;
          while (el && el !== document.body) {
            if (el.classList.contains('reveal')) {
              el.classList.add('revealed');
              // Знімаємо inline transform/transition, які могли бути виставлені
              // анімацією reveal, щоб hover-ефекти карток не конфліктували.
              el.style.transform = '';
              el.style.transition = '';
            }
            el = el.parentElement;
          }

          return; // успіх — вихід з циклу повторів
        } else {
          throw new Error('Невірний формат відповіді API');
        }
      } catch (error) {
        clearTimeout(timeoutId);
        lastError = error;
        console.error(`[Events] Спроба ${attempt + 1}/${retries + 1} не вдалася для ${apiUrl}:`, error);
        if (attempt === retries) {
          container.innerHTML = `<p style="color: #9c9c9c; grid-column: 1/-1;">${errorText}</p>`;
          console.error(`[Events] Остаточна помилка для ${apiUrl}:`, lastError);
        } else {
          // Експоненційна пауза перед повторною спробою: 0.6с, 1.2с, 2.4с, 4.8с
          await new Promise(r => setTimeout(r, 600 * Math.pow(2, attempt)));
        }
      }
    }
  }

  // Блок 1: Наші події
  loadEventsInto('events-container', 'https://api.neocrime.space/events', {
    sortEvents: true,
    emptyText: 'Наразі запланованих подій немає.',
    errorText: 'Не вдалося завантажити події.'
  }).catch(err => console.error('[Events] Неочікувана помилка (events-container):', err));

  // Блок 2: Події, на які ми йдемо (attending) — апі віддає дані в розкид, тож сортуємо
  loadEventsInto('attending-container', 'https://api.neocrime.space/attending', {
    sortEvents: true,
    emptyText: 'Наразі немає запланованих відвідувань.',
    errorText: 'Не вдалося завантажити події.'
  }).catch(err => console.error('[Events] Неочікувана помилка (attending-container):', err));

});