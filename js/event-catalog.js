const eventCatalog = (() => {
  const english = document.documentElement.lang === 'en';
  const api = 'https://api.neocrime-group.com';
  const labels = english
    ? { view: 'View Event', booking: 'Slot Booking', archive: 'View slot archive', date: 'Start time', server: 'Server', start: 'Start', finish: 'Finish', empty: 'No upcoming events at the moment.', past: 'No past events yet.', error: 'Failed to load events.' }
    : { view: 'Переглянути подію', booking: 'Бронювання слотів', archive: 'Архів слотів', date: 'Час старту', server: 'Сервер', start: 'Старт', finish: 'Фініш', empty: 'Наразі запланованих подій немає.', past: 'Минулих подій поки немає.', error: 'Не вдалося завантажити події.' };
  const formatter = new Intl.DateTimeFormat(english ? 'en-GB' : 'uk-UA', {
    timeZone: english ? 'UTC' : 'Europe/Kyiv', dateStyle: 'medium', timeStyle: 'short'
  });

  function httpUrl(value) {
    if (typeof value !== 'string') return '';
    try {
      const url = new URL(value);
      return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
    } catch {
      return '';
    }
  }

  function normalize(item) {
    const id = Number(item.id);
    if (!Number.isSafeInteger(id) || id < 1 || typeof item.title !== 'string') return null;
    const rawTmpUrl = String(item.tmp_url || '').trim();
    return {
      id,
      name: item.title,
      banner: item.banner_url,
      server: { name: item.server },
      start_at: item.event_date && item.start_time ? item.event_date + ' ' + item.start_time : '',
      event_date: item.event_date,
      eventUrl: /^\d+$/.test(rawTmpUrl) ? 'https://truckersmp.com/events/' + rawTmpUrl : httpUrl(rawTmpUrl),
      bookingUrl: 'https://slotbooking.neocrime-group.com/event/' + id,
      archived: item.is_archived === true
    };
  }

  async function load(includeArchived = false) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch(api + '/api/gatherings' + (includeArchived ? '?include_archived=1' : ''), {
        signal: controller.signal, credentials: 'omit'
      });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const data = await response.json();
      if (data.status !== 'success' || !Array.isArray(data.items)) throw new Error('Invalid event list');
      return data.items
        .filter(item => item && !item.is_hidden)
        .map(normalize)
        .filter(Boolean);
    } finally {
      clearTimeout(timeout);
    }
  }

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function banner(item, className) {
    const image = element('img', className);
    image.alt = '';
    image.loading = 'lazy';
    image.decoding = 'async';
    image.addEventListener('error', () => { image.src = 'images/events.avif'; }, { once: true });
    image.src = httpUrl(item.banner) || 'images/events.avif';
    return image;
  }

  function actions(item) {
    const row = element('div', 'event-actions');
    const truckersUrl = item.bookingUrl ? item.eventUrl :
      (/^\d+$/.test(String(item.id)) ? 'https://truckersmp.com/events/' + item.id : '');
    if (truckersUrl) {
      const view = element('a', 'btn-event', labels.view);
      view.href = truckersUrl;
      view.target = '_blank';
      view.rel = 'noopener noreferrer';
      row.append(view);
    }
    if (item.bookingUrl) {
      const booking = element('a', 'btn-event event-booking', item.archived ? labels.archive : labels.booking);
      booking.href = item.bookingUrl;
      row.append(booking);
    }
    return row;
  }

  function card(item) {
    const root = element('article', 'event-card');
    const content = element('div', 'event-content');
    const title = element('h3', 'event-title', item.name);
    title.title = item.name || '';
    const details = element('div', 'event-details');
    const start = new Date(String(item.start_at || '').replace(' ', 'T').replace(/Z?$/, 'Z'));
    const location = place => [place?.city, place?.location].filter(Boolean).join(' — ');
    for (const [label, value] of [
      [labels.date, Number.isNaN(start.getTime()) ? item.event_date : formatter.format(start)],
      [labels.start, location(item.departure)],
      [labels.finish, location(item.arrive)],
      [labels.server, item.server?.name]
    ]) {
      if (!value) continue;
      const line = element('div', 'event-detail-item');
      line.append(element('strong', '', label), element('span', '', value));
      details.append(line);
    }
    content.append(title, details, actions(item));
    root.append(banner(item, 'event-img'), content);
    return root;
  }

  function render(container, events, emptyText = labels.empty) {
    container.replaceChildren(...(events.length
      ? events.map(card)
      : [element('p', 'event-list-message', emptyText)]));
  }

  return { actions, api, banner, element, labels, load, render };
})();
