/* ==========================================================================
   Gallery page — filtering, masonry rendering, infinite loading, lightbox
   (lightbox itself lives in main.js and is event-delegated)
   ========================================================================== */
(() => {
  'use strict';

  // Images come from the database via the gallery API (managed in /admin/).
  const API = 'api/gallery';
  let ITEMS = [];

  const LABELS = { french: 'French', chrome: 'Chrome', bridal: 'Bridal', floral: 'Floral', minimal: 'Minimal', glitter: 'Glitter' };
  const ASPECTS = ['aspect-[4/5]', 'aspect-square', 'aspect-[3/4]', 'aspect-[4/5]', 'aspect-[5/4]', 'aspect-square'];
  const PAGE = 12;

  const { $, $$, initReveal } = window.NBA;
  const grid = $('[data-gallery-grid]');
  if (!grid) return;
  const status = $('[data-gallery-status]');
  const moreBtn = $('[data-gallery-more]');
  const sentinel = $('[data-gallery-sentinel]');
  const chips = $$('[data-filter]');

  let filter = 'all';
  let shown = 0;
  let autoLoads = 0;

  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
  const matches = () => ITEMS.filter((it) => filter === 'all' || it.tags.includes(filter));

  function card(item, index) {
    const tag = LABELS[filter] || LABELS[item.tags[0]];
    const a = document.createElement('a');
    a.href = item.src;
    a.className = `gallery-item group reveal reveal-zoom ${ASPECTS[index % ASPECTS.length]}`;
    a.style.setProperty('--delay', `${(index % PAGE % 4) * 70}ms`);
    a.dataset.lightbox = '';
    a.dataset.caption = tag ? `${item.title} · ${tag}` : item.title;
    a.innerHTML = `
      <img src="${esc(item.src)}" width="${item.w}" height="${item.h}" loading="lazy" decoding="async" alt="${esc(item.alt)}">
      <span class="gallery-overlay">
        <svg class="icon" aria-hidden="true"><use href="#i-zoom"/></svg>
        <span class="gallery-overlay-title">${esc(item.title)}</span>
        <span class="gallery-overlay-tag">${tag || ''}</span>
      </span>`;
    return a;
  }

  function renderMore() {
    const list = matches();
    const next = list.slice(shown, shown + PAGE);
    const frag = document.createDocumentFragment();
    next.forEach((item, i) => frag.appendChild(card(item, shown + i)));
    grid.appendChild(frag);
    shown += next.length;
    initReveal(grid);
    updateStatus(list.length);
  }

  function updateStatus(total) {
    status.textContent = `Showing ${shown} of ${total} designs`;
    const done = shown >= total;
    moreBtn.hidden = done;
    if (done) status.textContent = `All ${total} designs shown`;
  }

  function setFilter(value, push = true) {
    filter = LABELS[value] ? value : 'all';
    chips.forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.filter === filter)));
    grid.replaceChildren();
    shown = 0;
    autoLoads = 0;
    renderMore();
    if (push) {
      const url = new URL(location.href);
      filter === 'all' ? url.searchParams.delete('filter') : url.searchParams.set('filter', filter);
      history.replaceState(null, '', url);
    }
  }

  // Counts on chips
  function initChips() {
    chips.forEach((chip) => {
      const f = chip.dataset.filter;
      const n = f === 'all' ? ITEMS.length : ITEMS.filter((it) => it.tags.includes(f)).length;
      chip.insertAdjacentHTML('beforeend', `<span class="chip-count">${n}</span>`);
      chip.addEventListener('click', () => setFilter(f));
    });
  }

  moreBtn.addEventListener('click', renderMore);
  moreBtn.hidden = true;

  // Infinite loading: auto-load a few pages, then fall back to the button
  // so the footer stays reachable.
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !moreBtn.hidden && autoLoads < 2) {
        autoLoads += 1;
        renderMore();
      }
    }, { rootMargin: '400px 0px' }).observe(sentinel);
  }

  status.textContent = 'Loading designs…';
  fetch(API, { headers: { Accept: 'application/json' } })
    .then((res) => {
      if (!res.ok) throw new Error(res.statusText);
      return res.json();
    })
    .then((items) => {
      ITEMS = items;
      initChips();
      setFilter(new URLSearchParams(location.search).get('filter') || 'all', false);
    })
    .catch(() => {
      status.textContent = 'Sorry, the gallery could not be loaded right now. Please refresh the page or follow us on Instagram for our latest work.';
    });
})();
