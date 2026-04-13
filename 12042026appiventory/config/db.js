const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL tidak ditemukan! Pastikan PostgreSQL sudah ditambahkan di Railway.');
  process.exit(1);
}

// Fix Railway postgres:// → postgresql://
let connectionString = process.env.DATABASE_URL;
if (connectionString.startsWith('postgres://')) {
  connectionString = connectionString.replace('postgres://', 'postgresql://');
}

const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  max: 10,
});

// Test koneksi
pool.on('error', (err) => {
  console.error('❌ PostgreSQL pool error:', err.message);
});

async function initDB() {
  let retries = 5;
  while (retries > 0) {
    try {
      const client = await pool.connect();
      console.log('✅ Terhubung ke PostgreSQL');
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          username VARCHAR(80) UNIQUE NOT NULL,
          password VARCHAR(200) NOT NULL,
          role VARCHAR(20) DEFAULT 'user',
          created_at TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS barang (
          id SERIAL PRIMARY KEY,
          tanggal DATE,
          kode_barang VARCHAR(50),
          nama_barang VARCHAR(200) NOT NULL,
          kategori VARCHAR(50) NOT NULL,
          jenis VARCHAR(100),
          expired DATE,
          satuan VARCHAR(50),
          stok_awal INTEGER DEFAULT 0,
          masuk INTEGER DEFAULT 0,
          keluar INTEGER DEFAULT 0,
          stok_akhir INTEGER DEFAULT 0,
          harga NUMERIC DEFAULT 0,
          total_nilai NUMERIC DEFAULT 0,
          supplier VARCHAR(200),
          kondisi VARCHAR(100),
          lokasi VARCHAR(200),
          status VARCHAR(100),
          tgl_pemeliharaan DATE,
          pj VARCHAR(200),
          nama_penerima VARCHAR(200),
          nrp_nip VARCHAR(100),
          unit VARCHAR(100),
          ket TEXT,
          created_at TIMESTAMP DEFAULT NOW()
        );
      `);

      // Buat admin default jika belum ada
      const bcrypt = require('bcryptjs');
      const existing = await client.query('SELECT id FROM users WHERE username=$1', ['admin']);
      if (existing.rows.length === 0) {
        const hash = bcrypt.hashSync('admin123', 10);
        await client.query(
          'INSERT INTO users (username, password, role) VALUES ($1, $2, $3)',
          ['admin', hash, 'admin']
        );
        console.log('✅ Admin user dibuat: admin / admin123');
      }

      client.release();
      console.log('✅ Database siap!');
      return;
    } catch (err) {
      retries--;
      console.error(`❌ Gagal konek DB, sisa percobaan: ${retries}. Error: ${err.message}`);
      if (retries === 0) {
        console.error('❌ Tidak bisa konek ke database. Pastikan DATABASE_URL benar.');
        process.exit(1);
      }
      await new Promise(r => setTimeout(r, 3000)); // tunggu 3 detik sebelum retry
    }
  }
}

module.exports = { pool, initDB };
