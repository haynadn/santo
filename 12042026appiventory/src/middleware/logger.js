const { pool } = require('../../config/db');

async function loggerMiddleware(req, res, next) {
  // Jangan log request untuk file statis atau kesehatan sistem
  if (req.path.includes('.') || req.path === '/health') {
    return next();
  }

  const username = req.session && req.session.user ? req.session.user.username : 'anonymous';
  const method = req.method;
  const path = req.originalUrl;
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const userAgent = req.headers['user-agent'];

  try {
    // Jalankan insert tanpa menunggu (async background) agar tidak memperlambat request
    pool.query(
      'INSERT INTO activity_logs (username, method, path, ip_address, user_agent) VALUES ($1, $2, $3, $4, $5)',
      [username, method, path, ip, userAgent]
    ).catch(err => console.error('❌ Logger Error:', err.message));
  } catch (err) {
    console.error('❌ Logger Exception:', err.message);
  }

  next();
}

module.exports = { loggerMiddleware };
