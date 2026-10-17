// Admin routes: login/logout + gallery management API
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { requireLogin, issueCsrf, checkCsrf } = require('../auth');
const { cleanTags, toAdmin } = require('../gallery');

const ROOT = path.join(__dirname, '..', '..');
const UPLOAD_DIR = 'assets/images/gallery';
const MAX_EDGE = 1600;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 20 },
  fileFilter: (_req, file, cb) => cb(null, /^image\/(jpeg|png|webp)$/.test(file.mimetype)),
});

const router = express.Router();
router.use(express.json());
router.use(express.urlencoded({ extended: false }));

/* ---------- Auth ---------- */
router.post('/login', async (req, res) => {
  const { username = '', password = '' } = req.body;
  const { rows } = await db.query('SELECT id, password_hash FROM admins WHERE username = $1', [username]);
  const ok = rows[0] && (await bcrypt.compare(password, rows[0].password_hash));
  if (!ok) return res.redirect('/admin/login?error=1');
  req.session.regenerate((err) => {
    if (err) return res.status(500).send('Session error');
    req.session.adminId = rows[0].id;
    req.session.username = username;
    res.redirect('/admin/');
  });
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/admin/login'));
});

/* ---------- API (login + CSRF required) ---------- */
const api = express.Router();
api.use(requireLogin, checkCsrf);

api.get('/me', (req, res) => res.json({ username: req.session.username, csrf: issueCsrf(req) }));

api.get('/images', async (_req, res) => {
  const { rows } = await db.query('SELECT * FROM gallery_images ORDER BY sort_order, id');
  res.json(rows.map(toAdmin));
});

// Upload one or more images. Per-file title/alt come as arrays in the same order as files.
api.post('/images', upload.array('images', 20), async (req, res) => {
  const files = req.files || [];
  if (!files.length) return res.status(400).json({ error: 'No valid images (JPG, PNG or WebP only).' });

  const asList = (v) => (Array.isArray(v) ? v : v == null ? [] : [v]);
  const titles = asList(req.body.titles);
  const alts = asList(req.body.alts);
  const tags = cleanTags(req.body.tags).join(',');
  const home = req.body.home === '1';

  // New uploads go to the top of the gallery.
  const { rows: [{ min_order: minOrder }] } = await db.query('SELECT COALESCE(MIN(sort_order), 0) AS min_order FROM gallery_images');
  let order = minOrder - files.length;

  const created = [];
  for (const [i, file] of files.entries()) {
    let meta;
    try {
      meta = await sharp(file.buffer).metadata();
    } catch {
      continue; // not a real image
    }
    if (!['jpeg', 'png', 'webp'].includes(meta.format)) continue;

    const name = `${Date.now().toString(36)}-${crypto.randomBytes(6).toString('hex')}.webp`;
    const rel = `${UPLOAD_DIR}/${name}`;
    const info = await sharp(file.buffer)
      .rotate() // respect EXIF orientation from phone photos
      .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82 })
      .toFile(path.join(ROOT, rel));

    const title = String(titles[i] || '').trim().slice(0, 120) ||
      path.parse(file.originalname).name.replace(/[-_]+/g, ' ').slice(0, 120);
    const alt = String(alts[i] || '').trim().slice(0, 255) || title;

    const { rows } = await db.query(
      'INSERT INTO gallery_images (src, title, alt_text, tags, width, height, sort_order, show_on_home) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id',
      [rel, title, alt, tags, info.width, info.height, order++, home]
    );
    created.push(rows[0].id);
  }

  if (!created.length) return res.status(400).json({ error: 'No valid images (JPG, PNG or WebP only).' });
  res.status(201).json({ created: created.length });
});

api.patch('/images/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(404).json({ error: 'Image not found' });
  const b = req.body;
  const values = [];
  const fields = [];
  const set = (col, val) => { values.push(val); fields.push(`${col} = $${values.length}`); };
  if (b.title !== undefined) set('title', String(b.title).trim().slice(0, 120));
  if (b.alt !== undefined) set('alt_text', String(b.alt).trim().slice(0, 255));
  if (b.tags !== undefined) set('tags', cleanTags(b.tags).join(','));
  if (b.active !== undefined) set('is_active', !!b.active);
  if (b.home !== undefined) set('show_on_home', !!b.home);
  if (!fields.length) return res.status(400).json({ error: 'Nothing to update' });

  values.push(id);
  const { rows } = await db.query(
    `UPDATE gallery_images SET ${fields.join(', ')} WHERE id = $${values.length} RETURNING *`, values);
  if (!rows[0]) return res.status(404).json({ error: 'Image not found' });
  res.json(toAdmin(rows[0]));
});

api.delete('/images/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(404).json({ error: 'Image not found' });
  const { rows } = await db.query('DELETE FROM gallery_images WHERE id = $1 RETURNING src', [id]);
  if (!rows[0]) return res.status(404).json({ error: 'Image not found' });
  // Only delete files we uploaded; the original site images stay on disk.
  if (rows[0].src.startsWith(`${UPLOAD_DIR}/`)) {
    await fs.unlink(path.join(ROOT, rows[0].src)).catch(() => {});
  }
  res.json({ ok: true });
});

// Body: { ids: [3, 1, 2, ...] } — the full list in the new display order.
api.put('/order', async (req, res) => {
  const ids = Array.isArray(req.body.ids) ? req.body.ids.map(Number).filter(Number.isInteger) : [];
  if (!ids.length) return res.status(400).json({ error: 'ids required' });
  const conn = await db.connect();
  try {
    await conn.query('BEGIN');
    for (const [i, id] of ids.entries()) {
      await conn.query('UPDATE gallery_images SET sort_order = $1 WHERE id = $2', [i + 1, id]);
    }
    await conn.query('COMMIT');
    res.json({ ok: true });
  } catch (err) {
    await conn.query('ROLLBACK');
    throw err;
  } finally {
    conn.release();
  }
});

router.use('/api', api);

module.exports = router;
