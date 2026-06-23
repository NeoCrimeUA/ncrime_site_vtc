document.addEventListener('DOMContentLoaded', () => {
  const newsContainer = document.getElementById('news-container');
  const modal = document.getElementById('news-modal');
  const modalClose = modal.querySelector('.modal-close');

  // Elements inside the modal window for dynamic substitution
  const modalImg = modal.querySelector('.modal-hero-img');
  const modalTitle = modal.querySelector('.modal-inner-title');
  const modalMeta = modal.querySelector('.modal-inner-meta');
  const modalDesc = modal.querySelector('.modal-inner-desc');

  // Storage for fetched news
  let fetchedNews = [];

  // Function to convert a "DD.MM.YYYY" date string into a Date object for accurate sorting
  function parseDate(dateStr) {
    const parts = dateStr.split('.');
    if (parts.length === 3) {
      // Date(year, month-1, day)
      return new Date(parts[2], parts[1] - 1, parts[0]);
    }
    return new Date(0);
  }

  // Load news from the endpoint
  async function loadNews() {
    try {
      const response = await fetch('https://api.neocrime.space/news_en');
      if (!response.ok) throw new Error('Failed to load data');

      const data = await response.json();

      if (data.status === 'success' && Array.isArray(data.news)) {
        fetchedNews = data.news;

        // Sort the array by date (newest to oldest)
        fetchedNews.sort((a, b) => parseDate(b.date) - parseDate(a.date));

        // Take only the latest 3 news items
        const latestNews = fetchedNews.slice(0, 3);

        // Clear the loading text from the container
        newsContainer.innerHTML = '';

        // Render the cards
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
              <div class="news-more">Read more</div>
            </div>
          `;

          // Click event on the card to open the modal
          card.addEventListener('click', () => openModal(item.id));

          newsContainer.appendChild(card);
        });
      } else {
        newsContainer.innerHTML = '<p style="color: #9c9c9c; grid-column: 1/-1;">Failed to load news.</p>';
      }
    } catch (error) {
      console.error(error);
      newsContainer.innerHTML = '<p style="color: #9c9c9c; grid-column: 1/-1;">An error occurred while connecting to the server.</p>';
    }
  }

  // Open the modal window with the full news item
  function openModal(id) {
    const item = fetchedNews.find(n => n.id === id);
    if (!item) return;

    // Populate the modal with data
    modalImg.src = item.photo_link;
    modalImg.alt = item.title;
    modalTitle.textContent = item.title;

    // Format the meta data as in the design (Date | Author)
    modalMeta.innerHTML = `${item.date} | <span>Author: ${item.author}</span>`;

    // Convert \n from JSON into HTML line breaks <br> to preserve paragraph structure
    const formattedDescription = item.description.replace(/\n/g, '<br>');
    modalDesc.innerHTML = `<p>${formattedDescription}</p>`;

    // Show the modal
    modal.classList.add('active');
    document.body.style.overflow = 'hidden'; // Lock page scroll under the modal
  }

  // Close the modal window
  function closeModal() {
    modal.classList.remove('active');
    document.body.style.overflow = ''; // Restore page scroll
  }

  modalClose.addEventListener('click', closeModal);

  // Close when clicking on the dark area around the modal
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeModal();
    }
  });

  // Initialize loading
  loadNews();
});