/* ==========================================================================
   Home page — fills the gallery preview from the gallery API.
   The static images in the markup stay as a fallback if the API fails.
   ========================================================================== */
(() => {
  'use strict';

  const { $, initReveal } = window.NBA;
  const grid = $('[data-home-gallery]');
  if (!grid) return;

  const LABELS = { french: 'French', chrome: 'Chrome', bridal: 'Bridal', floral: 'Floral', minimal: 'Minimal', glitter: 'Glitter' };
  const ASPECTS = ['aspect-[4/5]', 'aspect-square', 'aspect-square', 'aspect-[4/5]'];
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

  function card(item, i) {
    const tag = LABELS[item.tags[0]] || '';
    const a = document.createElement('a');
    a.href = item.src;
    a.className = `gallery-item group reveal reveal-zoom ${ASPECTS[i % ASPECTS.length]}`;
    a.style.setProperty('--delay', `${(i % 4) * 60}ms`);
    a.dataset.lightbox = '';
    a.dataset.caption = tag ? `${item.title} · ${tag}` : item.title;
    a.innerHTML = `
      <img src="${esc(item.src)}" width="${item.w}" height="${item.h}" loading="lazy" decoding="async" alt="${esc(item.alt)}">
      <span class="gallery-overlay"><svg class="icon" aria-hidden="true"><use href="#i-zoom"/></svg><span class="gallery-overlay-title">${esc(item.title)}</span><span class="gallery-overlay-tag">${tag}</span></span>`;
    return a;
  }

  fetch('api/gallery?home=1', { headers: { Accept: 'application/json' } })
    .then((res) => (res.ok ? res.json() : Promise.reject(res.statusText)))
    .then((items) => {
      if (!items.length) return;
      grid.replaceChildren(...items.map(card));
      initReveal(grid);
    })
    .catch(() => {}); // keep the static fallback
})();
