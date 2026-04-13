const express = require('express');
const router = express.Router();
const { pool } = require('../../config/db');
const { requireLogin } = require('../middleware/auth');

const KATEGORI_FIELDS = {
  BEKKES:   ['expired','supplier','ket'],
  ALKES:    ['expired','supplier','kondisi','lokasi','ket'],
  ATK:      ['kondisi','supplier'],
  ART:      ['expired','supplier','nama_penerima','nrp_nip','unit'],
  ALSINTOR: ['expired','supplier','ket'],
  ALSATRI:  ['expired','supplier','ket'],
  ALKOMLEK: ['supplier','ket'],
  BANGFAS:  ['kondisi','status','tgl_pemeliharaan','pj','supplier','ket'],
};

// LIST
router.get('/', requireLogin, async (req, res) => {
  const kategori = req.query.kategori || 'BEKKES';
  const search = req.query.search || '';
  try {
    let query = 'SELECT * FROM barang WHERE kategori=$1';
    let params = [kategori];
    if (search) {
      query += ' AND LOWER(nama_barang) LIKE $2';
      params.push(`%${search.toLowerCase()}%`);
    }
    query += ' ORDER BY created_at DESC';
    const result = await pool.query(query, params);
    res.render('pages/barang_list', {
      title: `Data ${kategori}`,
      barang: result.rows,
      kategori,
      search,
      extraFields: KATEGORI_FIELDS[kategori] || [],
    });
  } catch (err) {
    console.error(err);
    res.redirect('/');
  }
});

// FORM TAMBAH
router.get('/tambah', requireLogin, (req, res) => {
  const kategori = req.query.kategori || 'BEKKES';
  res.render('pages/barang_form', {
    title: `Tambah Barang — ${kategori}`,
    barang: null,
    kategori,
    extraFields: KATEGORI_FIELDS[kategori] || [],
  });
});

// SIMPAN
router.post('/', requireLogin, async (req, res) => {
  const {
    kategori, tanggal, kode_barang, nama_barang, jenis, expired,
    satuan, stok_awal, masuk, keluar, harga, supplier,
    kondisi, lokasi, status, tgl_pemeliharaan, pj,
    nama_penerima, nrp_nip, unit, ket
  } = req.body;

  const sa = parseInt(stok_awal)||0, m = parseInt(masuk)||0, k = parseInt(keluar)||0;
  const h = parseFloat(harga)||0;
  const stok_akhir = sa + m - k;
  const total_nilai = h * stok_akhir;

  try {
    await pool.query(`
      INSERT INTO barang (tanggal,kode_barang,nama_barang,kategori,jenis,expired,satuan,
        stok_awal,masuk,keluar,stok_akhir,harga,total_nilai,supplier,kondisi,lokasi,
        status,tgl_pemeliharaan,pj,nama_penerima,nrp_nip,unit,ket)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23)
    `, [
      tanggal||null, kode_barang||null, nama_barang, kategori, jenis||null,
      expired||null, satuan||null, sa, m, k, stok_akhir, h, total_nilai,
      supplier||null, kondisi||null, lokasi||null, status||null,
      tgl_pemeliharaan||null, pj||null, nama_penerima||null, nrp_nip||null,
      unit||null, ket||null
    ]);
    req.flash('success', 'Barang berhasil ditambahkan!');
    res.redirect(`/barang?kategori=${kategori}`);
  } catch (err) {
    console.error(err);
    req.flash('error', 'Gagal menambahkan barang');
    res.redirect(`/barang/tambah?kategori=${kategori}`);
  }
});

// FORM EDIT
router.get('/edit/:id', requireLogin, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM barang WHERE id=$1', [req.params.id]);
    const barang = result.rows[0];
    if (!barang) return res.redirect('/barang');
    res.render('pages/barang_form', {
      title: `Edit Barang`,
      barang,
      kategori: barang.kategori,
      extraFields: KATEGORI_FIELDS[barang.kategori] || [],
    });
  } catch (err) {
    res.redirect('/barang');
  }
});

// UPDATE
router.put('/:id', requireLogin, async (req, res) => {
  const {
    tanggal, kode_barang, nama_barang, jenis, expired, satuan,
    stok_awal, masuk, keluar, harga, supplier, kondisi, lokasi,
    status, tgl_pemeliharaan, pj, nama_penerima, nrp_nip, unit, ket
  } = req.body;

  const sa = parseInt(stok_awal)||0, m = parseInt(masuk)||0, k = parseInt(keluar)||0;
  const h = parseFloat(harga)||0;
  const stok_akhir = sa + m - k;

  try {
    const existing = await pool.query('SELECT kategori FROM barang WHERE id=$1', [req.params.id]);
    const kategori = existing.rows[0]?.kategori || 'BEKKES';
    await pool.query(`
      UPDATE barang SET tanggal=$1,kode_barang=$2,nama_barang=$3,jenis=$4,expired=$5,satuan=$6,
        stok_awal=$7,masuk=$8,keluar=$9,stok_akhir=$10,harga=$11,total_nilai=$12,supplier=$13,
        kondisi=$14,lokasi=$15,status=$16,tgl_pemeliharaan=$17,pj=$18,
        nama_penerima=$19,nrp_nip=$20,unit=$21,ket=$22
      WHERE id=$23
    `, [
      tanggal||null, kode_barang||null, nama_barang, jenis||null,
      expired||null, satuan||null, sa, m, k, stok_akhir, h, h*stok_akhir,
      supplier||null, kondisi||null, lokasi||null, status||null,
      tgl_pemeliharaan||null, pj||null, nama_penerima||null, nrp_nip||null,
      unit||null, ket||null, req.params.id
    ]);
    req.flash('success', 'Barang berhasil diupdate!');
    res.redirect(`/barang?kategori=${kategori}`);
  } catch (err) {
    console.error(err);
    req.flash('error', 'Gagal mengupdate barang');
    res.redirect(`/barang/edit/${req.params.id}`);
  }
});

// DELETE
router.delete('/:id', requireLogin, async (req, res) => {
  try {
    const result = await pool.query('SELECT kategori FROM barang WHERE id=$1', [req.params.id]);
    const kategori = result.rows[0]?.kategori || 'BEKKES';
    await pool.query('DELETE FROM barang WHERE id=$1', [req.params.id]);
    req.flash('success', 'Barang berhasil dihapus!');
    res.redirect(`/barang?kategori=${kategori}`);
  } catch (err) {
    req.flash('error', 'Gagal menghapus barang');
    res.redirect('/barang');
  }
});

module.exports = router;
