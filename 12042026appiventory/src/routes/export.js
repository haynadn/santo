const express = require('express');
const router = express.Router();
const ExcelJS = require('exceljs');
const { pool } = require('../../config/db');
const { requireLogin } = require('../middleware/auth');

router.get('/excel', requireLogin, async (req, res) => {
  const kategori = req.query.kategori || 'BEKKES';
  try {
    const result = await pool.query('SELECT * FROM barang WHERE kategori=$1 ORDER BY created_at DESC', [kategori]);
    const rows = result.rows;

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(`Data ${kategori}`);

    sheet.columns = [
      { header: 'No', key: 'no', width: 5 },
      { header: 'Tanggal', key: 'tanggal', width: 14 },
      { header: 'Kode Barang', key: 'kode_barang', width: 14 },
      { header: 'Nama Barang', key: 'nama_barang', width: 25 },
      { header: 'Jenis', key: 'jenis', width: 15 },
      { header: 'Satuan', key: 'satuan', width: 10 },
      { header: 'Stok Awal', key: 'stok_awal', width: 12 },
      { header: 'Masuk', key: 'masuk', width: 10 },
      { header: 'Keluar', key: 'keluar', width: 10 },
      { header: 'Stok Akhir', key: 'stok_akhir', width: 12 },
      { header: 'Harga', key: 'harga', width: 15 },
      { header: 'Total Nilai', key: 'total_nilai', width: 18 },
      { header: 'Supplier', key: 'supplier', width: 20 },
      { header: 'Kondisi', key: 'kondisi', width: 15 },
      { header: 'Lokasi', key: 'lokasi', width: 18 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Expired', key: 'expired', width: 14 },
      { header: 'PJ', key: 'pj', width: 20 },
      { header: 'Nama Penerima', key: 'nama_penerima', width: 20 },
      { header: 'NRP/NIP', key: 'nrp_nip', width: 14 },
      { header: 'Unit', key: 'unit', width: 14 },
      { header: 'Keterangan', key: 'ket', width: 25 },
    ];

    // Style header
    sheet.getRow(1).eachCell(cell => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1a56db' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = { bottom: { style: 'thin', color: { argb: 'FFe5e7eb' } } };
    });

    rows.forEach((b, i) => {
      sheet.addRow({
        no: i + 1,
        tanggal: b.tanggal ? new Date(b.tanggal).toLocaleDateString('id-ID') : '-',
        kode_barang: b.kode_barang || '-',
        nama_barang: b.nama_barang,
        jenis: b.jenis || '-',
        satuan: b.satuan || '-',
        stok_awal: b.stok_awal,
        masuk: b.masuk,
        keluar: b.keluar,
        stok_akhir: b.stok_akhir,
        harga: parseFloat(b.harga) || 0,
        total_nilai: parseFloat(b.total_nilai) || 0,
        supplier: b.supplier || '-',
        kondisi: b.kondisi || '-',
        lokasi: b.lokasi || '-',
        status: b.status || '-',
        expired: b.expired ? new Date(b.expired).toLocaleDateString('id-ID') : '-',
        pj: b.pj || '-',
        nama_penerima: b.nama_penerima || '-',
        nrp_nip: b.nrp_nip || '-',
        unit: b.unit || '-',
        ket: b.ket || '-',
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=Pendataan_${kategori}.xlsx`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error(err);
    res.redirect(`/barang?kategori=${kategori}`);
  }
});

module.exports = router;
