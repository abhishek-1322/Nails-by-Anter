// Session-based admin auth + CSRF protection for state-changing requests
const crypto = require('node:crypto');

function requireLogin(req, res, next) {
  if (req.session.adminId) return next();
  if (req.accepts(['html', 'json']) === 'html' && req.method === 'GET') {
    return res.redirect('/admin/login');
  }
  res.status(401).json({ error: 'Not logged in' });
}

function issueCsrf(req) {
  if (!req.session.csrf) req.session.csrf = crypto.randomBytes(24).toString('hex');
  return req.session.csrf;
}

// Every non-GET admin API call must send the session's token in X-CSRF-Token.
function checkCsrf(req, res, next) {
  if (req.method === 'GET') return next();
  const token = req.get('X-CSRF-Token');
  const expected = req.session.csrf;
  if (
    token && expected && token.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected))
  ) return next();
  res.status(403).json({ error: 'Invalid CSRF token' });
}

module.exports = { requireLogin, issueCsrf, checkCsrf };
