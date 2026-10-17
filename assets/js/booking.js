/* ==========================================================================
   Booking wizard — service → artist → date → time → details → confirmation
   Availability is simulated client-side; connect `data-endpoint` on the form
   (or replace `submitBooking`) to send bookings to your backend / calendar.
   ========================================================================== */
(() => {
  'use strict';

  const SERVICES = [
    { id: 'classic-manicure', name: 'Classic Manicure', duration: 45, price: 799, img: 'g-french.webp' },
    { id: 'gel-polish', name: 'Gel Polish', duration: 60, price: 1199, img: 'g-pink-chrome.webp' },
    { id: 'nail-extensions', name: 'Nail Extensions', duration: 120, price: 2499, img: 'sig-glam.webp' },
    { id: 'custom-nail-art', name: 'Custom Nail Art', duration: 90, price: 1499, img: 'sig-floral.webp' },
    { id: 'bridal-nails', name: 'Bridal Nails', duration: 150, price: 4999, img: 'hero.webp' },
    { id: 'luxury-spa', name: 'Luxury Spa Package', duration: 120, price: 3499, img: 'cta-hand.webp' },
  ];

  const ARTISTS = [
    { id: 'any', name: 'First available', role: 'Fastest way to book', initial: '✦' },
    { id: 'aanya', name: 'Aanya', role: 'Founder · Bridal & fine art', initial: 'A' },
    { id: 'simran', name: 'Simran', role: 'Senior artist · Extensions & chrome', initial: 'S' },
    { id: 'meher', name: 'Meher', role: 'Specialist · Florals & minimal', initial: 'M' },
  ];

  // Opening hours by weekday (0 = Sunday). null = closed.
  const HOURS = { 0: [10, 19], 1: null, 2: [11, 20], 3: [11, 20], 4: [11, 20], 5: [11, 20], 6: [10, 19] };
  const BOOKING_WINDOW_DAYS = 60;
  const STEP_NAMES = ['Service', 'Artist', 'Date', 'Time', 'Details', 'Confirmed'];

  const { $, $$, validateField } = window.NBA;
  const form = $('[data-booking]');
  if (!form) return;

  const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
  const longDate = new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  const ariaDate = new Intl.DateTimeFormat('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const monthTitle = new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' });

  const today = startOfDay(new Date());
  const maxDate = addDays(today, BOOKING_WINDOW_DAYS);

  const state = { step: 1, service: null, artist: null, date: null, time: null, view: new Date(today.getFullYear(), today.getMonth(), 1) };

  /* ---------- helpers ---------- */
  function startOfDay(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
  function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
  function sameDay(a, b) { return a && b && a.toDateString() === b.toDateString(); }
  function iso(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
  function fmtTime(mins) {
    const h = Math.floor(mins / 60), m = mins % 60;
    const suffix = h >= 12 ? 'PM' : 'AM';
    return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${suffix}`;
  }
  function fmtDuration(mins) { const h = Math.floor(mins / 60), m = mins % 60; return [h && `${h} hr`, m && `${m} min`].filter(Boolean).join(' '); }
  // Deterministic pseudo-random so "booked" slots stay stable between renders.
  function hash(str) { let h = 2166136261; for (const c of str) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return Math.abs(h); }
  const service = () => SERVICES.find((s) => s.id === state.service);
  const artist = () => ARTISTS.find((a) => a.id === state.artist);
  const isOpen = (d) => !!HOURS[d.getDay()] && d >= today && d <= maxDate;

  /* ---------- Step 1 + 2: option cards ---------- */
  function renderOptions() {
    $('[data-services]').innerHTML = SERVICES.map((s) => `
      <label class="option-card">
        <input type="radio" name="service" value="${s.id}" class="sr-only">
        <img src="assets/images/${s.img}" alt="" width="80" height="80" loading="lazy" class="h-20 w-20 shrink-0 rounded-xl object-cover">
        <span class="min-w-0 flex-1 pr-6">
          <span class="block font-display text-lg leading-snug text-ink">${s.name}</span>
          <span class="mt-1 flex items-center gap-1.5 text-xs text-ink-mute"><svg class="icon h-3.5 w-3.5 text-gold" aria-hidden="true"><use href="#i-clock"/></svg>${fmtDuration(s.duration)}</span>
          <span class="mt-2 block font-display text-lg text-burgundy">${inr.format(s.price)}</span>
        </span>
        <span class="option-check" aria-hidden="true"><svg class="icon"><use href="#i-check"/></svg></span>
      </label>`).join('');

    $('[data-artists]').innerHTML = ARTISTS.map((a) => `
      <label class="option-card items-center">
        <input type="radio" name="artist" value="${a.id}" class="sr-only">
        <span class="flex h-14 w-14 shrink-0 items-center justify-center rounded-full ${a.id === 'any' ? 'bg-burgundy text-cream' : 'bg-blush text-burgundy'} font-display text-xl" aria-hidden="true">${a.initial}</span>
        <span class="min-w-0 flex-1 pr-6">
          <span class="block font-display text-lg text-ink">${a.name}</span>
          <span class="mt-0.5 block text-xs text-ink-mute">${a.role}</span>
        </span>
        <span class="option-check" aria-hidden="true"><svg class="icon"><use href="#i-check"/></svg></span>
      </label>`).join('');

    form.addEventListener('change', (e) => {
      const { name, value } = e.target;
      if (name === 'service') { state.service = value; state.time = null; updateAll(); }
      if (name === 'artist') { state.artist = value; state.time = null; updateAll(); }
    });
  }

  /* ---------- Step 3: calendar ---------- */
  function renderCalendar() {
    const grid = $('[data-cal-grid]');
    const { view } = state;
    $('[data-cal-title]').textContent = monthTitle.format(view);
    $('[data-cal-prev]').disabled = view <= new Date(today.getFullYear(), today.getMonth(), 1);
    $('[data-cal-next]').disabled = new Date(view.getFullYear(), view.getMonth() + 1, 1) > maxDate;

    const first = view.getDay();
    const daysInMonth = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
    let html = '<span></span>'.repeat(first);
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(view.getFullYear(), view.getMonth(), day);
      const open = isOpen(d);
      const classes = ['cal-day', sameDay(d, today) && 'is-today'].filter(Boolean).join(' ');
      const label = `${ariaDate.format(d)}${open ? '' : HOURS[d.getDay()] ? ', unavailable' : ', closed'}`;
      html += `<button type="button" class="${classes}" data-date="${iso(d)}" aria-label="${label}" aria-pressed="${sameDay(d, state.date)}" ${open ? '' : 'disabled'}>${day}</button>`;
    }
    grid.innerHTML = html;
  }

  function initCalendar() {
    const grid = $('[data-cal-grid]');
    $('[data-cal-prev]').addEventListener('click', () => { state.view = new Date(state.view.getFullYear(), state.view.getMonth() - 1, 1); renderCalendar(); });
    $('[data-cal-next]').addEventListener('click', () => { state.view = new Date(state.view.getFullYear(), state.view.getMonth() + 1, 1); renderCalendar(); });

    grid.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-date]');
      if (!btn || btn.disabled) return;
      const [y, m, d] = btn.dataset.date.split('-').map(Number);
      state.date = new Date(y, m - 1, d);
      state.time = null;
      renderCalendar();
      $(`[data-date="${btn.dataset.date}"]`, grid)?.focus();
      updateAll();
    });

    // Arrow-key navigation between days.
    grid.addEventListener('keydown', (e) => {
      const deltas = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
      const btn = e.target.closest('[data-date]');
      if (!btn || !(e.key in deltas)) return;
      e.preventDefault();
      const [y, m, d] = btn.dataset.date.split('-').map(Number);
      let target = addDays(new Date(y, m - 1, d), deltas[e.key]);
      for (let i = 0; i < 14 && !isOpen(target) && target >= today && target <= maxDate; i++) target = addDays(target, Math.sign(deltas[e.key]));
      if (!isOpen(target)) return;
      if (target.getMonth() !== state.view.getMonth()) { state.view = new Date(target.getFullYear(), target.getMonth(), 1); renderCalendar(); }
      $(`[data-date="${iso(target)}"]`, grid)?.focus();
    });
  }

  /* ---------- Step 4: time slots ---------- */
  function slotsFor(date) {
    const hours = HOURS[date.getDay()];
    const svc = service();
    if (!hours || !svc) return [];
    const [open, close] = hours;
    const now = new Date();
    const earliest = sameDay(date, now) ? now.getHours() * 60 + now.getMinutes() + 60 : 0;
    const slots = [];
    for (let t = open * 60; t + svc.duration <= close * 60; t += 30) {
      const booked = hash(`${iso(date)}|${state.artist}|${t}`) % 100 < (state.artist === 'any' ? 18 : 32);
      slots.push({ t, available: t >= earliest && !booked });
    }
    return slots;
  }

  function renderSlots() {
    const wrap = $('[data-slots]');
    const caption = $('[data-time-caption]');
    if (!state.date || !service()) { wrap.innerHTML = ''; return; }
    caption.textContent = `${longDate.format(state.date)} · ${service().name} (${fmtDuration(service().duration)}) with ${artist()?.name || 'any artist'}`;

    const slots = slotsFor(state.date);
    const groups = [
      ['Morning', slots.filter((s) => s.t < 12 * 60)],
      ['Afternoon', slots.filter((s) => s.t >= 12 * 60 && s.t < 17 * 60)],
      ['Evening', slots.filter((s) => s.t >= 17 * 60)],
    ].filter(([, list]) => list.length);

    if (!slots.some((s) => s.available)) {
      wrap.innerHTML = `<div class="alert-success"><svg class="icon h-5 w-5 text-gold" aria-hidden="true"><use href="#i-calendar"/></svg><p>No times left on this day. Please go back and choose another date, or try “First available” artist.</p></div>`;
      return;
    }

    wrap.innerHTML = groups.map(([label, list]) => `
      <div role="group" aria-label="${label}">
        <p class="mb-3 text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-ink-mute">${label}</p>
        <div class="grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3">
          ${list.map((s) => `<button type="button" class="slot" data-time="${s.t}" aria-pressed="${state.time === s.t}" ${s.available ? '' : 'disabled aria-label="' + fmtTime(s.t) + ', booked"'}>${fmtTime(s.t)}</button>`).join('')}
        </div>
      </div>`).join('');
  }

  function initSlots() {
    $('[data-slots]').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-time]');
      if (!btn || btn.disabled) return;
      state.time = Number(btn.dataset.time);
      $$('[data-time]', form).forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
      updateSummary();
      updateNav();
    });
  }

  /* ---------- Summary ---------- */
  function updateSummary() {
    const svc = service();
    const set = (key, val) => { $(`[data-sum="${key}"]`).textContent = val; };
    set('service', svc?.name || '—');
    set('artist', artist()?.name || '—');
    set('date', state.date ? longDate.format(state.date) : '—');
    set('time', state.time != null ? fmtTime(state.time) : '—');
    set('duration', svc ? fmtDuration(svc.duration) : '—');
    set('price', inr.format(svc?.price || 0));
    if (svc) $('[data-summary-img]').src = `assets/images/${svc.img}`;
  }

  /* ---------- Wizard navigation ---------- */
  const detailFields = () => $$('[data-step="5"] input, [data-step="5"] textarea', form).filter((f) => f.willValidate);

  function stepComplete(step) {
    switch (step) {
      case 1: return !!state.service;
      case 2: return !!state.artist;
      case 3: return !!state.date;
      case 4: return state.time != null;
      case 5: return true; // validated on submit with messages
      default: return true;
    }
  }

  const HINTS = { 1: 'Select a service to continue', 2: 'Choose an artist to continue', 3: 'Pick a date to continue', 4: 'Select a time to continue', 5: 'We’ll never share your details' };

  function updateNav() {
    const { step } = state;
    $('[data-wizard-nav]').hidden = step === 6;
    $('[data-back]').classList.toggle('invisible', step === 1);
    $('[data-next]').classList.toggle('opacity-60', !stepComplete(step));
    $('[data-next-label]').textContent = step === 5 ? 'Confirm booking' : 'Continue';
    $('[data-step-hint]').textContent = stepComplete(step) && step < 5 ? '' : HINTS[step] || '';
  }

  function updateStepper() {
    $$('[data-step-indicator]').forEach((el) => {
      const n = Number(el.dataset.stepIndicator);
      el.classList.toggle('is-active', n === state.step);
      el.classList.toggle('is-done', n < state.step);
      el.querySelector('.step-dot').innerHTML = n < state.step ? '<svg class="icon" aria-hidden="true"><use href="#i-check"/></svg>' : n;
      if (n === state.step) el.setAttribute('aria-current', 'step'); else el.removeAttribute('aria-current');
    });
    $('[data-step-caption]').textContent = `Step ${state.step} of 6 · ${STEP_NAMES[state.step - 1]}`;
  }

  function goTo(step, { focus = true } = {}) {
    state.step = step;
    $$('[data-step]', form).forEach((el) => { el.hidden = Number(el.dataset.step) !== step; });
    if (step === 3) renderCalendar();
    if (step === 4) renderSlots();
    updateStepper();
    updateNav();
    if (focus) {
      const top = form.getBoundingClientRect().top + window.scrollY - 110;
      if (window.scrollY > top) window.scrollTo({ top, behavior: 'smooth' });
      $(`[data-step="${step}"] [data-step-heading]`)?.focus({ preventScroll: true });
    }
  }

  function updateAll() {
    updateSummary();
    updateNav();
  }

  async function submitBooking() {
    const data = Object.fromEntries(new FormData(form));
    const payload = {
      ...data,
      service: service().name,
      artist: artist().name,
      date: iso(state.date),
      time: fmtTime(state.time),
      price: service().price,
    };
    if (form.dataset.endpoint) {
      const res = await fetch(form.dataset.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`Booking failed (${res.status})`);
    } else {
      await new Promise((r) => setTimeout(r, 800));
    }
    return payload;
  }

  async function next() {
    const { step } = state;
    if (step < 5) {
      if (!stepComplete(step)) {
        const hint = $('[data-step-hint]');
        hint.textContent = HINTS[step];
        hint.classList.remove('hidden');
        $(`[data-step="${step}"] [data-step-heading]`)?.focus();
        return;
      }
      goTo(step + 1);
      return;
    }

    // Step 5 → confirm
    const invalid = detailFields().filter((f) => !validateField(f));
    if (invalid.length) { invalid[0].focus(); return; }

    const btn = $('[data-next]');
    btn.disabled = true;
    $('[data-next-label]').textContent = 'Confirming…';
    try {
      const payload = await submitBooking();
      $('[data-confirm-name]').textContent = payload.name.split(' ')[0];
      $('[data-confirm-email]').textContent = payload.email;
      $('[data-confirm-ref]').textContent = `NBA-${Date.now().toString(36).slice(-6).toUpperCase()}`;
      goTo(6);
    } catch (err) {
      $('[data-step-hint]').textContent = 'Something went wrong — please try again or call us.';
      console.error(err);
    } finally {
      btn.disabled = false;
      if (state.step === 5) $('[data-next-label]').textContent = 'Confirm booking';
    }
  }

  /* ---------- Add to calendar (.ics) ---------- */
  function downloadIcs() {
    const svc = service();
    const start = new Date(state.date);
    start.setMinutes(state.time);
    const end = new Date(start.getTime() + svc.duration * 60000);
    const stamp = (d) => `${iso(d).replace(/-/g, '')}T${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}00`;
    const ics = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Nails by Anter//Booking//EN', 'BEGIN:VEVENT',
      `UID:${Date.now()}@nailsbya.com`,
      `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
      `DTSTART:${stamp(start)}`, `DTEND:${stamp(end)}`,
      `SUMMARY:${svc.name} at Nails by Anter`,
      `DESCRIPTION:Artist: ${artist().name}. Ref ${$('[data-confirm-ref]').textContent}`,
      'LOCATION:Nails by Anter\\, Model Town Extension\\, Ludhiana\\, Punjab',
      'END:VEVENT', 'END:VCALENDAR',
    ].join('\r\n');
    const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: 'nails-by-a-appointment.ics' });
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  /* ---------- init ---------- */
  renderOptions();
  initCalendar();
  initSlots();

  $('[data-next]').addEventListener('click', next);
  $('[data-back]').addEventListener('click', () => goTo(Math.max(1, state.step - 1)));
  $('[data-ics]').addEventListener('click', downloadIcs);
  form.addEventListener('submit', (e) => { e.preventDefault(); next(); });
  detailFields().forEach((f) => {
    f.addEventListener('blur', () => { if (f.value) validateField(f); });
    f.addEventListener('input', () => { if (f.getAttribute('aria-invalid') === 'true') validateField(f); });
  });

  // Deep link: booking.html?service=gel-polish preselects and skips to step 2.
  const pre = new URLSearchParams(location.search).get('service');
  const preInput = pre && $(`input[name="service"][value="${CSS.escape(pre)}"]`, form);
  if (preInput) {
    preInput.checked = true;
    state.service = pre;
    updateAll();
    goTo(2, { focus: false });
  } else {
    updateAll();
    goTo(1, { focus: false });
  }
})();
