/* ==========================================================================
   Nails by A — gallery admin: upload, reorder (drag & drop), edit, delete
   ========================================================================== */
(() => {
  'use strict';

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const TAGS = { french: 'French', chrome: 'Chrome', bridal: 'Bridal', floral: 'Floral', minimal: 'Minimal', glitter: 'Glitter' };
  const HOME_LIMIT = 8;
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

  let csrf = '';
  let images = [];
  let savedOrder = [];

  /* ---------- API helper ---------- */
  async function api(method, url, body) {
    const opts = { method, headers: { 'X-CSRF-Token': csrf, Accept: 'application/json' } };
    if (body instanceof FormData) opts.body = body;
    else if (body) { opts.body = JSON.stringify(body); opts.headers['Content-Type'] = 'application/json'; }
    const res = await fetch(`/admin/api${url}`, opts);
    if (res.status === 401) { location.href = '/admin/login'; throw new Error('Logged out'); }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
    return data;
  }

  let toastTimer;
  function toast(msg, isError = false) {
    const el = $('[data-toast]');
    el.textContent = msg;
    el.classList.toggle('is-error', isError);
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.hidden = true; }, isError ? 5000 : 2500);
  }

  const tagChecks = (name, selected = []) =>
    Object.entries(TAGS).map(([value, label]) =>
      `<label class="check"><input type="checkbox" name="${name}" value="${value}" ${selected.includes(value) ? 'checked' : ''}> ${label}</label>`
    ).join('');

  /* ---------- Image grid ---------- */
  const grid = $('[data-grid]');
  const orderBar = $('[data-order-bar]');

  function render() {
    grid.innerHTML = images.map((img, i) => `
      <article class="tile ${img.active ? '' : 'is-hidden'}" data-id="${img.id}">
        <div class="tile-img" title="Drag to reorder">
          <img src="/${esc(img.src)}" alt="${esc(img.alt)}" loading="lazy">
          <span class="tile-pos">${i + 1}</span>
          <span class="tile-badges">
            ${img.home ? '<span class="badge">Home</span>' : ''}
            ${img.active ? '' : '<span class="badge badge-off">Hidden</span>'}
          </span>
        </div>
        <div class="tile-body">
          <span class="tile-title">${esc(img.title) || '<em>Untitled</em>'}</span>
          <span class="tile-tags">${img.tags.map((t) => TAGS[t]).filter(Boolean).join(' · ') || 'No style'}</span>
          <div class="tile-actions">
            <button type="button" class="btn btn-sm" data-edit>Edit</button>
            <button type="button" class="btn btn-sm" data-toggle>${img.active ? 'Hide' : 'Show'}</button>
            <button type="button" class="btn btn-sm btn-danger" data-delete aria-label="Delete ${esc(img.title)}">✕</button>
          </div>
        </div>
      </article>`).join('');

    $('[data-empty]').hidden = images.length > 0;
    const visible = images.filter((i) => i.active).length;
    const home = images.filter((i) => i.active && i.home).length;
    $('[data-counts]').textContent =
      `${images.length} images · ${visible} visible · ${home} on home page (the first ${HOME_LIMIT} are shown).`;
    updateOrderBar();
  }

  const currentOrder = () => images.map((i) => i.id);
  function updateOrderBar() {
    orderBar.hidden = currentOrder().join() === savedOrder.join();
  }

  async function load() {
    images = await api('GET', '/images');
    savedOrder = currentOrder();
    render();
  }

  function initSortable() {
    if (!window.Sortable) return toast('Drag-and-drop library failed to load. Check your connection.', true);
    window.Sortable.create(grid, {
      animation: 180,
      handle: '.tile-img',
      ghostClass: 'sortable-ghost',
      chosenClass: 'sortable-chosen',
      onEnd() {
        const ids = [...grid.children].map((el) => Number(el.dataset.id));
        images = ids.map((id) => images.find((i) => i.id === id));
        render();
      },
    });
  }

  $('[data-order-reset]').addEventListener('click', () => {
    images = savedOrder.map((id) => images.find((i) => i.id === id));
    render();
  });

  $('[data-order-save]').addEventListener('click', async (e) => {
    e.currentTarget.disabled = true;
    try {
      await api('PUT', '/order', { ids: currentOrder() });
      savedOrder = currentOrder();
      updateOrderBar();
      toast('Order saved — the website now shows this order.');
    } catch (err) {
      toast(err.message, true);
    } finally {
      e.currentTarget.disabled = false;
    }
  });

  window.addEventListener('beforeunload', (e) => {
    if (!orderBar.hidden) e.preventDefault();
  });

  /* ---------- Tile actions ---------- */
  grid.addEventListener('click', async (e) => {
    const btn = e.target.closest('button');
    const tile = e.target.closest('.tile');
    if (!btn || !tile) return;
    const img = images.find((i) => i.id === Number(tile.dataset.id));

    if (btn.matches('[data-edit]')) return openEdit(img);

    if (btn.matches('[data-toggle]')) {
      try {
        Object.assign(img, await api('PATCH', `/images/${img.id}`, { active: !img.active }));
        render();
        toast(img.active ? 'Image is visible on the website.' : 'Image hidden from the website.');
      } catch (err) { toast(err.message, true); }
    }

    if (btn.matches('[data-delete]')) {
      if (!confirm(`Delete "${img.title}"? This cannot be undone.`)) return;
      try {
        await api('DELETE', `/images/${img.id}`);
        images = images.filter((i) => i !== img);
        savedOrder = savedOrder.filter((id) => id !== img.id);
        render();
        toast('Image deleted.');
      } catch (err) { toast(err.message, true); }
    }
  });

  /* ---------- Edit dialog ---------- */
  const dialog = $('[data-edit-dialog]');
  const editForm = $('[data-edit-form]');
  let editing = null;

  function openEdit(img) {
    editing = img;
    $('[data-edit-preview]').src = `/${img.src}`;
    editForm.elements.title.value = img.title;
    editForm.elements.alt.value = img.alt;
    editForm.elements.active.checked = img.active;
    editForm.elements.home.checked = img.home;
    $('[data-edit-tags]').innerHTML = tagChecks('tags', img.tags);
    dialog.showModal();
  }

  $('[data-edit-cancel]').addEventListener('click', () => dialog.close());

  editForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const body = {
      title: editForm.elements.title.value,
      alt: editForm.elements.alt.value,
      active: editForm.elements.active.checked,
      home: editForm.elements.home.checked,
      tags: [...editForm.querySelectorAll('input[name=tags]:checked')].map((c) => c.value),
    };
    try {
      Object.assign(editing, await api('PATCH', `/images/${editing.id}`, body));
      dialog.close();
      render();
      toast('Changes saved.');
    } catch (err) { toast(err.message, true); }
  });

  /* ---------- Upload ---------- */
  const uploadForm = $('[data-upload-form]');
  const fileInput = $('[data-file-input]');
  const dropzone = $('[data-dropzone]');
  const list = $('[data-upload-list]');
  let pending = []; // { file, url }

  $('[data-upload-tags]').innerHTML = tagChecks('tags');

  const prettyName = (name) => name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim();

  function addFiles(files) {
    for (const file of files) {
      if (!/^image\/(jpeg|png|webp)$/.test(file.type)) { toast(`${file.name}: only JPG, PNG or WebP allowed.`, true); continue; }
      if (file.size > 8 * 1024 * 1024) { toast(`${file.name} is larger than 8 MB.`, true); continue; }
      pending.push({ file, url: URL.createObjectURL(file) });
    }
    renderPending();
  }

  function renderPending() {
    // Keep any typed titles/alt text when re-rendering.
    const typed = [...list.querySelectorAll('.upload-row')].map((row) => ({
      title: row.querySelector('[name=title]').value,
      alt: row.querySelector('[name=alt]').value,
    }));
    list.innerHTML = pending.map((p, i) => `
      <div class="upload-row" data-index="${i}">
        <img src="${p.url}" alt="">
        <div class="fields">
          <label class="field">Title <input type="text" name="title" maxlength="120" value="${esc(typed[i]?.title ?? prettyName(p.file.name))}"></label>
          <label class="field">Alt text <input type="text" name="alt" maxlength="255" value="${esc(typed[i]?.alt ?? '')}" placeholder="e.g. Pink chrome almond nails"></label>
        </div>
        <button type="button" class="btn btn-sm btn-danger" data-remove>Remove</button>
      </div>`).join('');
    const has = pending.length > 0;
    $('[data-upload-options]').hidden = !has;
    $('[data-upload-actions]').hidden = !has;
    $('[data-upload-submit]').textContent = has ? `Upload ${pending.length} image${pending.length > 1 ? 's' : ''}` : 'Upload';
  }

  function clearPending() {
    pending.forEach((p) => URL.revokeObjectURL(p.url));
    pending = [];
    list.innerHTML = '';
    uploadForm.reset();
    renderPending();
  }

  list.addEventListener('click', (e) => {
    const row = e.target.closest('[data-remove]')?.closest('.upload-row');
    if (!row) return;
    const i = Number(row.dataset.index);
    row.remove(); // drop its typed values before re-render
    URL.revokeObjectURL(pending[i].url);
    pending.splice(i, 1);
    [...list.children].forEach((r, idx) => { r.dataset.index = idx; });
    renderPending();
  });

  fileInput.addEventListener('change', () => { addFiles(fileInput.files); fileInput.value = ''; });
  dropzone.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); }
  });
  ['dragenter', 'dragover'].forEach((t) => dropzone.addEventListener(t, (e) => {
    e.preventDefault();
    dropzone.classList.add('is-over');
  }));
  ['dragleave', 'drop'].forEach((t) => dropzone.addEventListener(t, () => dropzone.classList.remove('is-over')));
  dropzone.addEventListener('drop', (e) => { e.preventDefault(); addFiles(e.dataTransfer.files); });

  $('[data-upload-clear]').addEventListener('click', clearPending);

  uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!pending.length) return;
    const fd = new FormData();
    const rows = [...list.querySelectorAll('.upload-row')];
    pending.forEach((p, i) => {
      fd.append('images', p.file);
      fd.append('titles', rows[i].querySelector('[name=title]').value);
      fd.append('alts', rows[i].querySelector('[name=alt]').value);
    });
    uploadForm.querySelectorAll('[data-upload-tags] input:checked').forEach((c) => fd.append('tags', c.value));
    if (uploadForm.elements.home.checked) fd.append('home', '1');

    const btn = $('[data-upload-submit]');
    btn.disabled = true;
    btn.textContent = 'Uploading…';
    try {
      const { created } = await api('POST', '/images', fd);
      clearPending();
      await load();
      toast(`${created} image${created > 1 ? 's' : ''} uploaded.`);
    } catch (err) {
      toast(err.message, true);
      renderPending();
    } finally {
      btn.disabled = false;
    }
  });

  /* ---------- Boot ---------- */
  api('GET', '/me')
    .then((me) => {
      csrf = me.csrf;
      $('[data-user]').textContent = `Signed in as ${me.username}`;
      return load();
    })
    .then(initSortable)
    .catch((err) => toast(err.message, true));
})();
