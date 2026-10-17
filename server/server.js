// Nails by A — web server: static site + gallery API + admin panel
const path = require('node:path');
const crypto = require('node:crypto');
const express = require('express');
const session = require('express-session');
const db = require('./db');
const { requireLogin } = require('./auth');
const { toPublic } = require('./gallery');
const adminRoutes = require('./routes/admin');

const ROOT = path.join(__dirname, '..');
const PORT = Number(process.env.PORT) || 3000;
const isProd = process.env.NODE_ENV === 'production';

const app = express();
app.disable('x-powered-by');
if (isProd) app.set('trust proxy', 1);

app.use(session({
  name: 'nba.sid',
  secret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex'),
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'strict', secure: isProd, maxAge: 8 * 60 * 60 * 1000 },
}));

/* ---------- Public API ---------- */
app.get('/api/gallery', async (req, res, next) => {
  try {
    const home = req.query.home === '1';
    const { rows } = await db.query(
      `SELECT * FROM gallery_images WHERE is_active ${home ? 'AND show_on_home' : ''}
       ORDER BY sort_order, id ${home ? 'LIMIT 8' : ''}`
    );
    res.set('Cache-Control', 'no-cache');
    res.json(rows.map(toPublic));
  } catch (err) {
    next(err);
  }
});

// Clean URLs: /gallery.html → /gallery, /index.html → / (301, query string kept).
app.use((req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') return next();
  const m = req.path.match(/^(.*\/)(?:index|([\w-]+))\.html$/);
  if (!m) return next();
  const qs = req.originalUrl.slice(req.path.length);
  res.redirect(301, (m[2] ? m[1] + m[2] : m[1]) + qs);
});

/* ---------- Admin ---------- */
app.use('/admin', adminRoutes);
// Login page + its stylesheet are public; everything else in /admin needs a session.
app.use('/admin', (req, res, next) =>
  /^\/(login|admin\.css)$/.test(req.path) ? next() : requireLogin(req, res, next));
app.use('/admin', express.static(path.join(ROOT, 'admin'), { extensions: ['html'], redirect: false }));

/* ---------- Static site ---------- */
// Only the built site is public — never server/, src/, node_modules/ or .env.
app.use('/assets', express.static(path.join(ROOT, 'assets'), { maxAge: isProd ? '7d' : 0 }));
app.get(/^\/(?:([\w-]+\.(?:txt|xml))|([\w-]+))?$/, (req, res, next) => {
  const file = req.params[0] || `${req.params[1] || 'index'}.html`;
  res.sendFile(path.join(ROOT, file), (err) => err && next());
});

app.use((_req, res) => res.status(404).send('Not found'));

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error(err);
  const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 500;
  res.status(status).json({ error: status === 413 ? 'File too large (max 8 MB).' : 'Server error' });
});

app.listen(PORT, () => console.log(`Nails by A running at http://localhost:${PORT}  (admin: /admin/)`));
