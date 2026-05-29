(function () {
    'use strict';

    const API_BASE = 'https://api.neocrime.space';
    const DEFAULT_IMAGE = 'https://i.postimg.cc/kXRwBm94/LOGO-2.png';

    const LABELS = {
        uk: {
            author: 'Автор',
            readMore: 'ДЕТАЛЬНІШЕ',
            empty: 'Новини поки відсутні',
            error: 'Не вдалося завантажити новини. Спробуйте оновити сторінку.',
            loading: 'Завантаження новин...'
        },
        en: {
            author: 'Author',
            readMore: 'READ MORE',
            empty: 'No news yet',
            error: 'Failed to load news. Please refresh the page.',
            loading: 'Loading news...'
        }
    };

    let newsItems = [];
    let labels = LABELS.uk;
    let newsModal = null;

    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function parseDate(dateStr) {
        if (!dateStr) return 0;
        const parts = String(dateStr).trim().split('.');
        if (parts.length !== 3) return 0;
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const year = parseInt(parts[2], 10);
        const d = new Date(year, month, day);
        return isNaN(d.getTime()) ? 0 : d.getTime();
    }

    function sortNewsByDate(items) {
        return [...items].sort((a, b) => parseDate(b.date) - parseDate(a.date));
    }

    function formatDescription(text) {
        if (!text) return '';
        const escaped = escapeHtml(String(text).trim());
        return escaped
            .split(/\n\s*\n/)
            .filter(Boolean)
            .map((block) => `<p>${block.replace(/\n/g, '<br>')}</p>`)
            .join('');
    }

    function getPhotoUrl(item) {
        const url = item.photo_link && String(item.photo_link).trim();
        return url || DEFAULT_IMAGE;
    }

    function renderNewsCard(item, index, delayIndex) {
        const photo = escapeHtml(getPhotoUrl(item));
        const title = escapeHtml(item.title || '');
        const alt = title;
        const date = escapeHtml(item.date || '');
        const author = escapeHtml(item.author || '');

        return `
            <div class="news-wrapper" data-aos="fade-up" data-aos-delay="${Math.min(50 + delayIndex * 50, 400)}">
                <div class="news-card" data-news-index="${index}" role="button" tabindex="0">
                    <div class="news-img-wrapper">
                        <img src="${photo}" alt="${alt}" loading="lazy">
                    </div>
                    <div class="news-content">
                        <span class="news-date"><i class="far fa-calendar-alt"></i> ${date}</span>
                        <h3 class="news-title">${title}</h3>
                        <p class="news-author">${labels.author}: ${author}</p>
                        <span class="read-more">${labels.readMore} <i class="fas fa-arrow-right"></i></span>
                    </div>
                </div>
            </div>
        `;
    }

    function renderModalContent(item) {
        const photo = escapeHtml(getPhotoUrl(item));
        const title = escapeHtml(item.title || '');
        const date = escapeHtml(item.date || '');
        const author = escapeHtml(item.author || '');
        const body = formatDescription(item.description || '');

        return `
            <img src="${photo}" alt="${title}">
            <div class="news-modal-text">
                <h3>${title}</h3>
                <span class="news-date">${date} | ${labels.author}: ${author}</span>
                ${body}
            </div>
        `;
    }

    window.openNewsModal = function (index) {
        const item = newsItems[index];
        if (!item || !newsModal) return;

        const body = document.getElementById('news-modal-body');
        if (body) {
            body.innerHTML = renderModalContent(item);
        }

        newsModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    };

    window.closeNewsModal = function () {
        if (!newsModal) return;
        newsModal.classList.remove('active');
        document.body.style.overflow = '';
    };

    function bindCardClicks(grid) {
        grid.querySelectorAll('.news-card[data-news-index]').forEach((card) => {
            const index = parseInt(card.getAttribute('data-news-index'), 10);
            card.addEventListener('click', () => openNewsModal(index));
            card.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openNewsModal(index);
                }
            });
        });
    }

    function showStatus(grid, message) {
        grid.innerHTML = `<p class="news-status" style="grid-column: 1 / -1; text-align: center; color: #aaa; padding: 40px;">${message}</p>`;
    }

    async function fetchNews(endpoint) {
        const response = await fetch(endpoint, { cache: 'no-store' });
        if (!response.ok) {
            throw new Error('HTTP ' + response.status);
        }
        const data = await response.json();
        if (!Array.isArray(data.news)) {
            throw new Error('Invalid response');
        }
        return data.news;
    }

    async function init() {
        const config = window.NEOCRIME_NEWS_CONFIG || {};
        const lang = config.lang === 'en' ? 'en' : 'uk';
        labels = LABELS[lang];

        const endpoint = config.endpoint || (lang === 'en'
            ? API_BASE + '/news_en'
            : API_BASE + '/news');
        const limit = typeof config.limit === 'number' ? config.limit : null;

        const grid = document.getElementById('news-grid');
        if (!grid) return;

        newsModal = document.getElementById('news-modal');

        if (newsModal) {
            newsModal.addEventListener('click', (e) => {
                if (e.target === newsModal) closeNewsModal();
            });
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && newsModal.classList.contains('active')) {
                    closeNewsModal();
                }
            });
        }

        showStatus(grid, labels.loading);

        try {
            let items = await fetchNews(endpoint);
            items = sortNewsByDate(items);

            if (limit !== null && limit > 0) {
                items = items.slice(0, limit);
            }

            newsItems = items;

            if (items.length === 0) {
                showStatus(grid, labels.empty);
                return;
            }

            grid.innerHTML = items.map((item, i) => renderNewsCard(item, i, i)).join('');
            bindCardClicks(grid);

            if (typeof AOS !== 'undefined') {
                AOS.refresh();
            }
        } catch (err) {
            console.error('News load error:', err);
            showStatus(grid, labels.error);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
