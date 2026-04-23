require('dotenv').config();
const { pool } = require('./config/db');

async function check() {
  try {
    const res = await pool.query("SELECT * FROM settings WHERE key='expiry_date'");
    console.log('SETTINGS:', res.rows);
    const expDateStr = res.rows[0]?.value;
    if (expDateStr) {
      const expiryDate = new Date(expDateStr);
      const today = new Date();
      const diffTime = expiryDate - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      console.log('CALC:', { expDateStr, today, diffDays, isNearing: diffDays <= 14 });
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}
check();
