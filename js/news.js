document.addEventListener('DOMContentLoaded', () => {
  const newsContainer = document.getElementById('news-container');
  const modal = document.getElementById('news-modal');
  const modalClose = modal.querySelector('.modal-close');
  
  // Элементы внутри модального окна для динамической подстановки
  const modalImg = modal.querySelector('.modal-hero-img');
  const modalTitle = modal.querySelector('.modal-inner-title');
  const modalMeta = modal.querySelector('.modal-inner-meta');
  const modalDesc = modal.querySelector('.modal-inner-desc');

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
        
        // Берем только топ-3 последние новости
        const latestNews = fetchedNews.slice(0, 3);
        
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
              <div class="news-more">Детальніше</div>
            </div>
          `;
          
          // Событие клика на карточку для открытия модалки
          card.addEventListener('click', () => openModal(item.id));
          
          newsContainer.appendChild(card);
        });
      } else {
        newsContainer.innerHTML = '<p style="color: #9c9c9c; grid-column: 1/-1;">Не вдалося завантажити новини.</p>';
      }
    } catch (error) {
      console.error(error);
      newsContainer.innerHTML = '<p style="color: #9c9c9c; grid-column: 1/-1;">Сталася помилка при з’єднанні з сервером.</p>';
    }
  }

  // Открытие модального окна с полной новостью
  function openModal(id) {
    const item = fetchedNews.find(n => n.id === id);
    if (!item) return;

    // Подставляем данные в модалку
    modalImg.src = item.photo_link;
    modalImg.alt = item.title;
    modalTitle.textContent = item.title;
    
    // Форматируем мета-данные как на скриншоте (Дата | Автор)
    modalMeta.innerHTML = `${item.date} | <span>Автор: ${item.author}</span>`;
    
    // Преобразуем \n из JSON в HTML-переносы строк <br> для сохранения структуры абзацев
    const formattedDescription = item.description.replace(/\n/g, '<br>');
    modalDesc.innerHTML = `<p>${formattedDescription}</p>`;

    // Показываем модалку
    modal.classList.add('active');
    document.body.style.overflow = 'hidden'; // Блокируем скролл страницы под модалкой
  }

  // Закрытие модального окна
  function closeModal() {
    modal.classList.remove('active');
    document.body.style.overflow = ''; // Возвращаем скролл страницы
  }

  modalClose.addEventListener('click', closeModal);

  // Закрытие при клике на темную область вокруг модалки
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeModal();
    }
  });

  // Инициализация загрузки
  loadNews();
});