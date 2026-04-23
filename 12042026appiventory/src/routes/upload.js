const express = require('express');
const router = express.Router();
const multer = require('multer');
const XLSX = require('xlsx');
const { pool } = require('../../config/db');
const { requireLogin } = require('../middleware/auth');

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.originalname.match(/\.(xlsx|xls)$/i)) cb(null, true);
    else cb(new Error('Hanya file Excel (.xlsx/.xls)!'));
  }
});

const KATEGORI_LIST = ['ALKES','ATK','ART','ALSINTOR','ALSATRI','ALKOMLEK','BANGFAS'];
const MAX_ROWS = 1000;
const VALID_KONDISI = ['Baik','Rusak Ringan','Rusak Berat','Tidak Beroperasi',''];
const VALID_SUMBER = ['KEMHAN','KESDAM','SWAKELOLA','Kemhan','Kesdam','Swakelola',''];

// Map kolom Excel → kolom DB
function mapRow(raw, sheetName) {
  const r = {};
  Object.keys(raw).forEach(k => { r[k.toLowerCase().trim()] = raw[k]; });

  const jumlah = parseInt(r['jumlah']) || 0;
  const harga  = parseFloat(r['harga'])  || 0;

  return {
    tanggal:          r['tahun'] ? `${r['tahun']}-01-01` : null,
    kode_barang:      String(r['kode barang'] || r['kode_barang'] || '').trim(),
    nama_barang:      String(r['nama barang'] || r['nama_barang'] || '').trim(),
    kategori:         sheetName.toUpperCase(),
    merk_type:        String(r['merk/type'] || r['merk_type'] || r['merk'] || '').trim(),
    satuan:           String(r['satuan'] || '').trim(),
    stok_awal:        jumlah,
    masuk:            0,
    keluar:           0,
    stok_akhir:       jumlah,
    harga:            harga,
    total_nilai:      parseFloat(r['total nilai'] || r['total_nilai'] || harga * jumlah) || 0,
    supplier:         String(r['supplier'] || '').trim(),
    sumber_pendanaan: String(r['sumber dana'] || r['sumber_dana'] || r['sumber_pendanaan'] || '').trim(),
    kondisi:          String(r['kondisi'] || '').trim(),
    posisi_ruangan:   String(r['lokasi'] || r['posisi_ruangan'] || '').trim(),
    nama_penerima:    String(r['nama penerima'] || r['nama_penerima'] || '').trim(),
    ket:              String(r['keterangan'] || r['ket'] || '').trim(),
  };
}

function validateRow(row, rowNum) {
  const errors = [];
  if (!row.nama_barang) errors.push('Nama Barang wajib diisi');
  if (!row.kategori || !KATEGORI_LIST.includes(row.kategori))
    errors.push(`Kategori "${row.kategori}" tidak valid`);
  if (row.kondisi && !VALID_KONDISI.includes(row.kondisi))
    errors.push(`Kondisi "${row.kondisi}" tidak valid (Baik/Rusak Ringan/Rusak Berat/Tidak Beroperasi)`);
  if (isNaN(row.stok_awal)) errors.push('Jumlah harus angka');
  if (isNaN(row.harga))     errors.push('Harga harus angka');
  return errors;
}

// GET - Halaman utama
router.get('/', requireLogin, async (req, res) => {
  const history = await pool.query(
    'SELECT * FROM upload_history ORDER BY created_at DESC LIMIT 30'
  ).catch(() => ({ rows: [] }));
  res.render('pages/upload', { title: 'Upload Excel', history: history.rows });
});

// GET - Download template
router.get('/template', requireLogin, (req, res) => {
  const wb = XLSX.utils.book_new();
  const headers = ['Tahun','Kode Barang','Nama Barang','Merk/Type','Satuan','Jumlah','Harga','Total Nilai','Supplier','Sumber Dana','Kondisi','Lokasi','Keterangan'];
  const contoh  = [2024,'ALK-001','Stetoskop Littmann','3M Littmann','Unit',1,850000,850000,'PT Medika','KEMHAN','Baik','Gudang A','Kondisi baik'];
  const contoh2 = [2024,'ALK-002','Tensimeter Digital','Omron HEM','Unit',2,450000,900000,'PT Anugrah','KESDAM','Baik','Klinik','Stok normal'];

  KATEGORI_LIST.forEach(kat => {
    const ws = XLSX.utils.aoa_to_sheet([headers, contoh, contoh2]);
    ws['!cols'] = headers.map(() => ({ wch: 20 }));
    XLSX.utils.book_append_sheet(wb, ws, kat);
  });

  // Sheet referensi
  const ref = [
    ['=== REFERENSI ==='],
    [''],
    ['KATEGORI VALID'], ...KATEGORI_LIST.map(k => [k]),
    [''],
    ['KONDISI VALID'], ['Baik'], ['Rusak Ringan'], ['Rusak Berat'], ['Tidak Beroperasi'],
    [''],
    ['SUMBER DANA VALID'], ['KEMHAN'], ['KESDAM'], ['SWAKELOLA'],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(ref), 'Referensi');

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Disposition', 'attachment; filename=Template_Import_Inventaris.xlsx');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buf);
});

// POST - Parse & Preview
router.post('/preview', requireLogin, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) throw new Error('File tidak ditemukan!');

    const wb = XLSX.read(req.file.buffer, { type: 'buffer', cellDates: false });
    const allSheets = wb.SheetNames;

    // Filter hanya sheet yang namanya kategori valid, atau proses semua
    const sheetsToProcess = allSheets.filter(s =>
      KATEGORI_LIST.includes(s.toUpperCase())
    );
    if (sheetsToProcess.length === 0) throw new Error(`Tidak ada sheet yang cocok dengan kategori. Sheet ditemukan: ${allSheets.join(', ')}`);

    const allRows = [];
    const sheetSummary = [];

    for (const sheetName of sheetsToProcess) {
      const ws = wb.Sheets[sheetName];
      const rawData = XLSX.utils.sheet_to_json(ws, { defval: '' });
      // Skip header info rows (no 'Nama Barang' or empty)
      const dataRows = rawData.filter(r => {
        const keys = Object.keys(r).map(k => k.toLowerCase());
        const hasNama = keys.some(k => k.includes('nama'));
        return hasNama;
      });

      sheetSummary.push({ sheet: sheetName, total: dataRows.length });

      dataRows.forEach((raw, i) => {
        if (allRows.length >= MAX_ROWS) return;
        const row = mapRow(raw, sheetName);
        const errors = validateRow(row, i + 2);
        allRows.push({ ...row, row_num: i + 2, sheet: sheetName, errors, valid: errors.length === 0 });
      });
    }

    const validCount   = allRows.filter(r => r.valid).length;
    const invalidCount = allRows.filter(r => !r.valid).length;
    const skipped      = Math.max(0, allRows.length - MAX_ROWS);

    res.json({
      success: true,
      sheets: sheetSummary,
      total: allRows.length,
      valid: validCount,
      invalid: invalidCount,
      skipped,
      preview: allRows,
      errors: allRows.filter(r => !r.valid).map(r => ({ row: r.row_num, sheet: r.sheet, errors: r.errors })),
    });

  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

// POST - Confirm Import
router.post('/import', requireLogin, async (req, res) => {
  try {
    const { rows } = req.body;
    if (!rows || !Array.isArray(rows)) throw new Error('Data tidak valid!');

    const validRows = rows.filter(r => r.valid);
    if (validRows.length === 0) throw new Error('Tidak ada data valid untuk diimport!');

    let inserted = 0, failed = 0;
    const failedRows = [];

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const row of validRows) {
        try {
          await client.query(`
            INSERT INTO barang (
              tanggal, kode_barang, nama_barang, kategori, merk_type, satuan,
              stok_awal, masuk, keluar, stok_akhir, harga, total_nilai,
              supplier, sumber_pendanaan, kondisi, posisi_ruangan, nama_penerima, ket
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
          `, [
            row.tanggal||null, row.kode_barang||null, row.nama_barang, row.kategori,
            row.merk_type||null, row.satuan||null,
            row.stok_awal||0, row.masuk||0, row.keluar||0, row.stok_akhir||0,
            row.harga||0, row.total_nilai||0,
            row.supplier||null, row.sumber_pendanaan||null, row.kondisi||null,
            row.posisi_ruangan||null, row.nama_penerima||null, row.ket||null,
          ]);
          inserted++;
        } catch (e) {
          failed++;
          failedRows.push({ row: row.row_num, sheet: row.sheet, error: e.message });
        }
      }
      await client.query('COMMIT');

      // Simpan history
      const filename = `upload_${new Date().toISOString().split('T')[0]}_${inserted}rows`;
      await pool.query(
        'INSERT INTO upload_history (filename, total_rows, inserted, failed, uploaded_by) VALUES ($1,$2,$3,$4,$5)',
        [filename, rows.length, inserted, failed, req.session.user?.username || 'system']
      ).catch(() => {});

    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }

    res.json({
      success: true,
      inserted, failed, failedRows,
      message: `${inserted} data berhasil diimport, ${failed} gagal.`
    });

  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

module.exports = router;
