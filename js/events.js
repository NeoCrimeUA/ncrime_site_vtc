document.addEventListener('DOMContentLoaded', () => {
  const eventsContainer = document.getElementById('events-container');

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
          eventsContainer.innerHTML = '<p style="color: #9c9c9c; grid-column: 1/-1;">Наразі запланованих подій немає.</p>';
          return;
        }

        // На всякий случай сортируем события по возрастанию (ближайшие — первые)
        events.sort((a, b) => new Date(a.meetup_at) - new Date(b.meetup_at));

        // Берем ровно 3 ближайших события для идеального отображения в сетке
        const latestEvents = events.slice(0, 3);
        eventsContainer.innerHTML = '';
        
        latestEvents.forEach(item => {
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
          
          eventsContainer.appendChild(card);
        });
      } else {
        eventsContainer.innerHTML = '<p style="color: #9c9c9c; grid-column: 1/-1;">Не вдалося завантажити події.</p>';
      }
    } catch (error) {
      console.error(error);
      eventsContainer.innerHTML = '<p style="color: #9c9c9c; grid-column: 1/-1;">Сталася помилка при завантаженні подій.</p>';
    }
  }

  loadEvents();
});