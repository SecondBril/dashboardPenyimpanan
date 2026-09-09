# PRD Addendum: Smart Auto-Organization & Notifikasi

**Versi:** 1.0 — pelengkap dari PRD-Multi-Cloud-Storage-Hub-v2
**Tanggal:** 9 September 2026
**Status:** Draft untuk review

---

## 1. Ringkasan Fitur

Sistem secara otomatis mendeteksi file baru/berpindah di salah satu dari 4 akun (3 Google Drive + 1 OneDrive), mengklasifikasikannya berdasarkan **jenis file**, **judul**, dan **keterkaitan isi/konteks**, lalu:
- Jika file berada di lokasi yang salah (mis. gambar nyasar ke folder "Dokumen Kontrak") → **otomatis dipindahkan** ke folder yang benar (bisa lintas akun/provider, memakai Transfer Engine yang sudah ada).
- Anda **dinotifikasikan** setiap kali ada pemindahan otomatis, lengkap dengan opsi **Undo**.
- Untuk kasus yang ambigu (confidence rendah), sistem **tidak** memindahkan otomatis — hanya menyarankan lewat notifikasi, menunggu persetujuan Anda.

---

## 2. Kenapa Perlu Dua Lapis Klasifikasi

| Lapis | Contoh kasus | Metode |
|---|---|---|
| **Rule-based (deterministik)** | File `.jpg`/`.png` masuk ke folder Dokumen → jelas salah tempat berdasarkan tipe | Mapping MIME type/ekstensi → folder tujuan, dikonfigurasi manual di UI |
| **Smart/AI-based (kontekstual)** | File PDF bernama "invoice_sept.pdf" masuk ke folder "Foto Liburan" → tipe tidak membantu, perlu paham judul & isi | Ekstraksi teks + judul → panggil LLM untuk klasifikasi kategori, atau embedding similarity ke folder yang sudah ada |

Rule-based murah & instan (tidak perlu API call ke AI). Smart classification dipakai hanya saat rule-based tidak cukup jelas (fallback).

---

## 3. Alur Proses (End-to-End)

```
File baru/berpindah terdeteksi (via webhook Google/Microsoft)
              │
              ▼
     ┌─────────────────────┐
     │  Rule Engine Check    │  → cocok mapping tipe file? → tentukan folder ideal
     └─────────┬─────────────┘
               │ tidak cukup jelas
               ▼
     ┌─────────────────────┐
     │  Smart Classifier     │  → ekstrak judul + cuplikan isi
     │  (LLM / embedding)    │  → prediksi kategori & folder ideal + confidence score
     └─────────┬─────────────┘
               ▼
     Apakah lokasi saat ini ≠ folder ideal?
               │
     ┌─────────┴─────────┐
     │ Ya, confidence     │ Ya, confidence
     │ TINGGI             │ RENDAH/menengah
     ▼                    ▼
Auto-move via        Kirim notifikasi
Transfer Engine       "saran pindah" +
+ notifikasi hasil    tombol Setujui/Abaikan
```

---

## 4. Deteksi Real-Time (Webhook, Bukan Polling)

Karena sistem butuh tahu "ada file baru/masuk" secepat mungkin tanpa boros kuota API:

### Google Drive
- Gunakan **Drive API `changes.watch`** — mendaftarkan channel webhook yang akan memanggil endpoint Anda (`/api/webhooks/google-drive`) setiap kali ada perubahan di akun tsb.
- Channel Google **kedaluwarsa maksimal beberapa hari** → perlu **cron job (Vercel Cron)** untuk memperbarui registrasi webhook secara berkala sebelum expired.

### OneDrive (Microsoft Graph)
- Gunakan **Graph API `/subscriptions`** — mirip konsepnya, mendaftarkan webhook ke `/api/webhooks/onedrive`.
- Subscription Graph juga punya masa berlaku terbatas (maks. beberapa hari tergantung resource) → perlu renewal otomatis lewat cron juga.

### Fallback
- Selain webhook, tetap ada **sync berkala** (mis. tiap 15–30 menit) sebagai jaring pengaman kalau webhook sempat terlewat/gagal terkirim.

---

## 5. Smart Classifier — Detail Teknis

1. **Ekstraksi sinyal dari file:**
   - Nama file & lokasi saat ini.
   - Tipe MIME.
   - Cuplikan isi (untuk PDF/dokumen: ekstrak beberapa ratus kata pertama; untuk gambar: nama file + metadata EXIF kalau ada, tanpa perlu analisis visual berat di v1).
2. **Klasifikasi:**
   - Kirim sinyal di atas ke model AI (bisa pakai Gemini API resmi — sejalan dengan yang Anda punya — untuk memprediksi kategori & folder tujuan paling relevan dari daftar folder yang sudah ada di 4 akun Anda).
   - Alternatif lebih murah untuk skala besar: hitung **embedding** dari judul+cuplikan isi, simpan di **Supabase pgvector**, lalu cari folder dengan "pusat massa" embedding paling mirip (berdasarkan file-file yang sudah ada di folder tsb).
3. **Confidence score:** setiap prediksi disertai skor 0–1. Ambang batas (mis. >0.85 = auto-move, 0.5–0.85 = sarankan, <0.5 = abaikan) **bisa diatur di dashboard**.

---

## 6. Rule Engine — Detail Teknis

Konfigurasi manual di dashboard, contoh:

| Kondisi | Aksi |
|---|---|
| `mime_type` dimulai `image/` DAN lokasi = folder "Dokumen*" | Pindahkan ke folder "Foto" di akun yang sama/akun target pilihan |
| `mime_type` = `application/pdf` DAN nama mengandung kata "invoice"/"tagihan" | Pindahkan ke folder "Keuangan" |
| Ekstensi `.mp4`/`.mov` di folder mana pun selain "Video" | Pindahkan ke folder "Video" |

Rule ini dievaluasi lebih dulu (murah, instan) sebelum fallback ke Smart Classifier.

---

## 7. Notifikasi ke Anda

### Channel yang didukung (pilih salah satu/kombinasi saat setup)
| Channel | Kelebihan | Implementasi |
|---|---|---|
| **In-app notification center** | Selalu tersedia di dashboard, riwayat lengkap | Tabel `notifications` + badge/bell icon real-time (Supabase Realtime subscription) |
| **Email** | Bisa dicek tanpa buka dashboard | Resend/SendGrid dari server route |
| **Telegram Bot** | Notifikasi instan ke HP, gampang diimplementasi (1 bot token) | Bot API `sendMessage` dari server saat event terjadi |
| **Web Push** | Notifikasi browser native | Perlu service worker, sedikit lebih kompleks — opsional fase lanjutan |

**Rekomendasi v1:** In-app notification center + Telegram bot (paling cepat dibangun & paling praktis untuk personal use, karena instan ke HP tanpa perlu buka dashboard).

### Isi notifikasi
- **Auto-move terjadi:** "📦 `invoice_sept.pdf` dipindah dari `Foto Liburan` → `Keuangan` (Akun A). [Undo]"
- **Saran (confidence menengah):** "🤔 `random_scan.pdf` sepertinya cocok masuk `Kontrak` (Akun C), bukan `Unduhan` (OneDrive). [Setujui] [Abaikan]"

### Undo
- Setiap auto-move dicatat di `classification_jobs` dengan lokasi asal → tombol Undo memanggil Transfer Engine untuk mengembalikan file ke lokasi semula.

---

## 8. Skema Database Tambahan (Supabase)

### `organization_rules`
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | uuid (PK) | |
| condition_type | text | `'mime_type'` \| `'filename_keyword'` \| `'extension'` |
| condition_value | text | mis. `'image/*'`, `'invoice'` |
| source_folder_filter | text | opsional, batasi rule hanya berlaku di folder tertentu |
| target_account_id | uuid (FK) | |
| target_folder_id | text | |
| enabled | boolean | |

### `classification_jobs`
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | uuid (PK) | |
| file_index_id | uuid (FK) | |
| method | text | `'rule'` \| `'ai'` |
| predicted_target_account_id | uuid | |
| predicted_target_folder_id | text | |
| confidence | numeric | 0–1 |
| action | text | `'auto_moved'` \| `'suggested'` \| `'ignored'` |
| original_account_id / original_folder_id | uuid/text | untuk keperluan Undo |
| created_at | timestamptz | |

### `notifications`
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | uuid (PK) | |
| classification_job_id | uuid (FK, nullable) | |
| message | text | |
| channel | text | `'in_app'` \| `'email'` \| `'telegram'` |
| is_read | boolean | |
| created_at | timestamptz | |

### `settings` (konfigurasi threshold, dsb.)
| Kolom | Tipe | Keterangan |
|---|---|---|
| auto_move_threshold | numeric | default 0.85 |
| suggest_threshold | numeric | default 0.5 |
| excluded_folders | text[] | folder yang tidak boleh disentuh auto-organization |
| notification_channels | text[] | channel aktif |

---

## 9. Endpoint API Tambahan

```
GET   /api/v1/organization/rules          → list rule aktif
POST  /api/v1/organization/rules          → buat rule baru
GET   /api/v1/organization/jobs           → riwayat klasifikasi (auto-move & saran)
POST  /api/v1/organization/jobs/:id/undo  → batalkan auto-move
POST  /api/v1/organization/jobs/:id/approve → setujui saran (untuk confidence menengah)
GET   /api/v1/notifications               → daftar notifikasi
PATCH /api/v1/notifications/:id/read      → tandai sudah dibaca
```

---

## 10. Pengaman Penting (Supaya Tidak Berantakan)

- **Folder pengecualian** — Anda bisa tandai folder tertentu "jangan disentuh sistem" (mis. folder kerja yang sudah rapi manual).
- **Threshold auto-move dimulai tinggi (0.85)** secara default supaya tidak terlalu agresif memindah file di awal pemakaian, bisa diturunkan bertahap setelah Anda percaya akurasinya.
- **Semua auto-move bisa di-undo** — tidak ada operasi destruktif (delete) yang dilakukan otomatis oleh fitur ini, hanya move/copy.
- **Rate limit klasifikasi AI** — batasi jumlah file yang diklasifikasi lewat AI per menit/jam supaya tidak membengkakkan biaya API kalau tiba-tiba banyak file masuk sekaligus (mis. saat upload folder besar).

---

## 11. Roadmap Implementasi (Tambahan ke Roadmap Utama)

| Fase | Cakupan | Estimasi |
|---|---|---|
| **V2.1** | Rule engine (mapping tipe file → folder) + eksekusi via Transfer Engine | 1 minggu |
| **V2.2** | Webhook real-time (Google `changes.watch` + Graph `/subscriptions`) + cron renewal | 1 minggu |
| **V2.3** | Smart Classifier (integrasi Gemini API untuk prediksi kategori) + confidence threshold | 1–1.5 minggu |
| **V2.4** | Notification center (in-app) + Telegram bot + Undo | 3–5 hari |
| **V2.5** | Fine-tuning threshold, excluded folders, rate limiting AI | 3–5 hari |

---

## 12. Risiko & Mitigasi

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Salah klasifikasi memindah file penting ke tempat tidak terduga | File "hilang" dari kebiasaan pencarian Anda | Threshold tinggi default, notifikasi selalu dikirim, Undo tersedia, tidak ada auto-delete |
| Webhook gagal terkirim/expired tanpa disadari | File baru tidak terdeteksi tepat waktu | Fallback sync berkala + cron renewal + alert kalau webhook gagal registrasi |
| Biaya API AI membengkak saat upload masif | Cost tidak terkontrol | Rate limiting, rule-based diprioritaskan dulu sebelum panggil AI |
| False positive terus-menerus di kategori tertentu | Anda capek approve/undo manual | Dashboard analitik akurasi per kategori, opsi nonaktifkan smart classifier untuk kategori tertentu |
