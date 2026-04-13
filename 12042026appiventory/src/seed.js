require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/departemen_inventaris',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

function randomChoice(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function daysAgo(n) { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().split('T')[0]; }
function futureDate(months) { const d = new Date(); d.setMonth(d.getMonth() + months); return d.toISOString().split('T')[0]; }

async function seed() {
  const client = await pool.connect();
  try {
    // Tables
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, username VARCHAR(80) UNIQUE NOT NULL, password VARCHAR(200) NOT NULL, role VARCHAR(20) DEFAULT 'user', created_at TIMESTAMP DEFAULT NOW());
      CREATE TABLE IF NOT EXISTS barang (id SERIAL PRIMARY KEY, tanggal DATE, kode_barang VARCHAR(50), nama_barang VARCHAR(200), kategori VARCHAR(50), jenis VARCHAR(100), expired DATE, satuan VARCHAR(50), stok_awal INTEGER DEFAULT 0, masuk INTEGER DEFAULT 0, keluar INTEGER DEFAULT 0, stok_akhir INTEGER DEFAULT 0, harga NUMERIC DEFAULT 0, total_nilai NUMERIC DEFAULT 0, supplier VARCHAR(200), kondisi VARCHAR(100), lokasi VARCHAR(200), status VARCHAR(100), tgl_pemeliharaan DATE, pj VARCHAR(200), nama_penerima VARCHAR(200), nrp_nip VARCHAR(100), unit VARCHAR(100), ket TEXT, created_at TIMESTAMP DEFAULT NOW());
    `);

    // Users
    const users = [
      { username: 'admin', password: bcrypt.hashSync('admin123', 10), role: 'admin' },
      { username: 'operator', password: bcrypt.hashSync('operator123', 10), role: 'user' },
      { username: 'gudang', password: bcrypt.hashSync('gudang123', 10), role: 'user' },
    ];
    for (const u of users) {
      await client.query('INSERT INTO users (username,password,role) VALUES ($1,$2,$3) ON CONFLICT (username) DO NOTHING', [u.username, u.password, u.role]);
    }

    await client.query('DELETE FROM barang');

    // BEKKES
    const bekkes = [
      ['BKS-001','Paracetamol 500mg','Tablet',200,150,80,'PT Kimia Farma',futureDate(6)],
      ['BKS-002','Amoxicillin 500mg','Kapsul',100,200,120,'PT Indofarma',futureDate(3)],
      ['BKS-003','Betadine 100ml','Antiseptik',50,80,30,'CV Medika Jaya',futureDate(12)],
      ['BKS-004','Rivanol 300ml','Antiseptik',40,60,25,'PT Kalbe Farma',futureDate(9)],
      ['BKS-005','Plester Luka 5cm','Perawatan',300,500,200,'PT Kimia Farma',futureDate(14)],
      ['BKS-006','Masker Medis','APD',1000,2000,1500,'CV Medika Jaya',futureDate(8)],
      ['BKS-007','Sarung Tangan Latex','APD',500,1000,700,'PT Indofarma',futureDate(5)],
      ['BKS-008','Termometer Digital','Alat',10,5,3,'PT Kimia Farma',null],
      ['BKS-009','Tensimeter Digital','Alat',5,3,2,'CV Medika Jaya',null],
      ['BKS-010','Perban Elastis','Perawatan',80,100,60,'PT Kalbe Farma',futureDate(18)],
    ];
    for (const [k,n,j,a,m,ke,sup,exp] of bekkes) {
      const sa=a+m-ke, h=randomChoice([5000,10000,25000,50000,75000]);
      await client.query(`INSERT INTO barang (tanggal,kode_barang,nama_barang,kategori,jenis,expired,satuan,stok_awal,masuk,keluar,stok_akhir,harga,total_nilai,supplier,ket) VALUES ($1,$2,$3,'BEKKES',$4,$5,'pcs',$6,$7,$8,$9,$10,$11,$12,$13)`,
        [daysAgo(randomInt(1,30)),k,n,j,exp,a,m,ke,sa,h,h*sa,sup,sa>50?'Stok cukup':'Perlu restock']);
    }

    // ALKES
    const alkes = [
      ['ALK-001','Stetoskop Littmann','Diagnostik','Baik','Klinik Utama',10,5,3],
      ['ALK-002','Timbangan Badan Digital','Pengukuran','Baik','Poliklinik',8,4,2],
      ['ALK-003','Kursi Roda Standar','Mobilitas','Baik','IGD',5,3,1],
      ['ALK-004','Tandu Lipat','Evakuasi','Baik','Gudang Alkes',6,2,1],
      ['ALK-005','Nebulizer','Terapi','Rusak Ringan','Klinik Utama',4,2,1],
      ['ALK-006','Pulse Oximeter','Monitoring','Baik','IGD',15,10,8],
      ['ALK-007','Infus Set Dewasa','Terapi','Baik','Gudang Farmasi',200,300,150],
      ['ALK-008','Spuit 3cc','Injeksi','Baik','Gudang Farmasi',500,1000,800],
      ['ALK-009','EKG 12 Lead','Diagnostik','Baik','Klinik Jantung',2,1,0],
      ['ALK-010','Brancard Dorong','Mobilitas','Baik','IGD',3,2,1],
    ];
    for (const [k,n,j,kond,lok,a,m,ke] of alkes) {
      const sa=a+m-ke, h=randomChoice([50000,150000,500000,1000000,2500000]);
      await client.query(`INSERT INTO barang (tanggal,kode_barang,nama_barang,kategori,jenis,satuan,stok_awal,masuk,keluar,stok_akhir,harga,total_nilai,supplier,kondisi,lokasi,ket) VALUES ($1,$2,$3,'ALKES',$4,'unit',$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
        [daysAgo(randomInt(1,45)),k,n,j,a,m,ke,sa,h,h*sa,'PT Anugrah Medika',kond,lok,'Pemeliharaan rutin 6 bulan']);
    }

    // ATK
    const atk = [
      ['ATK-001','Kertas HVS A4 80gr','Kertas','Baik',50,100,60],
      ['ATK-002','Ballpoint Pilot G2','Alat Tulis','Baik',100,200,150],
      ['ATK-003','Stabilo Boss','Alat Tulis','Baik',30,50,20],
      ['ATK-004','Map Plastik Bening','Arsip','Baik',50,100,70],
      ['ATK-005','Tinta Printer Canon Black','Printer','Baik',10,20,15],
      ['ATK-006','Staples No.10','Kantor','Baik',20,30,15],
      ['ATK-007','Buku Folio 100 Lembar','Kertas','Baik',40,60,35],
      ['ATK-008','Spidol Whiteboard','Alat Tulis','Baik',25,40,20],
    ];
    const atkSup = ['PT Sinar Mas','UD Toko Jaya','CV Stationery'];
    for (const [k,n,j,kond,a,m,ke] of atk) {
      const sa=a+m-ke, h=randomChoice([3000,5000,8000,12000,25000]);
      await client.query(`INSERT INTO barang (tanggal,kode_barang,nama_barang,kategori,jenis,satuan,stok_awal,masuk,keluar,stok_akhir,harga,total_nilai,supplier,kondisi) VALUES ($1,$2,$3,'ATK',$4,'pcs',$5,$6,$7,$8,$9,$10,$11,$12)`,
        [daysAgo(randomInt(1,60)),k,n,j,a,m,ke,sa,h,h*sa,randomChoice(atkSup),kond]);
    }

    // ART
    const art = [
      ['ART-001','Sabun Cuci Piring Sunlight','Kebersihan',50,100,70],
      ['ART-002','Detergen Rinso 1kg','Kebersihan',30,60,40],
      ['ART-003','Sapu Lantai','Kebersihan',20,15,8],
      ['ART-004','Pel Lantai','Kebersihan',15,10,5],
      ['ART-005','Ember Plastik 20L','Peralatan',10,8,3],
      ['ART-006','Kain Lap Microfiber','Kebersihan',40,60,35],
    ];
    const penerima = [
      ['Ahmad Fauzi','2210034','Divisi A'],
      ['Budi Santoso','2210078','Divisi B'],
      ['Citra Dewi','2210112','Divisi C'],
    ];
    for (const [k,n,j,a,m,ke] of art) {
      const sa=a+m-ke, h=randomChoice([5000,8000,12000,20000]), p=randomChoice(penerima);
      await client.query(`INSERT INTO barang (tanggal,kode_barang,nama_barang,kategori,jenis,expired,satuan,stok_awal,masuk,keluar,stok_akhir,harga,total_nilai,supplier,nama_penerima,nrp_nip,unit) VALUES ($1,$2,$3,'ART',$4,$5,'pcs',$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
        [daysAgo(randomInt(1,30)),k,n,j,futureDate(randomInt(3,12)),a,m,ke,sa,h,h*sa,'CV Rumah Tangga Jaya',p[0],p[1],p[2]]);
    }

    // ALSINTOR
    const alsintor = [
      ['AST-001','Genset 5000 Watt','Listrik',3,1,0],
      ['AST-002','Pompa Air 1HP','Hidraulik',5,2,1],
      ['AST-003','Kompresor Angin','Pneumatik',4,1,0],
      ['AST-004','Mesin Las Listrik','Las',2,1,0],
      ['AST-005','Bor Listrik Makita','Perkakas',8,4,2],
    ];
    for (const [k,n,j,a,m,ke] of alsintor) {
      const sa=a+m-ke, h=randomChoice([500000,1500000,3000000,5000000]);
      await client.query(`INSERT INTO barang (tanggal,kode_barang,nama_barang,kategori,jenis,satuan,stok_awal,masuk,keluar,stok_akhir,harga,total_nilai,supplier,ket) VALUES ($1,$2,$3,'ALSINTOR',$4,'unit',$5,$6,$7,$8,$9,$10,$11,$12)`,
        [daysAgo(randomInt(1,90)),k,n,j,a,m,ke,sa,h,h*sa,'PT Teknik Mandiri','Pemeliharaan berkala 3 bulan']);
    }

    // ALSATRI
    const alsatri = [
      ['ASR-001','Rompi Taktis','Perlengkapan',50,20,10],
      ['ASR-002','Helm Pelindung','Pelindung',40,15,5],
      ['ASR-003','Sepatu Lapangan','Seragam',60,30,20],
      ['ASR-004','Ransel 45L','Perlengkapan',35,20,8],
      ['ASR-005','Sleeping Bag','Bivak',25,10,5],
    ];
    for (const [k,n,j,a,m,ke] of alsatri) {
      const sa=a+m-ke, h=randomChoice([150000,300000,500000,750000]);
      await client.query(`INSERT INTO barang (tanggal,kode_barang,nama_barang,kategori,jenis,satuan,stok_awal,masuk,keluar,stok_akhir,harga,total_nilai,supplier,ket) VALUES ($1,$2,$3,'ALSATRI',$4,'unit',$5,$6,$7,$8,$9,$10,$11,$12)`,
        [daysAgo(randomInt(1,60)),k,n,j,a,m,ke,sa,h,h*sa,'PT Pindad Persero','Kondisi siap pakai']);
    }

    // ALKOMLEK
    const alkomlek = [
      ['AKL-001','Radio HT Motorola','Komunikasi',20,10,5],
      ['AKL-002','Antena Radio VHF','Aksesoris',15,8,3],
      ['AKL-003','Laptop Dell Latitude','Komputer',10,5,2],
      ['AKL-004','Printer Canon LBP','Komputer',5,2,1],
      ['AKL-005','GPS Garmin 64s','Navigasi',12,6,3],
    ];
    const komSup = ['PT Len Industri','PT Inti Persero','CV Komtron'];
    for (const [k,n,j,a,m,ke] of alkomlek) {
      const sa=a+m-ke, h=randomChoice([500000,1500000,5000000,8000000]);
      await client.query(`INSERT INTO barang (tanggal,kode_barang,nama_barang,kategori,jenis,satuan,stok_awal,masuk,keluar,stok_akhir,harga,total_nilai,supplier,ket) VALUES ($1,$2,$3,'ALKOMLEK',$4,'unit',$5,$6,$7,$8,$9,$10,$11,$12)`,
        [daysAgo(randomInt(1,45)),k,n,j,a,m,ke,sa,h,h*sa,randomChoice(komSup),'Serial number tercatat']);
    }

    // BANGFAS
    const bangfas = [
      ['BFS-001','Gedung Kantor Utama','Permanen','Baik','Aktif','Direktur Utama'],
      ['BFS-002','Gudang Penyimpanan','Permanen','Baik','Aktif','Kepala Gudang'],
      ['BFS-003','Klinik Kesehatan','Permanen','Baik','Aktif','Kepala Klinik'],
      ['BFS-004','Aula Pertemuan','Permanen','Baik','Aktif','Kabag Umum'],
      ['BFS-005','Pos Keamanan','Semi Permanen','Rusak Ringan','Dalam Pemeliharaan','Koordinator Keamanan'],
    ];
    for (const [k,n,j,kond,stat,pj] of bangfas) {
      const h=randomChoice([50000000,100000000,250000000]);
      await client.query(`INSERT INTO barang (tanggal,kode_barang,nama_barang,kategori,jenis,satuan,stok_awal,masuk,keluar,stok_akhir,harga,total_nilai,supplier,kondisi,status,tgl_pemeliharaan,pj,ket) VALUES ($1,$2,$3,'BANGFAS',$4,'unit',1,0,0,1,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [daysAgo(randomInt(30,180)),k,n,j,h,h,'Dinas Konstruksi',kond,stat,futureDate(randomInt(1,6)),pj,'Pemeliharaan rutin sesuai jadwal']);
    }

    console.log('✅ Seed berhasil!');
    console.log('👤 Users: admin/admin123, operator/operator123, gudang/gudang123');
    console.log('📦 Data 8 kategori sudah terisi');
  } catch(err) {
    console.error('❌ Seed error:', err);
  } finally {
    client.release();
    process.exit();
  }
}

seed();
