const { Pool } = require('./config/db');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function setup() {
  try {
    await pool.query('CREATE TABLE IF NOT EXISTS settings (id SERIAL PRIMARY KEY, key VARCHAR(100) UNIQUE, value TEXT)');
    await pool.query("INSERT INTO settings (key, value) VALUES ('expiry_date', '2026-04-30') ON CONFLICT (key) DO UPDATE SET value = '2026-04-30'");
    console.log('✅ Settings table updated');
  } catch (err) {
    console.error('❌ Error updating settings:', err);
  } finally {
    await pool.end();
  }
}

setup();
