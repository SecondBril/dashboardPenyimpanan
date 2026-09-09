# PRD: Multi-Cloud Storage Hub (3x Google Drive + 1x OneDrive)

**Versi:** 2.0 (menggantikan v1 Google-Drive-only)
**Tanggal:** 9 September 2026
**Pemilik Produk:** Personal use (single user, 4 akun cloud storage)
**Status:** Draft untuk review

---

## 1. Ringkasan Eksekutif

Website personal yang menggabungkan **3 akun Google Drive + 1 akun OneDrive** ke dalam satu dashboard terpadu, dengan kemampuan penuh **Create, Read, Update, Delete, Move, Copy** file/folder lintas akun & lintas provider — semuanya lewat drag & drop atau UI standar. Seluruh data juga diekspos lewat **satu API pribadi** yang bisa diakses dari mana saja.

Kedua provider (Google Drive & OneDrive) punya **API resmi** untuk semua operasi ini — tidak ada isu ToS/scraping. Tantangan utamanya murni teknis: menyatukan dua sistem yang modelnya beda ke dalam satu abstraksi.

Stack: **Next.js (Vercel)** + **Supabase** (metadata, token, job tracking) + **Google Drive API v3** + **Microsoft Graph API**.

---

## 2. Kelayakan Teknis per Provider

| Aspek | Google Drive | OneDrive (Microsoft Graph) |
|---|---|---|
| API resmi | Drive API v3 | Microsoft Graph API `/me/drive` |
| Auth | OAuth 2.0 (Google Identity) | OAuth 2.0 (Microsoft Identity Platform / MSAL) |
| Scope untuk CRUD penuh | `drive` | `Files.ReadWrite.All`, `offline_access` |
| Resumable upload file besar | Ya | Ya (`createUploadSession`) |
| Move/copy dalam 1 akun | Native | Native |
| Move antar akun berbeda (cross-account) | Tidak native → harus stream copy manual | Tidak native → harus stream copy manual |
| Mode akses tanpa review Google/Microsoft | Testing mode (≤100 test user) | App registration personal, tidak perlu publish/review untuk pemakaian sendiri |

**Kesimpulan:** Semua operasi yang Anda minta (pindah, hapus, buat, edit, baca) bisa dilakukan lewat API resmi kedua provider. Yang perlu dibangun adalah **adapter layer** supaya dashboard & API Anda memperlakukan keduanya secara seragam.

### Catatan soal "Edit"
- File biasa (teks, kode, gambar, PDF, dsb.): edit = baca konten → ubah → tulis ulang (replace content) via API. Ini sepenuhnya didukung kedua provider.
- **Google Docs/Sheets/Slides** dan **Office Online (Word/Excel/PowerPoint)**: ini bukan file biner biasa — mengedit isinya secara rich-text di dalam dashboard custom Anda butuh integrasi terpisah (Google Docs API / Microsoft Graph Office API), jauh lebih kompleks daripada sekadar file CRUD. **Rekomendasi v1**: untuk tipe dokumen ini, tombol "Edit" cukup membuka file di tab baru ke Google Docs/Office Online (link resmi), bukan dibangun ulang editornya sendiri. Full in-app rich editor bisa jadi fase lanjutan kalau memang dibutuhkan.

---

## 3. Tujuan Produk

1. Satu dashboard untuk browse, buat, edit, hapus, dan pindahkan file di 4 akun (3 Google Drive + 1 OneDrive) sekaligus.
2. Drag & drop untuk memindahkan file antar akun apa pun kombinasinya (termasuk lintas provider, mis. dari OneDrive ke Google Drive Akun B).
3. Operasi CRUD standar: create folder/file baru, rename, hapus, replace/edit konten file biasa.
4. Satu API pribadi yang mengekspos & mengontrol seluruh 4 akun tersebut, bisa diakses global dengan latensi rendah.

### Non-Tujuan
- Tidak membangun rich-text editor Docs/Office sendiri di v1 (lihat §2).
- Tidak untuk berbagi/kolaborasi dengan orang lain — strictly personal.
- Tidak memount sebagai network drive di OS.

---

## 4. Alur Pengguna Utama

1. **Setup awal** — Hubungkan 4 akun: 3x tombol "Connect Google Drive" + 1x tombol "Connect OneDrive" → OAuth consent masing-masing → token disimpan terenkripsi.
2. **Browse gabungan** — Dashboard menampilkan file browser dengan 4 kolom/tab (Akun A, B, C = Google; Akun D = OneDrive), ikon provider berbeda untuk membedakan.
3. **CRUD standar**:
   - **Create**: tombol "New Folder" / "Upload File" di kolom akun manapun.
   - **Read**: klik file → preview (Google Drive & OneDrive sama-sama punya thumbnail/preview link resmi).
   - **Update**: rename langsung di UI; untuk isi file biasa, tombol "Replace content" (upload versi baru).
   - **Delete**: tombol hapus per item atau batch.
4. **Drag & drop pindah/salin** — Seret file dari kolom mana pun ke kolom lain (termasuk lintas provider) → sistem menjalankan stream transfer, dengan pilihan "Copy" atau "Move".
5. **Progress & queue** — Sama seperti sebelumnya, file besar diproses bertahap (resumable) dengan progress bar.
6. **Konsumsi via API** — Ambil/ubah data lewat endpoint API pribadi.

---

## 5. Arsitektur Sistem

```
┌───────────┐┌───────────┐┌───────────┐┌───────────┐
│ G-Drive A ││ G-Drive B ││ G-Drive C ││ OneDrive D │
└─────┬─────┘└─────┬─────┘└─────┬─────┘└─────┬─────┘
      │ Drive API  │ Drive API  │ Drive API  │ Graph API
      └────────────┴─────┬──────┴────────────┘
                          ▼
        ┌───────────────────────────────────────┐
        │           Next.js App (Vercel)          │
        │  ┌───────────────────────────────────┐ │
        │  │  Provider Adapter Layer             │ │
        │  │  - GoogleDriveAdapter                │ │
        │  │  - OneDriveAdapter                   │ │
        │  │  (implements: list/get/create/update/│ │
        │  │   delete/move/copy/uploadChunk)      │ │
        │  └───────────────────────────────────┘ │
        │  ┌───────────────────────────────────┐ │
        │  │  File Browser UI (dnd-kit)          │ │
        │  └───────────────────────────────────┘ │
        │  ┌───────────────────────────────────┐ │
        │  │  Transfer Engine (cross-provider)   │ │
        │  └───────────────────────────────────┘ │
        │  ┌───────────────────────────────────┐ │
        │  │  Unified API (/api/v1/*)            │ │
        │  └───────────────────────────────────┘ │
        └────────────────────┬─────────────────────┘
                              ▼
                   ┌──────────────────────┐
                   │      Supabase          │
                   │ accounts / file_index  │
                   │ transfer_jobs / tokens │
                   └──────────────────────┘
```

### Inti desain: Provider Adapter Layer
Ini bagian paling penting secara arsitektur. Dibuat satu interface umum, contoh (TypeScript):

```ts
interface StorageAdapter {
  listFiles(folderId: string | null): Promise<UnifiedFile[]>;
  getFile(fileId: string): Promise<UnifiedFile>;
  createFolder(name: string, parentId: string | null): Promise<UnifiedFile>;
  uploadFile(name: string, content: ReadableStream, parentId: string | null): Promise<UnifiedFile>;
  updateContent(fileId: string, content: ReadableStream): Promise<void>;
  rename(fileId: string, newName: string): Promise<void>;
  deleteFile(fileId: string): Promise<void>;
  downloadStream(fileId: string): Promise<ReadableStream>;
  getStorageQuota(): Promise<{ used: number; limit: number }>;
}

class GoogleDriveAdapter implements StorageAdapter { /* pakai googleapis SDK */ }
class OneDriveAdapter implements StorageAdapter { /* pakai @microsoft/microsoft-graph-client */ }
```

Semua fitur di atas (dashboard, transfer engine, API) hanya bicara ke interface `StorageAdapter`, tidak peduli provider aslinya — ini yang membuat sistem gampang di-scale kalau nanti mau tambah provider lain (Dropbox, dsb).

Model data `UnifiedFile` menyeragamkan perbedaan field, misalnya:
| Konsep | Google Drive field | OneDrive field | `UnifiedFile` field |
|---|---|---|---|
| ID file | `id` | `id` | `id` (+ `provider` untuk tahu asalnya) |
| Folder induk | `parents[0]` | `parentReference.id` | `parentId` |
| Ukuran | `size` | `size` | `sizeBytes` |
| Waktu ubah | `modifiedTime` | `lastModifiedDateTime` | `modifiedAt` |
| Link preview | `webViewLink` | `webUrl` | `previewUrl` |

---

## 6. Skema Database (Supabase)

### `accounts`
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | uuid (PK) | |
| provider | text | `'google_drive'` \| `'onedrive'` |
| label | text | "Akun A", "OneDrive Pribadi", dst |
| account_email | text | |
| refresh_token_enc | text | terenkripsi (pgcrypto) |
| access_token_cache | text | |
| token_expiry | timestamptz | |
| storage_used_bytes | bigint | |
| storage_limit_bytes | bigint | |

### `file_index`
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | uuid (PK) | |
| account_id | uuid (FK) | |
| provider_file_id | text | ID asli di provider |
| name | text | |
| mime_type | text | |
| size_bytes | bigint | |
| parent_id | text | nullable (root) |
| is_folder | boolean | |
| modified_time | timestamptz | |
| last_synced_at | timestamptz | |

### `transfer_jobs`
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | uuid (PK) | |
| source_account_id | uuid (FK) | |
| dest_account_id | uuid (FK) | |
| source_provider_file_id | text | |
| operation | text | `'copy'` \| `'move'` |
| status | text | `'queued'`\|`'downloading'`\|`'uploading'`\|`'done'`\|`'failed'` |
| bytes_transferred | bigint | |
| total_bytes | bigint | |
| error_log | text | |
| created_at / updated_at | timestamptz | |

### `api_tokens`
Sama seperti sebelumnya — hash token, scope (`read`, `write`, `delete`).

---

## 7. Transfer Engine Lintas Provider

Sama seperti versi Google-Drive-only sebelumnya, tapi sekarang harus menangani **kombinasi lintas provider** (mis. OneDrive → Google Drive):

1. Ambil `downloadStream` dari `StorageAdapter` sumber (bisa `GoogleDriveAdapter` atau `OneDriveAdapter`).
2. Pipe langsung ke `uploadFile`/upload session milik `StorageAdapter` tujuan.
3. Untuk file besar: gunakan resumable upload session milik provider tujuan (baik Google maupun Microsoft sama-sama mendukung ini), progress disimpan di `transfer_jobs.bytes_transferred` supaya bisa lanjut di invocation berikutnya (mengingat batas durasi serverless function Vercel).
4. Kalau `operation = 'move'` dan upload sukses + ukuran/checksum cocok → panggil `deleteFile` di sumber.

Karena kedua provider punya resumable upload API dengan pola serupa (chunk-based), logikanya bisa cukup diseragamkan di level adapter.

---

## 8. Fitur Dashboard

### 8.1 File Browser 4-Akun
- 4 kolom/tab dengan ikon provider berbeda (Google Drive icon vs OneDrive icon) supaya jelas asalnya.
- Breadcrumb navigasi folder per akun.

### 8.2 Operasi CRUD di UI
- Tombol: New Folder, Upload, Rename (inline edit), Delete (dengan konfirmasi), Replace Content.
- Multi-select untuk operasi batch (hapus/pindah banyak file sekaligus).

### 8.3 Drag & Drop Lintas Provider
- dnd-kit menangani drag dari kolom provider apa pun ke kolom provider apa pun lainnya.
- Modal konfirmasi: Copy atau Move, plus estimasi ukuran & waktu transfer.

### 8.4 Ringkasan Storage Gabungan
- Chart pemakaian tiap 4 akun + total gabungan (termasuk kapasitas OneDrive yang beda basis, misal 1TB vs kapasitas Google Drive Anda).

### 8.5 Riwayat & Retry
- Log semua `transfer_jobs` dan operasi CRUD (opsional audit log terpisah untuk create/delete/rename).

---

## 9. Unified API

```
GET /api/v1/files
  ?account=A|B|C|D|all
  &folder=<id>
  &q=<search>
Header: Authorization: Bearer <token>

Response:
{
  "items": [
    { "id":"...", "provider":"onedrive", "account":"OneDrive D",
      "name":"Proposal.docx", "is_folder":false,
      "size_bytes":184320, "modified_time":"2026-07-10T08:00:00Z" }
  ]
}
```

```
POST   /api/v1/files                 → create folder/file baru {account, parent_id, name, is_folder}
GET    /api/v1/files/:id/download    → stream download konten
PUT    /api/v1/files/:id/content     → replace isi file (edit file biasa)
PATCH  /api/v1/files/:id             → rename / pindah folder dalam akun yang sama
DELETE /api/v1/files/:id             → hapus file
POST   /api/v1/transfer              → {source_account, dest_account, file_id, operation: 'move'|'copy'}
GET    /api/v1/transfer/:job_id      → status progress
GET    /api/v1/storage-summary       → pemakaian & sisa kuota tiap akun + total gabungan
```

Dideploy sebagai Vercel Node.js Serverless Function (bukan Edge — karena butuh streaming besar & SDK Google/Microsoft yang belum tentu kompatibel Edge runtime), tapi tetap otomatis terjangkau global lewat infrastruktur Vercel.

---

## 10. Keamanan

- Refresh token (Google & Microsoft) disimpan terenkripsi (`pgcrypto`/AES) di Supabase, key ada di environment variable Vercel.
- Row Level Security aktif; hanya `service_role` (server-side) yang bisa akses tabel token.
- Client tidak pernah menerima token provider secara langsung — semua request lewat API route Next.js.
- Token API pribadi Anda: hash + scope granular (`read`, `write`, `delete`).
- Audit log untuk operasi destruktif (delete, move-dengan-hapus-sumber).
- Google OAuth consent screen: mode Testing (≤100 test user, cukup 3 email Anda). Azure App Registration: cukup didaftarkan sebagai app personal untuk akun Microsoft Anda sendiri, tidak perlu publish ke Azure AD app gallery.

---

## 11. Kuota & Batasan API

| Provider | Batasan umum | Mitigasi |
|---|---|---|
| Google Drive API | Kuota request per 100 detik per user (cukup besar untuk personal use) | Caching via `file_index`, sync berkala bukan polling terus-menerus |
| Microsoft Graph API | Throttling per aplikasi/user (Microsoft menerapkan limit dinamis, ada header `Retry-After` saat kena throttle) | Implementasi retry-with-backoff otomatis di adapter, caching sama seperti Google |

---

## 12. Roadmap Implementasi

| Fase | Cakupan | Estimasi |
|---|---|---|
| **MVP** | OAuth 3x Google + 1x OneDrive, adapter layer dasar, file browser read-only 4 akun | 1.5–2 minggu |
| **V1.1** | CRUD dasar (create folder, upload, rename, delete) di semua akun | 1 minggu |
| **V1.2** | Drag & drop transfer antar akun (termasuk lintas provider) untuk file kecil–sedang | 1 minggu |
| **V1.3** | Resumable transfer file besar + retry/resume job | 1 minggu |
| **V1.4** | Unified API penuh (CRUD + transfer + storage summary) + token management | 3–5 hari |
| **V1.5** | Search gabungan, riwayat & audit log, threshold alert storage penuh | 3–5 hari |

---

## 13. Risiko & Mitigasi

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Perbedaan model data antar provider (permission, versioning, trash behavior) | Bug tersembunyi saat edge case | Adapter layer disiplin menyeragamkan output, unit test per adapter |
| File besar gagal di tengah transfer lintas provider | File hilang/duplikat | Verifikasi checksum/size sebelum hapus sumber, job status granular |
| Microsoft Graph throttling saat sync besar | Request gagal sementara | Retry-with-backoff, caching agresif |
| Token salah satu provider expired/dicabut | Akun terputus | Deteksi error auth spesifik provider, notifikasi reconnect di dashboard |
| Salah drag ke akun/provider yang salah saat mode "Move" | Kehilangan file dari lokasi awal | Modal konfirmasi wajib + riwayat transfer untuk reverse manual |

---

## 14. Tech Stack Ringkas

- **Frontend**: Next.js 15 (App Router), React, Tailwind, dnd-kit
- **Backend/API**: Next.js Route Handlers (Node.js runtime), Vercel
- **SDK**: `googleapis` (Google Drive), `@microsoft/microsoft-graph-client` + `@azure/msal-node` (OneDrive)
- **Database**: Supabase (Postgres, RLS, pgcrypto)
- **Job/queue**: Tabel `transfer_jobs` + Vercel Cron untuk lanjutkan chunk upload besar
