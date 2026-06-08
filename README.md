# VaultStore &mdash; Panduan Setup & Deploy

Platform top up game lengkap dengan panel owner, leaderboard, dan integrasi Firebase.

---

## Struktur Proyek

```
topup-store/
├── index.html                  # Homepage utama
├── css/
│   └── style.css               # Stylesheet utama
├── js/
│   ├── firebase-config.js      # Konfigurasi Firebase & helpers
│   └── app.js                  # Auth, toast, modal utilities
├── pages/
│   ├── catalog.html            # Halaman katalog semua game
│   ├── product.html            # Detail produk & checkout
│   ├── orders.html             # Riwayat pesanan user
│   ├── leaderboard.html        # Leaderboard publik
│   ├── Profile.html            # Profile User
│   └── owner/
│       ├── dashboard.html      # Dashboard owner
│       ├── products.html       # Kelola produk
│       ├── orders.html         # Approve/tolak pesanan
│       ├── users.html          # Data pengguna
│       ├── leaderboard.html    # Kelola leaderboard
│       └── settings.html       # Pengaturan toko
└── firestore.rules             # Security rules Firestore
```

---

## Langkah 1 — Setup Firebase

### 1.1 Buat Project Firebase
1. Buka [console.firebase.google.com](https://console.firebase.google.com)
2. Klik **Add project** → isi nama project → selesaikan wizard
3. Di sidebar, klik **Firestore Database** → **Create database** → pilih region (asia-southeast1 untuk Indonesia) → mulai dalam **production mode**

### 1.2 Aktifkan Google Auth
1. Di sidebar Firebase, klik **Authentication** → **Get started**
2. Klik **Sign-in method** → **Google** → Enable → Save

### 1.3 Ambil Firebase Config
1. Di Firebase Console → Project Settings (ikon gear) → **Your apps**
2. Klik **Add app** → pilih Web (**</>**)
3. Register app → salin config object

### 1.4 Update firebase-config.js
Buka `js/firebase-config.js` dan ganti bagian ini:

```javascript
const firebaseConfig = {
  apiKey: "GANTI_INI",
  authDomain: "GANTI_INI.firebaseapp.com",
  projectId: "GANTI_INI",
  storageBucket: "GANTI_INI.appspot.com",
  messagingSenderId: "GANTI_INI",
  appId: "GANTI_INI"
};
```

---

## Langkah 2 — Dapatkan UID Owner

### 2.1 Deploy dulu (sementara tanpa UID)
Deploy ke GitHub Pages terlebih dahulu (langkah 4), lalu login ke website dengan akun Google kamu.

### 2.2 Ambil UID dari Firestore
1. Buka Firebase Console → **Firestore Database**
2. Buka koleksi `users` → pilih document akun kamu
3. Salin nilai field `uid` (atau gunakan document ID-nya)

Atau gunakan cara cepat: Login ke website → buka **Panel Owner** (akan muncul setelah kamu set UID) → **Pengaturan** → tombol **"Salin UID"**. Tapi untuk pertama kali, cara paling mudah:

1. Login ke website
2. Buka Developer Tools (F12) → Console
3. Ketik: `firebase.auth().currentUser.uid` → Enter
4. Salin UID yang muncul

### 2.3 Set UID Owner
Buka `js/firebase-config.js`, ganti:

```javascript
const OWNER_UIDS = ["PASTE_UID_KAMU_DI_SINI"];
```

Boleh lebih dari satu:
```javascript
const OWNER_UIDS = ["UID_OWNER_1", "UID_OWNER_2"];
```

---

## Langkah 3 — Upload Firestore Rules

1. Buka Firebase Console → **Firestore Database** → tab **Rules**
2. Salin isi file `firestore.rules` dan paste di editor rules
3. Jangan lupa ganti `"YOUR_OWNER_UID"` dengan UID asli kamu
4. Klik **Publish**

Contoh rules setelah diisi:
```
return request.auth.uid in ["AbCdEf123456789XYZ"];
```

---

## Langkah 4 — Deploy ke GitHub Pages

### 4.1 Buat Repository
1. Buka [github.com](https://github.com) → **New repository**
2. Nama repo bebas, misal: `vaultstore` atau `topup-store`
3. Set ke **Public**
4. Klik **Create repository**

### 4.2 Upload Files
```bash
# Clone repo kosong
git clone https://github.com/USERNAME/vaultstore.git
cd vaultstore

# Copy semua file project ke folder ini
# Pastikan index.html ada di root folder

git add .
git commit -m "Initial deploy VaultStore"
git push origin main
```

### 4.3 Aktifkan GitHub Pages
1. Di repo GitHub, klik **Settings** → **Pages**
2. Source: **Deploy from a branch**
3. Branch: **main** → folder: **/ (root)**
4. Klik **Save**
5. URL website kamu akan muncul: `https://USERNAME.github.io/vaultstore`

---

## Langkah 5 — Setup Cloudflare (Opsional tapi Recommended)

### 5.1 Tambah Domain Custom
Jika punya domain sendiri (misal: `vaultstore.id`):

1. Daftarkan domain ke Cloudflare
2. Di Cloudflare DNS → tambah **CNAME record**:
   - Name: `@` atau subdomain kamu
   - Target: `USERNAME.github.io`
3. Di GitHub Pages settings → tambah custom domain

### 5.2 Aktifkan Cloudflare Features
Di Cloudflare dashboard untuk domain kamu:
- **SSL/TLS** → set ke **Full (strict)**
- **Speed** → **Auto Minify** → centang JS, CSS, HTML
- **Caching** → **Browser Cache TTL** → 1 day
- **Security** → **Bot Fight Mode** → ON

### 5.3 Update Firebase Authorized Domains
1. Firebase Console → **Authentication** → **Settings** → **Authorized domains**
2. Tambahkan domain custom kamu (misal: `vaultstore.id`)

---

## Langkah 6 — Tambah Produk Pertama

1. Login ke website dengan akun Google (yang sudah jadi owner)
2. Klik ikon **&#9733;** di navbar atau pergi ke `/pages/owner/dashboard.html`
3. Klik **Produk** → **+ Tambah Produk**
4. Isi form:
   - **Nama Game**: Mobile Legends
   - **Kategori**: MOBA
   - **Icon**: &#9670; (atau emoji)
   - **Warna Gradien**: pilih warna sesukamu
   - **Item**: tambahkan nominal (misal: 86 Diamond = Rp 19.000)
   - **Field Isian**: User ID (wajib), Server ID (opsional)
5. Klik **Simpan Produk**

---

## Koleksi Firestore yang Dibuat Otomatis

| Koleksi | Dibuat oleh | Isi |
|---------|-------------|-----|
| `products` | Owner | Data produk/game |
| `orders` | User saat checkout | Data pesanan |
| `users` | User saat login | Profil pengguna |
| `leaderboard` | User saat order | Statistik belanja |
| `stats` | System | Angka statistik global |
| `settings` | Owner | Konfigurasi toko |

---

## Cara Kerja Approve Pesanan

1. Pembeli checkout → pesanan masuk dengan status **pending**
2. Owner menerima notifikasi (terlihat di dashboard)
3. Owner klik **Setujui** → status berubah ke **success**
4. Atau klik tanda panah **&#9654;** → status **processing** (sedang dikerjakan)
5. Setelah selesai klik **Setujui** → **success**

---

## Troubleshooting

**Login Google tidak muncul popup:**
- Pastikan domain sudah ditambahkan di Firebase → Authentication → Authorized domains
- Cek apakah `authDomain` di config sudah benar

**Data tidak muncul / permission denied:**
- Pastikan Firestore Rules sudah di-publish dengan UID owner yang benar
- Cek Console browser untuk pesan error detail

**Panel owner tidak bisa diakses:**
- Pastikan UID sudah diset di `OWNER_UIDS` di `firebase-config.js`
- Push ulang ke GitHub setelah edit

---

## Kontak & Support

Untuk pertanyaan, konfigurasi lanjutan, atau penambahan fitur, hubungi developer.
