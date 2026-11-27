document.addEventListener('DOMContentLoaded', () => {

  const LANG = document.documentElement.lang === 'en' ? 'en' : 'uk';

  const I18N = {
    uk: {
      monthNames: ['Січень','Лютий','Березень','Квітень','Травень','Червень','Липень','Серпень','Вересень','Жовтень','Листопад','Грудень'],
      weekdays: ['Пн','Вт','Ср','Чт','Пт','Сб','Нд'],
      legendOwn: 'Наша подія',
      legendAttending: 'Ми відвідуємо',
      legendNone: 'Подій немає',
      close: 'Закрити',
      eventsOn: 'Події',
      calendarError: 'Не вдалося завантажити календар подій.'
    },
    en: {
      monthNames: ['January','February','March','April','May','June','July','August','September','October','November','December'],
      weekdays: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],
      legendOwn: 'Our event',
      legendAttending: "We're attending",
      legendNone: 'No events',
      close: 'Close',
      eventsOn: 'Events on',
      calendarError: 'Failed to load the events calendar.'
    }
  };
  const T = I18N[LANG];

  // API віддає start_at (час виїзду) в UTC (напр. "2026-07-28 16:00:00").
  // Раніше тут використовувався meetup_at (час збору) — змінено на
  // start_at, щоб на сайті відображався саме час виїзду.
  // Для української версії сайту конвертуємо це в київський час
  // (Europe/Kyiv сама враховує перехід на літній/зимовий час).
  // Англійська версія лишається як є — без конвертації.
  function toKyivParts(meetupAtUtc) {
    if (!meetupAtUtc) return null;
    const iso = meetupAtUtc.replace(' ', 'T') + 'Z';
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

  // Тільки час (HH:MM) для відображення в модалці календаря.
  function displayTime(meetupAtUtc) {
    if (!meetupAtUtc) return '';
    if (LANG === 'uk') {
      const kyiv = toKyivParts(meetupAtUtc);
      return kyiv ? kyiv.time : '';
    }
    return meetupAtUtc.substring(11, 16);
  }

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

  // Примусово розкриваємо контейнер та всіх його .reveal-предків —
  // виправляє race condition з observer'ом (описано детальніше нижче).
  function forceReveal(container) {
    if (!container) return;
    const revealTarget = container.closest('.reveal') || container;
    let el = revealTarget;
    while (el && el !== document.body) {
      if (el.classList.contains('reveal')) {
        el.classList.add('revealed');
        el.style.transform = '';
        el.style.transition = '';
      }
      el = el.parentElement;
    }
  }

  // Універсальний fetch з ретраями та експоненційною паузою.
  // Повертає масив events (data.events) або кидає помилку після вичерпання спроб.
  async function fetchEventsWithRetry(apiUrl, retries = 4) {
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
          return data.events;
        }
        throw new Error('Невірний формат відповіді API');
      } catch (error) {
        clearTimeout(timeoutId);
        lastError = error;
        console.error(`[Events] Спроба ${attempt + 1}/${retries + 1} не вдалася для ${apiUrl}:`, error);
        if (attempt < retries) {
          // Експоненційна пауза перед повторною спробою: 0.6с, 1.2с, 2.4с, 4.8с
          await new Promise(r => setTimeout(r, 600 * Math.pow(2, attempt)));
        }
      }
    }

    throw lastError || new Error('Unknown fetch error');
  }

  function renderEventsGrid(container, events, emptyText) {
    eventCatalog.render(container, events, emptyText);
    forceReveal(container);
  }

  function mountArchive(container, archived) {
    const show = LANG === 'en' ? 'Show past events' : 'Показати минулі події';
    const hide = LANG === 'en' ? 'Hide past events' : 'Приховати минулі події';
    const button = eventCatalog.element('button', 'btn-event event-archive-toggle', show);
    button.type = 'button';
    button.setAttribute('aria-controls', 'past-events');
    button.setAttribute('aria-expanded', 'false');
    const section = eventCatalog.element('section', 'event-archive');
    section.id = 'past-events';
    section.hidden = true;
    const title = eventCatalog.element('h3', 'event-archive-title', LANG === 'en' ? 'Past events' : 'Минулі події');
    const grid = eventCatalog.element('div', 'events-grid');
    section.append(title, grid);
    container.after(button, section);
    button.addEventListener('click', () => {
      const expand = section.hidden;
      if (expand && !grid.hasChildNodes()) eventCatalog.render(grid, archived, eventCatalog.labels.past);
      section.hidden = !expand;
      button.setAttribute('aria-expanded', String(expand));
      button.textContent = expand ? hide : show;
    });
  }

  // ==========================================================================
  // КАЛЕНДАР ПОДІЙ
  // ==========================================================================

  function pad2(n) { return n < 10 ? '0' + n : '' + n; }

  function dateKeyFromMeetup(meetupAt) {
    if (!meetupAt) return null;
    // Для "uk" день визначаємо за київським часом (подія о 23:30 UTC
    // може вже бути наступним днем за Києвом) — для інших мов як є з API.
    if (LANG === 'uk') {
      const kyiv = toKyivParts(meetupAt);
      return kyiv ? kyiv.dateKey : null;
    }
    return meetupAt.substring(0, 10);
  }

  function dateKeyFromParts(y, m, d) {
    return `${y}-${pad2(m + 1)}-${pad2(d)}`;
  }

  function formatHumanDate(dateKey) {
    const [y, m, d] = dateKey.split('-').map(Number);
    const monthName = T.monthNames[m - 1];
    return LANG === 'en' ? `${monthName} ${d}, ${y}` : `${d} ${monthName} ${y}`;
  }

  // Наш VTC на TruckersMP — події з /attending, що належать цьому VTC,
  // вже присутні у /events (як "наші"), тож у календарі їх ігноруємо,
  // щоб один і той самий івент не задвоювався в одному дні.
  const OWN_VTC_ID = 85940;

  function initCalendar(ownEvents, attendingEvents) {
    const calendarRoot = document.getElementById('events-calendar');
    if (!calendarRoot) return;

    const attendingWithoutOwnVtc = attendingEvents.filter(item => {
      return !(item.vtc && Number(item.vtc.id) === OWN_VTC_ID);
    });

    // Групуємо події по датах: { 'YYYY-MM-DD': [ {..., _type: 'own'|'attending'} ] }
    const eventsByDate = {};

    const seenKeys = new Set();

    function indexEvents(list, type) {
      list.forEach(item => {
        const key = dateKeyFromMeetup(item.start_at) || item.event_date;
        if (!key) return;
        const dedupeKey = `${type}-${item.id}-${key}`;
        if (seenKeys.has(dedupeKey)) return;
        seenKeys.add(dedupeKey);
        if (!eventsByDate[key]) eventsByDate[key] = [];
        eventsByDate[key].push(Object.assign({ _type: type }, item));
      });
    }
    indexEvents(ownEvents, 'own');
    indexEvents(attendingWithoutOwnVtc, 'attending');

    const today = new Date();
    const minMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const maxMonth = new Date(today.getFullYear(), today.getMonth() + 6, 1);
    let current = new Date(minMonth);

    calendarRoot.innerHTML = `
      <div class="calendar-card">
        <div class="calendar-header">
          <button type="button" class="calendar-nav-btn" id="calendar-prev" aria-label="${LANG === 'en' ? 'Previous month' : 'Попередній місяць'}">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <div class="calendar-month-label" id="calendar-month-label"></div>
          <button type="button" class="calendar-nav-btn" id="calendar-next" aria-label="${LANG === 'en' ? 'Next month' : 'Наступний місяць'}">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
          </button>
        </div>

        <div class="calendar-weekdays" id="calendar-weekdays"></div>
        <div class="calendar-grid" id="calendar-grid"></div>

        <div class="calendar-legend">
          <span class="calendar-legend-item"><span class="calendar-dot calendar-dot-own"></span>${T.legendOwn}</span>
          <span class="calendar-legend-item"><span class="calendar-dot calendar-dot-attending"></span>${T.legendAttending}</span>
          <span class="calendar-legend-item"><span class="calendar-dot calendar-dot-none"></span>${T.legendNone}</span>
        </div>
      </div>
    `;

    // Модальне вікно рендеримо ОКРЕМО і монтуємо напряму в <body>.
    // Причина: #events-calendar лежить всередині .reveal, а .reveal має
    // CSS-властивість transform (навіть translateY(0) після розкриття) —
    // будь-який transform на предку створює новий containing block для
    // position:fixed, через що затемнення модалки "прилипає" до розміру
    // календаря замість того, щоб покривати весь екран. Монтуючи оверлей
    // прямо в body, ми уникаємо цього предка з transform.
    let overlay = document.getElementById('calendar-modal-overlay');
    if (overlay) overlay.remove();
    overlay = document.createElement('div');
    overlay.className = 'calendar-modal-overlay';
    overlay.id = 'calendar-modal-overlay';
    overlay.innerHTML = `
      <div class="calendar-modal" id="calendar-modal" role="dialog" aria-modal="true" aria-labelledby="calendar-modal-title">
        <button type="button" class="calendar-modal-close" id="calendar-modal-close" aria-label="${T.close}">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </button>
        <h3 class="calendar-modal-title" id="calendar-modal-title"></h3>
        <div class="calendar-modal-list" id="calendar-modal-list"></div>
      </div>
    `;
    document.body.appendChild(overlay);

    const weekdaysEl = document.getElementById('calendar-weekdays');
    weekdaysEl.innerHTML = T.weekdays.map(w => `<div class="calendar-weekday">${w}</div>`).join('');

    const gridEl = document.getElementById('calendar-grid');
    const monthLabelEl = document.getElementById('calendar-month-label');
    const prevBtn = document.getElementById('calendar-prev');
    const nextBtn = document.getElementById('calendar-next');
    const modalCloseBtn = document.getElementById('calendar-modal-close');
    const modalTitle = document.getElementById('calendar-modal-title');
    const modalList = document.getElementById('calendar-modal-list');

    // Блокування скролу фону при відкритій модалці — для всіх пристроїв.
    // Просто overflow:hidden на body на iOS Safari не завжди зупиняє
    // скрол сторінки під фіксованим оверлеєм, тому додатково "заморожуємо"
    // body через position:fixed зі збереженням позиції скролу.
    let savedScrollY = 0;
    let scrollLocked = false;

    function lockBodyScroll() {
      savedScrollY = window.scrollY || window.pageYOffset || 0;
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${savedScrollY}px`;
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.style.width = '100%';
      if (scrollbarWidth > 0) {
        document.body.style.paddingRight = `${scrollbarWidth}px`;
      }
      scrollLocked = true;
    }

    function unlockBodyScroll() {
      if (!scrollLocked) return;
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.width = '';
      document.body.style.paddingRight = '';
      window.scrollTo(0, savedScrollY);
      scrollLocked = false;
    }

    function openModal(dateKey) {
      const dayEvents = eventsByDate[dateKey] || [];
      if (!dayEvents.length) return;

      modalTitle.textContent = `${T.eventsOn} — ${formatHumanDate(dateKey)}`;

      modalList.innerHTML = '';
      dayEvents.forEach(item => {
        const time = displayTime(item.start_at);
        const badgeText = item._type === 'own' ? T.legendOwn : T.legendAttending;
        const badgeClass = item._type === 'own' ? 'calendar-badge-own' : 'calendar-badge-attending';

        const row = document.createElement('div');
        row.className = 'calendar-modal-event';
        const body = eventCatalog.element('div', 'calendar-modal-event-body');
        body.append(
          eventCatalog.element('span', 'calendar-badge ' + badgeClass, badgeText),
          eventCatalog.element('h4', 'calendar-modal-event-title', item.name)
        );
        if (time) body.append(eventCatalog.element('div', 'calendar-modal-event-time', time));
        body.append(eventCatalog.actions(item));
        row.append(eventCatalog.banner(item, 'calendar-modal-banner'), body);
        modalList.appendChild(row);
      });

      overlay.classList.add('active');
      document.body.classList.add('calendar-modal-open');
      lockBodyScroll();
      document.addEventListener('keydown', onModalKeydown);
    }

    function closeModal() {
      overlay.classList.remove('active');
      document.body.classList.remove('calendar-modal-open');
      unlockBodyScroll();
      document.removeEventListener('keydown', onModalKeydown);
    }

    function onModalKeydown(e) {
      if (e.key === 'Escape') closeModal();
    }

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });
    modalCloseBtn.addEventListener('click', closeModal);

    function renderMonth() {
      const year = current.getFullYear();
      const month = current.getMonth();

      monthLabelEl.textContent = `${T.monthNames[month]} ${year}`;

      prevBtn.disabled = (year === minMonth.getFullYear() && month === minMonth.getMonth());
      nextBtn.disabled = (year === maxMonth.getFullYear() && month === maxMonth.getMonth());

      const firstOfMonth = new Date(year, month, 1);
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      // Понеділок = 0 ... Неділя = 6
      const leadingBlanks = (firstOfMonth.getDay() + 6) % 7;

      const todayKey = dateKeyFromParts(today.getFullYear(), today.getMonth(), today.getDate());

      let html = '';

      for (let i = 0; i < leadingBlanks; i++) {
        html += `<div class="calendar-day calendar-day-empty" aria-hidden="true"></div>`;
      }

      for (let d = 1; d <= daysInMonth; d++) {
        const key = dateKeyFromParts(year, month, d);
        const dayEvents = eventsByDate[key] || [];
        const hasOwn = dayEvents.some(ev => ev._type === 'own');
        const hasAttending = dayEvents.some(ev => ev._type === 'attending');

        let statusClass = 'calendar-day-none';
        if (hasOwn) statusClass = 'calendar-day-own';
        else if (hasAttending) statusClass = 'calendar-day-attending';

        const isToday = key === todayKey ? ' calendar-day-today' : '';
        const clickable = dayEvents.length > 0;

        html += `
          <button type="button"
            class="calendar-day ${statusClass}${isToday}"
            data-date="${key}"
            ${clickable ? '' : 'disabled'}
            aria-label="${d} ${T.monthNames[month]}${dayEvents.length ? ', ' + dayEvents.length + ' ' + (LANG === 'en' ? 'event(s)' : 'подій') : ''}">
            <span class="calendar-day-num">${d}</span>
          </button>
        `;
      }

      // Календар завжди рендериться на 6 рядків (42 клітинки), незалежно
      // від кількості днів у місяці — інакше висота блоку "стрибала" б
      // між місяцями з 4-6 рядками сітки.
      const trailingBlanks = 42 - leadingBlanks - daysInMonth;
      for (let i = 0; i < trailingBlanks; i++) {
        html += `<div class="calendar-day calendar-day-empty" aria-hidden="true"></div>`;
      }

      gridEl.innerHTML = html;

      gridEl.querySelectorAll('.calendar-day[data-date]:not([disabled])').forEach(btn => {
        btn.addEventListener('click', () => openModal(btn.dataset.date));
      });

      revealIfVisible(calendarRoot.closest('.reveal') || calendarRoot);
    }

    prevBtn.addEventListener('click', () => {
      if (prevBtn.disabled) return;
      current = new Date(current.getFullYear(), current.getMonth() - 1, 1);
      renderMonth();
    });
    nextBtn.addEventListener('click', () => {
      if (nextBtn.disabled) return;
      current = new Date(current.getFullYear(), current.getMonth() + 1, 1);
      renderMonth();
    });

    renderMonth();
    forceReveal(calendarRoot);
  }

  function showCalendarError() {
    const calendarRoot = document.getElementById('events-calendar');
    if (!calendarRoot) return;
    calendarRoot.innerHTML = `<p style="color: #9c9c9c;">${T.calendarError}</p>`;
    forceReveal(calendarRoot);
  }

  // ==========================================================================
  // ІНІЦІАЛІЗАЦІЯ
  // ==========================================================================

  const ownContainer = document.getElementById('events-container');
  const attendingContainer = document.getElementById('attending-container');

  const ownPromise = eventCatalog.load(true);
  const attendingPromise = fetchEventsWithRetry(eventCatalog.api + '/attending');

  ownPromise.then(events => {
    renderEventsGrid(ownContainer, events.filter(item => !item.archived));
    mountArchive(ownContainer, events.filter(item => item.archived).reverse());
  }).catch(error => {
    console.error('[Events]', error);
    renderEventsGrid(ownContainer, [], eventCatalog.labels.error);
  });

  attendingPromise.then(events => {
    const sorted = events.slice().sort((a, b) => String(a.start_at).localeCompare(String(b.start_at)));
    renderEventsGrid(attendingContainer, sorted, LANG === 'en'
      ? 'No attendances planned at the moment.' : 'Наразі немає запланованих відвідувань.');
  }).catch(error => {
    console.error('[Events Attending]', error);
    renderEventsGrid(attendingContainer, [], eventCatalog.labels.error);
  });

  // Календар: чекаємо обидва запити (навіть якщо один з них впав — будуємо з тим, що є)
  Promise.allSettled([ownPromise, attendingPromise]).then(([ownRes, attendingRes]) => {
    const ownEvents = ownRes.status === 'fulfilled' ? ownRes.value.filter(item => !item.archived) : [];
    const attendingEvents = attendingRes.status === 'fulfilled' ? attendingRes.value : [];

    if (ownRes.status === 'rejected' && attendingRes.status === 'rejected') {
      showCalendarError();
      return;
    }

    try {
      initCalendar(ownEvents, attendingEvents);
    } catch (e) {
      console.error('[Events] Не вдалося побудувати календар:', e);
      showCalendarError();
    }
  });

});