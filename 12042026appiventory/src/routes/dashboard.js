const express = require('express');
const router = express.Router();
const { pool } = require('../../config/db');
const { requireLogin } = require('../middleware/auth');

const KATEGORI_LIST = ['BEKKES','ALKES','ATK','ART','ALSINTOR','ALSATRI','ALKOMLEK','BANGFAS'];

router.get('/', requireLogin, async (req, res) => {
  try {
    const stats = {};
    for (const kat of KATEGORI_LIST) {
      const countRes = await pool.query('SELECT COUNT(*) as total, COALESCE(SUM(stok_akhir),0) as stok, COALESCE(SUM(masuk),0) as masuk, COALESCE(SUM(keluar),0) as keluar FROM barang WHERE kategori=$1', [kat]);
      stats[kat] = {
        total_item: parseInt(countRes.rows[0].total),
        total_stok: parseInt(countRes.rows[0].stok),
        total_masuk: parseInt(countRes.rows[0].masuk),
        total_keluar: parseInt(countRes.rows[0].keluar),
      };
    }
    const recent = await pool.query('SELECT * FROM barang ORDER BY created_at DESC LIMIT 10');
    res.render('pages/dashboard', {
      title: 'Dashboard',
      stats,
      recent: recent.rows,
      kategoriList: KATEGORI_LIST,
    });
  } catch (err) {
    console.error(err);
    res.render('pages/dashboard', { title: 'Dashboard', stats: {}, recent: [], kategoriList: KATEGORI_LIST });
  }
});

module.exports = router;
