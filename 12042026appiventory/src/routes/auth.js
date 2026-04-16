const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { pool } = require('../../config/db');

router.get('/login', (req, res) => {
  if (req.session.user) return res.redirect('/');
  res.render('pages/login', { title: 'Login — Departemen Inventaris' });
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    const user = result.rows[0];

    console.log('Login attempt:', username);
    console.log('User found:', user ? 'yes' : 'no');

    if (!user) {
      req.flash('error', 'Username tidak ditemukan!');
      return res.redirect('/auth/login');
    }

    const match = bcrypt.compareSync(password, user.password);
    console.log('Password match:', match);

    if (!match) {
      req.flash('error', 'Password salah!');
      return res.redirect('/auth/login');
    }

    req.session.user = { id: user.id, username: user.username, role: user.role };
    res.redirect('/');
  } catch (err) {
    console.error('Login error:', err);
    req.flash('error', 'Terjadi kesalahan server: ' + err.message);
    res.redirect('/auth/login');
  }
});

// Halaman setup user - buat user baru
router.get('/setup', async (req, res) => {
  const result = await pool.query('SELECT COUNT(*) as total FROM users');
  const total = parseInt(result.rows[0].total);
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Setup User</title>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Inter', sans-serif; background: #f0f2f5; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
        .card { background: #fff; border-radius: 16px; padding: 36px; width: 100%; max-width: 420px; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
        h2 { font-size: 20px; font-weight: 700; margin-bottom: 6px; color: #111827; }
        p { font-size: 13px; color: #6b7280; margin-bottom: 24px; }
        .info { background: #ede9fe; border-radius: 8px; padding: 12px; font-size: 13px; color: #5b21b6; margin-bottom: 20px; }
        label { display: block; font-size: 12px; font-weight: 600; color: #4b5563; margin-bottom: 5px; }
        input { width: 100%; padding: 10px 13px; border: 1.5px solid #e2e8f0; border-radius: 8px; font-size: 14px; font-family: 'Inter', sans-serif; outline: none; margin-bottom: 16px; }
        input:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,0.1); }
        button { width: 100%; padding: 12px; background: #6366f1; color: #fff; border: none; border-radius: 9px; font-size: 14px; font-weight: 700; cursor: pointer; font-family: 'Inter', sans-serif; }
        button:hover { background: #4f46e5; }
        .success { background: #d1fae5; color: #065f46; padding: 12px; border-radius: 8px; margin-bottom: 16px; font-size: 13px; font-weight: 500; }
        .error { background: #fee2e2; color: #991b1b; padding: 12px; border-radius: 8px; margin-bottom: 16px; font-size: 13px; font-weight: 500; }
        a { display: block; text-align: center; margin-top: 16px; color: #6366f1; font-size: 13px; font-weight: 600; text-decoration: none; }
      </style>
    </head>
    <body>
      <div class="card">
        <h2>🔧 Setup User</h2>
        <p>Buat user baru untuk login ke sistem</p>
        <div class="info">Total user di database: <strong>${total}</strong></div>
        <form method="POST" action="/auth/setup">
          <label>Username</label>
          <input type="text" name="username" placeholder="Masukkan username" required>
          <label>Password</label>
          <input type="password" name="password" placeholder="Masukkan password" required>
          <label>Role</label>
          <input type="text" name="role" value="admin" placeholder="admin / user">
          <button type="submit">Buat User →</button>
        </form>
        <a href="/auth/login">← Kembali ke Login</a>
      </div>
    </body>
    </html>
  `);
});

router.post('/setup', async (req, res) => {
  const { username, password, role } = req.body;
  try {
    const hash = bcrypt.hashSync(password, 10);
    await pool.query(
      'INSERT INTO users (username, password, role) VALUES ($1, $2, $3) ON CONFLICT (username) DO UPDATE SET password=$2, role=$3',
      [username, hash, role || 'admin']
    );
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Setup Berhasil</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Inter', sans-serif; background: #f0f2f5; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
          .card { background: #fff; border-radius: 16px; padding: 36px; width: 100%; max-width: 420px; box-shadow: 0 4px 24px rgba(0,0,0,0.08); text-align: center; }
          .icon { font-size: 48px; margin-bottom: 16px; }
          h2 { font-size: 20px; font-weight: 700; margin-bottom: 8px; color: #111827; }
          p { font-size: 13px; color: #6b7280; margin-bottom: 24px; }
          .info { background: #d1fae5; border-radius: 8px; padding: 14px; font-size: 13px; color: #065f46; margin-bottom: 20px; text-align: left; }
          a { display: inline-block; padding: 12px 28px; background: #6366f1; color: #fff; border-radius: 9px; font-size: 14px; font-weight: 700; text-decoration: none; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="icon">✅</div>
          <h2>User Berhasil Dibuat!</h2>
          <p>Silakan login dengan kredensial berikut</p>
          <div class="info">
            <strong>Username:</strong> ${username}<br>
            <strong>Password:</strong> ${password}<br>
            <strong>Role:</strong> ${role || 'admin'}
          </div>
          <a href="/auth/login">Login Sekarang →</a>
        </div>
      </body>
      </html>
    `);
  } catch (err) {
    res.send('❌ Error: ' + err.message);
  }
});

router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/auth/login');
});

module.exports = router;
