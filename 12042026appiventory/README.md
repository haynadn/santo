# 📦 Departemen Inventaris — Node.js + PostgreSQL

Sistem pendataan barang masuk & keluar dengan 8 kategori, siap deploy ke Railway.

## 🚀 Cara Jalankan Lokal

### 1. Install dependencies
```bash
npm install
```

### 2. Setup database PostgreSQL lokal
Buat database baru:
```sql
CREATE DATABASE departemen_inventaris;
```

### 3. Buat file .env
```bash
cp .env.example .env
```
Lalu edit `.env` sesuai konfigurasi database kamu.

### 4. Jalankan aplikasi
```bash
npm start
```
Atau untuk development (auto-restart):
```bash
npm run dev
```

### 5. Isi dummy data (opsional)
```bash
npm run seed
```

### 6. Buka browser
```
http://localhost:3000
```

## 🔐 Login Default
| Username | Password | Role |
|----------|----------|------|
| admin | admin123 | admin |
| operator | operator123 | user |
| gudang | gudang123 | user |

---

## 🌐 Deploy ke Railway (Gratis)

### Step 1 — Push ke GitHub
```bash
git init
git add .
git commit -m "initial commit"
git branch -M main
git remote add origin https://github.com/USERNAME/REPO.git
git push -u origin main
```

### Step 2 — Deploy di Railway
1. Buka [railway.app](https://railway.app) → Login pakai GitHub
2. Klik **New Project → Deploy from GitHub repo**
3. Pilih repo yang sudah di-push

### Step 3 — Tambah PostgreSQL
1. Di dashboard Railway, klik **+ New → Database → Add PostgreSQL**
2. Railway otomatis set `DATABASE_URL` ke project kamu

### Step 4 — Set Environment Variables
Di Railway → Settings → Variables, tambahkan:
```
SECRET_KEY=ganti-dengan-key-yang-kuat-acak
NODE_ENV=production
```

### Step 5 — Generate Domain
Railway → Settings → Networking → **Generate Domain**

Website langsung bisa diakses dari HP! 📱

---

## 📁 Struktur Project
```
departemen_app/
├── src/
│   ├── app.js              ← Entry point
│   ├── seed.js             ← Dummy data
│   ├── middleware/
│   │   └── auth.js
│   └── routes/
│       ├── auth.js
│       ├── dashboard.js
│       ├── barang.js
│       └── export.js
├── views/
│   ├── partials/
│   │   ├── head.ejs
│   │   ├── sidebar.ejs
│   │   ├── topbar.ejs
│   │   ├── alerts.ejs
│   │   ├── footer.ejs
│   │   └── scripts.ejs
│   └── pages/
│       ├── login.ejs
│       ├── dashboard.ejs
│       ├── barang_list.ejs
│       ├── barang_form.ejs
│       └── 404.ejs
├── config/
│   └── db.js
├── public/
├── package.json
├── .env.example
└── .gitignore
```

## ✨ Fitur
- ✅ Login & autentikasi (session-based)
- ✅ Dashboard dengan 3 grafik (Chart.js)
- ✅ CRUD barang untuk 8 kategori
- ✅ Kolom khusus per kategori sesuai format asli
- ✅ Kalkulasi stok akhir otomatis
- ✅ Export Excel per kategori
- ✅ Pencarian barang
- ✅ Sidebar collapsible ala Claude
- ✅ Login page split purple/dark
- ✅ Responsive mobile
- ✅ Siap deploy Railway (PostgreSQL)
