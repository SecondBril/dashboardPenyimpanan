# PRD Addendum: Estimasi Biaya & Strategi Tetap Gratis

**Versi:** 1.0
**Tanggal:** 9 September 2026
**Berlaku untuk:** PRD-Multi-Cloud-Storage-Hub-v2 + PRD-Addendum-Smart-Auto-Organization

---

## 1. Ringkasan

| Komponen | Bisa gratis? | Catatan |
|---|---|---|
| Vercel (hosting + API) | ✅ Ya, untuk pemakaian personal ringan–sedang | Ada batas yang bisa kena kalau transfer file besar-besaran |
| Supabase (database) | ✅ Ya | Ada 1 risiko: auto-pause setelah 7 hari tidak aktif |
| Google Drive API | ✅ Selalu gratis | Tidak ada biaya API dari Google untuk Drive API itu sendiri |
| Microsoft Graph API (OneDrive) | ✅ Selalu gratis | App registration personal tidak butuh Azure berbayar |
| Gemini API (untuk Smart Classifier) | ✅ Ada free tier, **tapi terpisah** dari langganan Gemini Pro Anda | Lihat §4 |
| Telegram Bot (notifikasi) | ✅ 100% gratis, tanpa batas berarti | |
| Email notifikasi (Resend/dll) | ✅ Free tier cukup besar untuk notifikasi personal (skala ribuan email/bulan) | |

**Kesimpulan singkat:** Untuk pemakaian personal (1 orang, transfer file tidak setiap hari dalam skala puluhan GB), sistem ini **bisa jalan Rp0/bulan**. Titik paling rawan adalah kalau Anda sering mindahin file dalam jumlah besar (puluhan-ratusan GB per bulan) — itu bisa mendekati/lewat limit gratis Vercel.

---

## 2. Detail Vercel (Hobby/Free Plan)

| Limit | Nilai Hobby (gratis) | Relevansi ke sistem Anda |
|---|---|---|
| Durasi maksimal function | Default 10 detik, **bisa dikonfigurasi sampai 60 detik** | Cukup untuk desain resumable-chunk yang sudah direncanakan (§7 PRD utama) |
| Bandwidth ("Fast Data Transfer") | 100 GB/bulan | Ini untuk traffic dashboard, bukan transfer file antar cloud (lihat baris di bawah) |
| **Fast Origin Transfer** (data yang lewat function ke API eksternal) | ~10 GB/bulan | **Ini yang paling relevan** — setiap kali sistem stream file dari Google/OneDrive lewat Vercel function, itu terhitung di sini. Kalau Anda rutin mindahin file besar (video, dsb.) dalam jumlah banyak, 10GB bisa habis cukup cepat |
| Cron Jobs | **Maksimal 2** | Perlu digabung jadi 1-2 job saja: mis. 1 cron gabungan untuk renewal webhook Google+Microsoft, 1 cron untuk lanjutan resumable upload |
| Function Execution (GB-Hrs) | 100 GB-Hrs/bulan | Cukup luas untuk pemakaian personal |
| Ketentuan penggunaan | **Non-komersial / personal only** | Sesuai dengan kebutuhan Anda (personal use) |

### Kapan perlu upgrade ke Vercel Pro (~$20/bulan)
- Kalau rutin transfer file besar (ratusan MB–GB) dalam jumlah sering, sehingga "Fast Origin Transfer" 10GB/bulan kelewat.
- Kalau butuh cron job lebih dari 2.
- Kalau butuh durasi function lebih dari 60 detik untuk chunk yang lebih besar (Pro bisa sampai 300 detik).

**Strategi menyiasati di free tier:** perkecil ukuran chunk resumable upload (mis. 4–8MB per chunk) supaya lebih banyak file bisa diproses tanpa buru-buru kena limit durasi; gabungkan tugas cron; dan pertimbangkan menaikkan threshold auto-organization dulu di awal supaya tidak terlalu sering trigger transfer otomatis untuk file-file kecil yang sebenarnya tidak krusial dipindah cepat.

---

## 3. Detail Supabase (Free Plan)

| Limit | Nilai Free | Relevansi |
|---|---|---|
| Database Postgres | 500 MB | Cukup besar untuk metadata (`file_index`, `transfer_jobs`, dll — ini semua teks/angka, bukan file asli, jadi ringan) |
| File Storage (Supabase Storage) | 1 GB | Sebaiknya **tidak dipakai untuk menyimpan file asli** dari Drive/OneDrive Anda — desain sistem ini memang streaming langsung antar provider, Supabase Storage cukup untuk log/cache kecil saja |
| Egress | 5 GB/bulan | Trafik keluar dari Supabase (bukan dari Vercel) — biasanya aman karena yang berat (transfer file) lewat Vercel↔Google/Microsoft langsung, bukan lewat Supabase |
| **Auto-pause setelah 7 hari tanpa request API** | ⚠️ Ini yang perlu diantisipasi | Kalau project "tidur", webhook Google/Microsoft yang masuk lewat Vercel tidak akan bisa nulis ke database (gagal), auto-organization jadi berhenti diam-diam |

### Mitigasi auto-pause
Tambahkan 1 tugas kecil di cron job Vercel yang sudah ada (gabungkan, jangan bikin cron baru karena limit 2 di atas): setiap beberapa hari, lakukan 1 query ringan ke Supabase (mis. `SELECT 1`) supaya dihitung sebagai aktivitas dan project tidak di-pause. Ini legal dan lazim dilakukan untuk keep-alive di free tier.

### Kapan perlu upgrade ke Supabase Pro ($25/bulan)
- Kalau database mendekati 500MB (kemungkinan kecil untuk kasus Anda, karena isinya metadata saja).
- Kalau Anda ingin kepastian 100% tidak pernah ke-pause tanpa bergantung trik keep-alive.

---

## 4. Soal Gemini API untuk Smart Classifier — Ini Penting

**Langganan Gemini Pro (Google One AI Premium) yang Anda punya di 3 akun itu BEDA dari Gemini API.**

- **Gemini Pro (konsumen)** = akses ke aplikasi gemini.google.com dengan model lebih canggih & kuota chat lebih besar. Ini **tidak otomatis memberi kuota/akses API developer**.
- **Gemini API (developer, via Google AI Studio)** = yang dipakai sistem ini untuk Smart Classifier. Ini **punya free tier tersendiri**, terpisah dari langganan konsumen Anda, tersedia untuk negara yang eligible, dengan limit contohnya (model Flash): puluhan request/menit dan ribuan request/hari — **lebih dari cukup** untuk kebutuhan klasifikasi file personal (paling banter puluhan file baru per hari).
- Anda **tidak perlu bayar tambahan apa pun** untuk fitur Smart Classifier selama pemakaian personal, dan **tidak perlu upgrade dari 3 akun Gemini Pro yang sudah ada** — cukup buat 1 API key gratis dari Google AI Studio (bisa pakai akun Google mana saja, termasuk salah satu dari 3 akun Anda).
- Rule-based classifier (§6 addendum sebelumnya) sengaja diprioritaskan duluan sebelum panggil AI — ini juga strategi hemat kuota API.

---

## 5. Ringkasan Strategi "Tetap Gratis"

1. **Rule-based dulu, AI belakangan** — hemat panggilan Gemini API.
2. **Streaming langsung, jangan numpuk file di Supabase Storage** — hemat kuota storage & egress Supabase.
3. **Chunk kecil untuk resumable upload** — supaya tetap masuk durasi function 60 detik Vercel Hobby.
4. **Gabungkan cron job** jadi maksimal 2, salah satunya rangkap fungsi keep-alive Supabase.
5. **Pantau "Fast Origin Transfer" di dashboard Vercel** setiap bulan — ini satu-satunya angka yang benar-benar perlu diawasi kalau pola pemakaian Anda mulai sering transfer file berukuran besar.
6. Kalau nanti kepakainya jadi jauh lebih intensif dari perkiraan, upgrade termurah yang relevan adalah **Vercel Pro (~$20/bulan)** — bukan Supabase, karena kemungkinan besar Supabase free tier sudah lebih dari cukup untuk metadata-only workload ini.

---

## 6. Estimasi Skenario Realistis

Asumsi pemakaian personal: buka dashboard beberapa kali seminggu, transfer file beberapa kali seminggu (total < 5GB/bulan), klasifikasi otomatis untuk < 100 file baru/bulan.

**→ Estimasi biaya bulanan: Rp0.** Semua komponen di atas nyaman berada di bawah limit free tier masing-masing pada skenario ini.
