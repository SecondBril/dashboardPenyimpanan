# Multi-Cloud Storage Hub (3x Google Drive + 1x OneDrive)

Sistem Dashboard Terpadu & Unified API untuk mengelola **3 akun Google Drive + 1 akun OneDrive** dalam satu antarmuka modern dengan kemampuan **Drag & Drop antar-provider**, **Streaming Transfer Engine**, dan **Smart Auto-Organization berbasis Rule Deterministik & Google Gemini AI**.

---

## 🌟 Fitur Utama

1. **4-Account Multi-Viewport File Browser**
   - Kolom 1: Google Drive A (Utama / Kerja)
   - Kolom 2: Google Drive B (Media & Foto)
   - Kolom 3: Google Drive C (Arsip & Backup)
   - Kolom 4: OneDrive D (Pribadi & Dokumen)
   - Navigasi breadcrumb direktori per akun dan pencarian file real-time.

2. **Drag & Drop Lintas Akun & Provider (dnd-kit)**
   - Tarik file dari kolom mana saja (misal Google Drive A) dan lepaskan ke kolom lain (misal OneDrive D).
   - Dialog konfirmasi transfer: Pilihan **"Pindahkan (Move)"** atau **"Salin (Copy)"**.

3. **Streaming Transfer Engine**
   - Pipelining stream HTTP langsung dari provider sumber ke provider tujuan tanpa membebani disk server.
   - Resumable chunked progress bar dan queue drawer interaktif.
   - Verifikasi integritas ukuran file sebelum menghapus sumber pada operasi Move.

4. **Operasi CRUD Lengkap**
   - **Create**: Buat folder baru & upload file (dengan preview progres).
   - **Read**: Pratinjau gambar, dokumen teks/kode, serta integrasi tautan langsung ke Google Docs & Office Online.
   - **Update**: Rename nama file/folder dan ganti isi (replace content) file reguler.
   - **Delete**: Hapus file dengan konfirmasi aman.
   - **Download**: Unduh stream file langsung dari browser.

5. **Smart Auto-Organization & Notifikasi (PRD Addendum)**
   - **Rule Engine**: Pemetaan deterministik (MIME-type, ekstensi, kata kunci nama file).
   - **Smart Classifier (AI)**: Analisis konteks judul dan tipe file via Google Gemini API dengan scoring confidence (0.0 - 1.0).
   - **Threshold Adaptif**: Auto-Move jika confidence > 85%, Saran Pindah jika confidence 50% - 85%.
   - **Safety & Fitur Undo**: Setiap pemindahan otomatis dapat dibatalkan (di-Undo) langsung dari Notification Center untuk mengembalikan file ke akun dan folder asalnya.

6. **Visualisasi Kuota Penyimpanan (Storage Summary)**
   - Indikator kapasitas gabungan (total used vs limit) dan kartu visual per akun dengan warna aksen unik.

---

## 🚀 Cara Menjalankan Aplikasi

### 1. Instalasi Dependensi
```bash
npm install
```

### 2. Mode Demo / Mock (Langsung Siap Pakai)
Aplikasi sudah dikonfigurasi secara default dalam **Mock/Sandbox Mode** di `.env.local`:
```env
NEXT_PUBLIC_APP_MODE=mock
NEXT_PUBLIC_APP_URL=http://localhost:3000
```
Dalam mode ini, Anda dapat langsung menguji seluruh fitur:
- Jelajahi 4 akun dengan data file realistis (dokumen proyek, foto, backup sql, invoice, sertifikat).
- Uji drag & drop file antar Google Drive dan OneDrive.
- Uji fitur smart auto-organization, notifikasi, dan tombol Undo.

Jalankan dev server:
```bash
npm run dev
```
Buka browser di: `http://localhost:3000`

---

## 🔑 Menghubungkan ke Akun Produksi Asli (Live Mode)

Ketika Anda siap menghubungkan akun Google Drive dan OneDrive asli:

1. **Google Drive API (3 Akun)**:
   - Buat project di [Google Cloud Console](https://console.cloud.google.com/).
   - Aktifkan Google Drive API v3.
   - Buat OAuth Client ID (Web Application) dengan redirect URI: `http://localhost:3000/api/auth/callback/google`.
   - Simpan refresh token masing-masing akun ke `.env.local`:
     ```env
     GOOGLE_CLIENT_ID=your_client_id
     GOOGLE_CLIENT_SECRET=your_client_secret
     GOOGLE_REFRESH_TOKEN_a0000000-0000-0000-0000-000000000001=token_akun_a
     GOOGLE_REFRESH_TOKEN_a0000000-0000-0000-0000-000000000002=token_akun_b
     GOOGLE_REFRESH_TOKEN_a0000000-0000-0000-0000-000000000003=token_akun_c
     ```

2. **OneDrive (Microsoft Graph)**:
   - Daftarkan aplikasi di [Azure Portal / Microsoft Entra ID](https://portal.azure.com/).
   - Berikan scope `Files.ReadWrite.All` dan `offline_access`.
   - Simpan kredensial ke `.env.local`:
     ```env
     MICROSOFT_CLIENT_ID=your_azure_client_id
     MICROSOFT_CLIENT_SECRET=your_azure_client_secret
     MICROSOFT_TENANT_ID=common
     # Gunakan salah satu (atau keduanya):
     MICROSOFT_REFRESH_TOKEN=your_refresh_token
     MICROSOFT_ACCESS_TOKEN=your_access_token
     ```

3. **Google Gemini API (Smart Classifier)**:
   - Dapatkan API Key gratis di [Google AI Studio](https://aistudio.google.com/).
   - Masukkan ke `.env.local`:
     ```env
     GEMINI_API_KEY=your_gemini_api_key
     ```

4. **Ubah Mode ke Production**:
   ```env
   NEXT_PUBLIC_APP_MODE=production
   ```

---

## 🗄️ Skema Database Supabase
File migrasi lengkap tersedia di:
`supabase/migrations/001_initial_schema.sql`

Tabel yang dibuat:
- `accounts`: Kredensial, status, kuota penyimpanan 4 akun.
- `file_index`: Indeks cache metadata file.
- `transfer_jobs`: Antrian pelacakan transfer streaming lintas provider.
- `organization_rules`: Aturan deterministik pemindahan otomatis.
- `classification_jobs`: Log hasil klasifikasi AI/rules serta riwayat Undo.
- `notifications`: Notifikasi in-app & alert telegram.
- `settings`: Konfigurasi ambang batas confidence (auto-move & suggestion).

---

## 📡 Dokumentasi Endpoint Unified API

| Metode | Endpoint | Deskripsi |
|---|---|---|
| `GET` | `/api/v1/accounts` | Mendapatkan daftar 4 akun dan status koneksi |
| `GET` | `/api/v1/files?account=all&q=keyword` | Mencari dan menampilkan file lintas akun |
| `POST` | `/api/v1/files` | Membuat folder atau upload file baru (auto-classify) |
| `GET` | `/api/v1/files/:id/download` | Streaming unduhan biner file |
| `PATCH` | `/api/v1/files/:id` | Mengubah nama file/folder |
| `PUT` | `/api/v1/files/:id/content` | Mengganti isi konten file reguler |
| `DELETE` | `/api/v1/files/:id` | Menghapus file/folder |
| `GET` | `/api/v1/storage-summary` | Ringkasan kapasitas tiap akun & total gabungan |
| `POST` | `/api/v1/transfer` | Memulai transfer streaming lintas akun (Move / Copy) |
| `GET` | `/api/v1/transfer/:id` | Mengecek progres & status job transfer |
| `GET` | `/api/v1/organization/rules` | Menampilkan aturan auto-organization aktif |
| `POST` | `/api/v1/organization/rules` | Menambahkan aturan baru |
| `POST` | `/api/v1/organization/jobs/:id/undo` | Mengembalikan file auto-move ke lokasi semula |
| `POST` | `/api/v1/organization/jobs/:id/approve` | Menyetujui saran pemindahan file |
| `GET` | `/api/v1/notifications` | Menampilkan notifikasi & pesan sistem |
| `POST` | `/api/webhooks/google-drive` | Receiver webhook Drive changes.watch |
| `POST` | `/api/webhooks/onedrive` | Receiver webhook Microsoft Graph subscription |
