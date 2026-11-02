document.addEventListener('DOMContentLoaded', () => {
  const eventsContainer = document.getElementById('events-container');

  const LANG = document.documentElement.lang === 'en' ? 'en' : 'uk';

  // Тексти інтерфейсу залежно від мови сторінки
  const T = LANG === 'en'
    ? { unknown: 'Unknown', none: 'No upcoming events at the moment.', fail: 'Failed to load events.', error: 'An error occurred while loading events.' }
    : { unknown: 'Невідомо', none: 'Наразі запланованих подій немає.', fail: 'Не вдалося завантажити події.', error: 'Сталася помилка при завантаженні подій.' };

  // API віддає start_at (час виїзду) в UTC (напр. "2026-07-28 16:00:00").
  // Для української версії конвертуємо це в київський час
  // (Europe/Kyiv сама враховує перехід на літній/зимовий час).
  // Англійська версія лишається як є — без конвертації.
  function toKyivParts(utcString) {
    if (!utcString) return null;
    const iso = utcString.replace(' ', 'T') + 'Z';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return null;

    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Kyiv',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false
    }).formatToParts(d).reduce((acc, p) => { acc[p.type] = p.value; return acc; }, {});

    return {
      dateKey: `${parts.year}-${parts.month}-${parts.day}`,
      time: `${parts.hour}:${parts.minute}`
    };
  }

  // Дата+час для відображення в картці: у "uk" — київський час,
  // в іншому разі — сирий рядок з API як є (без конвертації).
  function displayDateTime(utcString) {
    if (!utcString) return null;
    if (LANG === 'uk') {
      const kyiv = toKyivParts(utcString);
      return kyiv ? `${kyiv.dateKey} ${kyiv.time}` : null;
    }
    return utcString.substring(0, 16);
  }

  async function loadEvents() {
    try {
      // Запрос к твоему новому эндпоинту
      const response = await fetch('https://api.neocrime.space/events');
      if (!response.ok) throw new Error('Помилка завантаження подій');
      
      const data = await response.json();
      
      // Проверяем наличие массива в ключе data.events
      if (data && Array.isArray(data.events)) {
        let events = data.events;
        
        if (events.length === 0) {
          eventsContainer.innerHTML = `<p style="color: #9c9c9c; grid-column: 1/-1;">${T.none}</p>`;
          return;
        }

        // На всякий случай сортируем события по возрастанию (ближайшие — первые)
        events.sort((a, b) => new Date(a.start_at) - new Date(b.start_at));

        // Берем до 9 ближайших событий — на главной они листаются каруселью
        const latestEvents = events.slice(0, 9);
        eventsContainer.innerHTML = '';
        
        latestEvents.forEach(item => {
          // Час виїзду: для "uk" — переведений у київський час; для "en" — як є з API (UTC)
          const cleanDate = displayDateTime(item.start_at) || T.unknown;
          
          // Безопасное извлечение данных (если какое-то поле будет отсутствовать)
          const serverName = item.server && item.server.name ? item.server.name : T.unknown;
          const startCity = item.departure && item.departure.city ? item.departure.city : T.unknown;
          const startLoc = item.departure && item.departure.location ? item.departure.location : '';
          const finishCity = item.arrive && item.arrive.city ? item.arrive.city : T.unknown;
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
                <span class="btn-ico btn-ico-calendar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 2v4M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/><path d="m9 16 2 2 4-4"/></svg></span>
              </a>
            </div>
          `;
          
          eventsContainer.appendChild(card);
        });
      } else {
        eventsContainer.innerHTML = `<p style="color: #9c9c9c; grid-column: 1/-1;">${T.fail}</p>`;
      }
    } catch (error) {
      console.error(error);
      eventsContainer.innerHTML = `<p style="color: #9c9c9c; grid-column: 1/-1;">${T.error}</p>`;
    }
  }

  loadEvents();
});