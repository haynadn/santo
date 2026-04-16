const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL tidak ditemukan!');
  process.exit(1);
}

let connectionString = process.env.DATABASE_URL;
if (connectionString.startsWith('postgres://')) {
  connectionString = connectionString.replace('postgres://', 'postgresql://');
}

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  max: 10,
});

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
          merk_type VARCHAR(200),
          expired DATE,
          satuan VARCHAR(50),
          stok_awal INTEGER DEFAULT 0,
          masuk INTEGER DEFAULT 0,
          keluar INTEGER DEFAULT 0,
          stok_akhir INTEGER DEFAULT 0,
          harga NUMERIC DEFAULT 0,
          total_nilai NUMERIC DEFAULT 0,
          supplier VARCHAR(200),
          sumber_pendanaan VARCHAR(100),
          kondisi VARCHAR(100),
          posisi_ruangan VARCHAR(200),
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

        CREATE TABLE IF NOT EXISTS "session" (
          "sid" VARCHAR NOT NULL COLLATE "default",
          "sess" JSON NOT NULL,
          "expire" TIMESTAMP(6) NOT NULL,
          CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
        );

        CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");
      `);

      // Tambah kolom baru jika belum ada (untuk database yang sudah existing)
      const newColumns = [
        `ALTER TABLE barang ADD COLUMN IF NOT EXISTS merk_type VARCHAR(200)`,
        `ALTER TABLE barang ADD COLUMN IF NOT EXISTS sumber_pendanaan VARCHAR(100)`,
        `ALTER TABLE barang ADD COLUMN IF NOT EXISTS posisi_ruangan VARCHAR(200)`,
        `ALTER TABLE barang ADD COLUMN IF NOT EXISTS nama_penerima VARCHAR(200)`,
        `ALTER TABLE barang ADD COLUMN IF NOT EXISTS kondisi VARCHAR(100)`,
      ];
      for (const sql of newColumns) {
        await client.query(sql);
      }
      console.log('✅ Kolom baru berhasil ditambahkan');

      // Auto create/update user
      const USERNAME = process.env.ADMIN_USERNAME || 'Departemen';
      const PASSWORD = process.env.ADMIN_PASSWORD || 'Departemen44!@#';

      const existing = await client.query('SELECT id FROM users WHERE username=$1', [USERNAME]);
      if (existing.rows.length === 0) {
        const hash = bcrypt.hashSync(PASSWORD, 10);
        await client.query(
          'INSERT INTO users (username, password, role) VALUES ($1, $2, $3)',
          [USERNAME, hash, 'admin']
        );
        console.log(`✅ User dibuat: ${USERNAME}`);
      } else {
        const hash = bcrypt.hashSync(PASSWORD, 10);
        await client.query('UPDATE users SET password=$1 WHERE username=$2', [hash, USERNAME]);
        console.log(`✅ Password user ${USERNAME} diperbarui`);
      }

      client.release();
      console.log('✅ Database siap!');
      return;
    } catch (err) {
      retries--;
      console.error(`❌ Gagal konek DB, sisa percobaan: ${retries}. Error: ${err.message}`);
      if (retries === 0) {
        console.error('❌ Tidak bisa konek ke database.');
        process.exit(1);
      }
      await new Promise(r => setTimeout(r, 3000));
    }
  }
}

module.exports = { pool, initDB };
