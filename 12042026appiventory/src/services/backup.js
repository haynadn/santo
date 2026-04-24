const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const cron = require('node-cron');

const BACKUP_DIR = path.join(__dirname, '../../backups');

// Pastikan direktori backup ada
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

/**
 * Melakukan backup database PostgreSQL menggunakan pg_dump
 */
async function runBackup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `backup-${timestamp}.sql`;
  const filePath = path.join(BACKUP_DIR, filename);
  
  const dbUrl = process.env.DATABASE_URL;
  
  if (!dbUrl) {
    console.error('❌ Gagal backup: DATABASE_URL tidak ditemukan di .env');
    return;
  }

  console.log(`\n🕒 [${new Date().toLocaleString()}] Memulai backup database...`);

  // Perintah pg_dump
  // -d atau --dbname bisa menerima connection string langsung
  const command = `pg_dump -d "${dbUrl}" -f "${filePath}"`;

  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`❌ Gagal melakukan backup: ${error.message}`);
      // Jika error, hapus file kosong yang mungkin terbuat
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      return;
    }
    
    if (stderr && !stderr.includes('done')) {
      // pg_dump kadang mengeluarkan warning di stderr tapi tetap berhasil
      console.warn(`⚠️ Warning saat backup: ${stderr}`);
    }

    console.log(`✅ Backup berhasil disimpan ke: ${filePath}`);
    
    // Opsional: Hapus backup lama (misalnya simpan 7 hari terakhir saja)
    cleanupOldBackups();
  });
}

/**
 * Menghapus file backup yang lebih tua dari 7 hari
 */
function cleanupOldBackups() {
  const maxAgeDays = 7;
  const now = Date.now();
  
  fs.readdir(BACKUP_DIR, (err, files) => {
    if (err) return;
    
    files.forEach(file => {
      const filePath = path.join(BACKUP_DIR, file);
      const stats = fs.statSync(filePath);
      const ageInDays = (now - stats.mtimeMs) / (1000 * 60 * 60 * 24);
      
      if (ageInDays > maxAgeDays && file.endsWith('.sql')) {
        fs.unlinkSync(filePath);
        console.log(`🗑️ Backup lama dihapus: ${file}`);
      }
    });
  });
}

/**
 * Inisialisasi jadwal backup
 */
function initBackupScheduler() {
  // Jadwal: Setiap jam 12 malam (00:00)
  cron.schedule('0 0 * * *', () => {
    runBackup();
  }, {
    timezone: "Asia/Jakarta" // Menyesuaikan dengan waktu lokal user
  });

  console.log('📅 Penjadwal backup otomatis diaktifkan (Setiap jam 12 malam)');
  
  // Jika ingin tes langsung saat start (opsional, hapus di production jika tidak butuh)
  // runBackup(); 
}

module.exports = { initBackupScheduler, runBackup };
