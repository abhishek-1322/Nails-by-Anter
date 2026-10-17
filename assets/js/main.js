/* ==========================================================================
   Nails by A — shared interactions (loaded on every page)
   Header · mobile menu · scroll reveal · carousel · testimonial slider ·
   lightbox · counters · sticky mobile CTA · form validation
   ========================================================================== */
(() => {
  'use strict';

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Sticky header state ---------- */
  function initHeader() {
    const header = $('#site-header');
    if (!header) return;
    const update = () => header.classList.toggle('is-scrolled', window.scrollY > 12);
    update();
    window.addEventListener('scroll', update, { passive: true });
  }

  /* ---------- Mobile menu (focus-trapped drawer) ---------- */
  function initMobileMenu() {
    const menu = $('#mobile-menu');
    const openBtn = $('[data-menu-open]');
    if (!menu || !openBtn) return;

    const focusables = () =>
      $$('a[href], button:not([disabled])', menu).filter((el) => el.offsetParent !== null);

    const open = () => {
      menu.classList.add('is-open');
      menu.setAttribute('aria-hidden', 'false');
      openBtn.setAttribute('aria-expanded', 'true');
      document.body.classList.add('is-locked');
      setTimeout(() => focusables()[0]?.focus(), 60);
    };
    const close = () => {
      menu.classList.remove('is-open');
      menu.setAttribute('aria-hidden', 'true');
      openBtn.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('is-locked');
      openBtn.focus();
    };

    openBtn.addEventListener('click', open);
    $$('[data-menu-close]', menu).forEach((el) => el.addEventListener('click', close));

    menu.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') return close();
      if (e.key !== 'Tab') return;
      const items = focusables();
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });

    // Close if the viewport grows to desktop while open.
    window.matchMedia('(min-width: 1024px)').addEventListener('change', (e) => {
      if (e.matches && menu.classList.contains('is-open')) close();
    });
  }

  /* ---------- Scroll reveal ---------- */
  function initReveal(root = document) {
    const items = $$('.reveal:not(.is-visible)', root);
    if (!items.length) return;
    if (prefersReducedMotion || !('IntersectionObserver' in window)) {
      items.forEach((el) => el.classList.add('is-visible'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    items.forEach((el) => io.observe(el));
  }

  /* ---------- Scroll-snap carousel ---------- */
  function initCarousels() {
    $$('[data-carousel]').forEach((root) => {
      const track = $('[data-carousel-track]', root);
      const prev = $('[data-carousel-prev]', root);
      const next = $('[data-carousel-next]', root);
      if (!track) return;

      const step = () => {
        const item = track.firstElementChild;
        const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
        return item ? item.getBoundingClientRect().width + gap : track.clientWidth;
      };
      const update = () => {
        const max = track.scrollWidth - track.clientWidth - 2;
        if (prev) prev.disabled = track.scrollLeft <= 2;
        if (next) next.disabled = track.scrollLeft >= max;
      };

      prev?.addEventListener('click', () => track.scrollBy({ left: -step(), behavior: 'smooth' }));
      next?.addEventListener('click', () => track.scrollBy({ left: step(), behavior: 'smooth' }));
      track.addEventListener('scroll', update, { passive: true });
      window.addEventListener('resize', update);
      update();
    });
  }

  /* ---------- Testimonial slider ---------- */
  function initSliders() {
    $$('[data-slider]').forEach((root) => {
      const track = $('[data-slider-track]', root);
      const slides = track ? Array.from(track.children) : [];
      if (slides.length < 2) return;
      const dotsWrap = $('[data-slider-dots]', root);
      let index = 0;
      let timer = null;

      const dots = slides.map((_, i) => {
        const dot = document.createElement('button');
        dot.type = 'button';
        dot.className = 'slider-dot';
        dot.setAttribute('aria-label', `Show testimonial ${i + 1}`);
        dot.addEventListener('click', () => { go(i); restart(); });
        dotsWrap?.appendChild(dot);
        return dot;
      });

      function go(i) {
        index = (i + slides.length) % slides.length;
        track.style.transform = `translateX(-${index * 100}%)`;
        slides.forEach((s, n) => {
          s.setAttribute('aria-hidden', String(n !== index));
          s.inert = n !== index;
        });
        dots.forEach((d, n) => d.setAttribute('aria-current', String(n === index)));
      }
      const stop = () => { clearInterval(timer); timer = null; };
      const start = () => {
        if (prefersReducedMotion || timer) return;
        track.setAttribute('aria-live', 'off');
        timer = setInterval(() => go(index + 1), 6500);
      };
      const restart = () => { stop(); start(); };

      $('[data-slider-prev]', root)?.addEventListener('click', () => { go(index - 1); restart(); });
      $('[data-slider-next]', root)?.addEventListener('click', () => { go(index + 1); restart(); });

      // Pause while the user is interacting.
      root.addEventListener('mouseenter', stop);
      root.addEventListener('mouseleave', start);
      root.addEventListener('focusin', () => { stop(); track.setAttribute('aria-live', 'polite'); });
      root.addEventListener('focusout', start);

      // Touch swipe.
      let startX = 0;
      track.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; stop(); }, { passive: true });
      track.addEventListener('touchend', (e) => {
        const dx = e.changedTouches[0].clientX - startX;
        if (Math.abs(dx) > 40) go(index + (dx < 0 ? 1 : -1));
        start();
      });

      go(0);
      start();
    });
  }

  /* ---------- Lightbox (event-delegated; works for dynamically added items) ---------- */
  const Lightbox = (() => {
    let dialog, img, title, tag, counter, items = [], current = 0, opener = null;

    function build() {
      dialog = document.createElement('dialog');
      dialog.className = 'lightbox';
      dialog.setAttribute('aria-label', 'Image viewer');
      dialog.innerHTML = `
        <figure>
          <img alt="">
          <figcaption>
            <p class="font-display text-2xl" data-lb-title></p>
            <p class="mt-1 text-[0.65rem] font-semibold uppercase tracking-[0.26em] text-gold-300" data-lb-tag></p>
            <p class="mt-3 text-xs text-cream/60" data-lb-counter></p>
          </figcaption>
        </figure>
        <button type="button" class="lightbox-btn right-4 top-4" data-lb-close aria-label="Close viewer"><svg class="icon"><use href="#i-close"/></svg></button>
        <button type="button" class="lightbox-btn left-3 top-1/2 -translate-y-1/2 sm:left-6" data-lb-prev aria-label="Previous image"><svg class="icon"><use href="#i-chevron-left"/></svg></button>
        <button type="button" class="lightbox-btn right-3 top-1/2 -translate-y-1/2 sm:right-6" data-lb-next aria-label="Next image"><svg class="icon"><use href="#i-chevron-right"/></svg></button>`;
      document.body.appendChild(dialog);
      img = $('img', dialog);
      title = $('[data-lb-title]', dialog);
      tag = $('[data-lb-tag]', dialog);
      counter = $('[data-lb-counter]', dialog);

      $('[data-lb-close]', dialog).addEventListener('click', () => dialog.close());
      $('[data-lb-prev]', dialog).addEventListener('click', () => show(current - 1));
      $('[data-lb-next]', dialog).addEventListener('click', () => show(current + 1));
      dialog.addEventListener('click', (e) => { if (e.target === dialog || e.target.tagName === 'FIGURE') dialog.close(); });
      dialog.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft') show(current - 1);
        if (e.key === 'ArrowRight') show(current + 1);
      });
      dialog.addEventListener('close', () => {
        document.body.classList.remove('is-locked');
        opener?.focus();
      });

      let sx = 0;
      dialog.addEventListener('touchstart', (e) => { sx = e.touches[0].clientX; }, { passive: true });
      dialog.addEventListener('touchend', (e) => {
        const dx = e.changedTouches[0].clientX - sx;
        if (Math.abs(dx) > 50) show(current + (dx < 0 ? 1 : -1));
      });
    }

    function show(i) {
      current = (i + items.length) % items.length;
      const el = items[current];
      const [t, g] = (el.dataset.caption || '').split(' · ');
      img.src = el.getAttribute('href');
      img.alt = $('img', el)?.alt || t || '';
      title.textContent = t || '';
      tag.textContent = g || '';
      counter.textContent = `${current + 1} / ${items.length}`;
      $$('[data-lb-prev], [data-lb-next]', dialog).forEach((b) => { b.hidden = items.length < 2; });
    }

    function open(el) {
      if (!dialog) build();
      const group = el.closest('[data-lightbox-group]') || document;
      items = $$('[data-lightbox]', group).filter((a) => a.offsetParent !== null);
      opener = el;
      show(Math.max(0, items.indexOf(el)));
      dialog.showModal();
      document.body.classList.add('is-locked');
    }

    document.addEventListener('click', (e) => {
      const trigger = e.target.closest('[data-lightbox]');
      if (!trigger || e.metaKey || e.ctrlKey) return;
      e.preventDefault();
      open(trigger);
    });

    return { open };
  })();

  /* ---------- Count-up numbers ---------- */
  function initCounters() {
    const els = $$('[data-count]');
    if (!els.length) return;
    const fmt = new Intl.NumberFormat('en-IN');
    const run = (el) => {
      const target = parseFloat(el.dataset.count);
      const decimals = (el.dataset.count.split('.')[1] || '').length;
      const suffix = el.dataset.suffix || '';
      if (prefersReducedMotion) { el.textContent = fmt.format(target) + suffix; return; }
      const t0 = performance.now();
      const dur = 1600;
      const tick = (now) => {
        const p = Math.min(1, (now - t0) / dur);
        const val = target * (1 - Math.pow(1 - p, 3));
        el.textContent = (decimals ? val.toFixed(decimals) : fmt.format(Math.round(val))) + suffix;
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { run(en.target); io.unobserve(en.target); } });
    }, { threshold: 0.6 });
    els.forEach((el) => io.observe(el));
  }

  /* ---------- Sticky "Book Now" bar on mobile ---------- */
  function initStickyCta() {
    const bar = $('[data-sticky-cta]');
    if (!bar) return;
    const footer = $('.site-footer');
    let footerVisible = false;
    const update = () => bar.classList.toggle('is-visible', window.scrollY > 420 && !footerVisible);
    if (footer && 'IntersectionObserver' in window) {
      new IntersectionObserver(([en]) => { footerVisible = en.isIntersecting; update(); }).observe(footer);
    }
    window.addEventListener('scroll', update, { passive: true });
    update();
  }

  /* ---------- Form validation (any form[data-validate]) ---------- */
  function validateField(field) {
    const errorEl = document.getElementById(`${field.id}-error`);
    let message = '';
    if (field.validity.valueMissing) message = field.dataset.msgRequired || 'This field is required.';
    else if (field.validity.typeMismatch && field.type === 'email') message = 'Please enter a valid email address.';
    else if (field.validity.patternMismatch) message = field.dataset.msgPattern || 'Please check the format.';
    else if (field.validity.tooShort) message = `Please enter at least ${field.minLength} characters.`;
    field.setAttribute('aria-invalid', String(!!message));
    if (errorEl) { errorEl.textContent = message; errorEl.hidden = !message; }
    return !message;
  }

  function initForms() {
    $$('form[data-validate]').forEach((form) => {
      form.noValidate = true;
      const fields = $$('input, select, textarea', form).filter((f) => f.willValidate);
      fields.forEach((f) => {
        f.addEventListener('blur', () => { if (f.value) validateField(f); });
        f.addEventListener('input', () => { if (f.getAttribute('aria-invalid') === 'true') validateField(f); });
      });

      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const invalid = fields.filter((f) => !validateField(f));
        if (invalid.length) { invalid[0].focus(); return; }

        const btn = $('[type="submit"]', form);
        const label = btn?.innerHTML;
        if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }

        try {
          // Set data-endpoint (e.g. Formspree / your API) to deliver submissions.
          if (form.dataset.endpoint) {
            const res = await fetch(form.dataset.endpoint, {
              method: 'POST',
              body: new FormData(form),
              headers: { Accept: 'application/json' },
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
          } else {
            await new Promise((r) => setTimeout(r, 700));
          }
          form.reset();
          const success = $('[data-form-success]', form.parentElement);
          if (success) { success.hidden = false; success.focus(); }
        } catch (err) {
          const failure = $('[data-form-error]', form.parentElement);
          if (failure) failure.hidden = false;
          console.error(err);
        } finally {
          if (btn) { btn.disabled = false; btn.innerHTML = label; }
        }
      });
    });
  }

  /* ---------- Misc ---------- */
  function initYear() {
    $$('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });
  }

  document.addEventListener('DOMContentLoaded', () => {
    initHeader();
    initMobileMenu();
    initReveal();
    initCarousels();
    initSliders();
    initCounters();
    initStickyCta();
    initForms();
    initYear();
  });

  // Small public API for page-specific scripts.
  window.NBA = { $, $$, initReveal, validateField, Lightbox };
})();
