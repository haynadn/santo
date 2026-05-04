require('dotenv').config();
const { pool } = require('./config/db');

async function updateAtk() {
  try {
    console.log('Menghubungkan ke database...');
    
    // Melakukan update
    const res = await pool.query(`UPDATE barang SET sumber_pendanaan = 'DIPA PNBP RS' WHERE kategori = 'ATK'`);
    
    console.log(`✅ Berhasil memperbarui ${res.rowCount} data ATK menjadi DIPA PNBP RS.`);
  } catch (err) {
    console.error('❌ Terjadi kesalahan saat update database:', err);
  } finally {
    pool.end();
    console.log('Koneksi database ditutup.');
  }
}

updateAtk();
