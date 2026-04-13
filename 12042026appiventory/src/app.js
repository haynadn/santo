require('dotenv').config();
const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const methodOverride = require('method-override');
const path = require('path');
const { initDB, pool } = require('../config/db');

const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const barangRoutes = require('./routes/barang');
const exportRoutes = require('./routes/export');

const app = express();
const PORT = process.env.PORT || 3000;

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

// Middleware
app.use(express.static(path.join(__dirname, '../public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));

// Session - pakai connect-pg-simple biar aman di production
const pgSession = require('connect-pg-simple')(session);
app.use(session({
  store: new pgSession({
    pool,
    tableName: 'session',
    createTableIfMissing: true,
  }),
  secret: process.env.SECRET_KEY || 'departemen-secret-2024',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 8, // 8 jam
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
  }
}));

app.use(flash());

// Global locals
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  res.locals.kategoriList = ['BEKKES','ALKES','ATK','ART','ALSINTOR','ALSATRI','ALKOMLEK','BANGFAS'];
  next();
});

// Routes
app.use('/auth', authRoutes);
app.use('/', dashboardRoutes);
app.use('/barang', barangRoutes);
app.use('/export', exportRoutes);

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', time: new Date() }));

// 404
app.use((req, res) => {
  res.status(404).render('pages/404', { title: '404 - Halaman Tidak Ditemukan' });
});

// Start
async function start() {
  await initDB();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server berjalan di http://0.0.0.0:${PORT}`);
  });
}

start();
