document.addEventListener('DOMContentLoaded', () => {
  const newsContainer = document.getElementById('news-container');
  const modal = document.getElementById('news-modal');
  const modalClose = modal.querySelector('.modal-close');
  
  // Элементы внутри модального окна для динамической подстановки
  const modalImg = modal.querySelector('.modal-hero-img');
  const modalTitle = modal.querySelector('.modal-inner-title');
  const modalMeta = modal.querySelector('.modal-inner-meta');
  const modalDesc = modal.querySelector('.modal-inner-desc');
  const modalSub = modal.querySelector('.modal-inner-subtitle');
  const modalScroll = modal.querySelector('.modal-scroll');

  const HASH_PREFIX = 'news-';
  let pushed = false;   // чи ми самі додали запис в історію браузера

  // Хранилище для полученных новостей
  let fetchedNews = [];

  // Функция для преобразования строки даты "ДД.ММ.ГГГГ" в объект Date для точной сортировки
  function parseDate(dateStr) {
    const parts = dateStr.split('.');
    if (parts.length === 3) {
      // Date(год, месяц-1, день)
      return new Date(parts[2], parts[1] - 1, parts[0]);
    }
    return new Date(0);
  }

  // Загрузка новостей с эндпоинта
  async function loadNews() {
    try {
      const response = await fetch('https://api.neocrime.space/news');
      if (!response.ok) throw new Error('Помилка завантаження даних');
      
      const data = await response.json();
      
      if (data.status === 'success' && Array.isArray(data.news)) {
        fetchedNews = data.news;
        
        // Сортируем массив по дате (от самых свежих к старым)
        fetchedNews.sort((a, b) => parseDate(b.date) - parseDate(a.date));
        
        // Берем до 9 последних новостей — на главной они листаются каруселью
        const latestNews = fetchedNews.slice(0, 9);
        
        // Очищаем контейнер от текста загрузки
        newsContainer.innerHTML = '';
        
        // Рендерим карточки
        latestNews.forEach(item => {
          const card = document.createElement('div');
          card.className = 'news-card';
          card.setAttribute('data-id', item.id);
          
          card.innerHTML = `
            <img src="${item.photo_link}" alt="${item.title}" class="news-img" loading="lazy">
            <div class="news-content">
              <h3 class="news-title">${item.title}</h3>
              <p class="news-summary">${item.summary}</p>
              <hr class="news-divider">
              <div class="news-meta">${item.author} — ${item.date}</div>
              <div class="news-more">Детальніше <span class="btn-ico btn-ico-news"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8M15 18h-5"/><path d="M10 6h8v4h-8V6Z"/></svg></span></div>
            </div>
          `;
          
          newsContainer.appendChild(card);
        });

        // Сайт відкрито за посиланням #news-ID — одразу показуємо новину
        const hid = hashId();
        if (hid !== null) openModal(hid);
      } else {
        newsContainer.innerHTML = '<p style="color: #9c9c9c; grid-column: 1/-1;">Не вдалося завантажити новини.</p>';
      }
    } catch (error) {
      console.error(error);
      newsContainer.innerHTML = '<p style="color: #9c9c9c; grid-column: 1/-1;">Сталася помилка при з’єднанні з сервером.</p>';
    }
  }

  // ---------- хеш в адресі: #news-ID ----------
  function hashId() {
    const h = decodeURIComponent(location.hash.replace(/^#/, ''));
    return h.indexOf(HASH_PREFIX) === 0 ? h.slice(HASH_PREFIX.length) : null;
  }
  function isOpen() { return modal.classList.contains('active'); }

  // ---------- блокування прокрутки сторінки ----------
  function lockScroll() {
    const sw = window.innerWidth - document.documentElement.clientWidth;
    document.documentElement.classList.add('modal-open');
    if (sw > 0) document.body.style.paddingRight = sw + 'px';
  }
  function unlockScroll() {
    document.documentElement.classList.remove('modal-open');
    document.body.style.paddingRight = '';
  }
  // колесо / тач поза вікном новини не повинні крутити сторінку
  modal.addEventListener('wheel', (e) => {
    if (!modalScroll.contains(e.target)) e.preventDefault();
  }, { passive: false });
  modal.addEventListener('touchmove', (e) => {
    if (!modalScroll.contains(e.target)) e.preventDefault();
  }, { passive: false });

  // ---------- відкриття / закриття ----------
  function openModal(id) {
    const item = fetchedNews.find(n => String(n.id) === String(id));
    if (!item) return false;

    modalImg.src = item.photo_link;
    modalImg.alt = item.title;
    modalTitle.textContent = item.title;
    modalSub.textContent = item.summary || '';
    modalMeta.innerHTML = `${item.date} | <span>Автор: ${item.author}</span>`;

    // кожен рядок з JSON (\n) стає окремим абзацом
    modalDesc.innerHTML = String(item.description || '')
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)
      .map(line => `<p>${line}</p>`)
      .join('');

    modalScroll.scrollTop = 0;
    modal.classList.add('active');
    lockScroll();
    return true;
  }

  function hideModal() {
    modal.classList.remove('active');
    unlockScroll();
  }

  // закриття користувачем: якщо ми додавали запис в історію — просто йдемо "назад"
  function requestClose() {
    if (pushed) {
      history.back();            // popstate закриє вікно
    } else {
      hideModal();
      if (hashId() !== null) history.replaceState(null, '', location.pathname + location.search);
    }
  }

  modalClose.addEventListener('click', requestClose);
  modal.addEventListener('click', (e) => { if (e.target === modal) requestClose(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && isOpen()) requestClose(); });

  // Кнопки браузера Назад / Вперед
  function syncWithHash() {
    const id = hashId();
    if (id === null) {
      pushed = false;
      if (isOpen()) hideModal();
    } else if (openModal(id)) {
      pushed = true;
    }
  }
  window.addEventListener('popstate', syncWithHash);

  // Клік по картці (делегування — працює і для клонів каруселі)
  newsContainer.addEventListener('click', (e) => {
    const card = e.target.closest('.news-card');
    if (!card) return;
    const id = card.getAttribute('data-id');
    if (!openModal(id)) return;
    if (hashId() !== String(id)) {
      history.pushState({ news: id }, '', '#' + HASH_PREFIX + encodeURIComponent(id));
      pushed = true;
    }
  });

  // Инициализация загрузки
  loadNews();
});