-- ==============================================================================
-- Migration 003: Revert to 4 Accounts (3x Google Drive + 1x OneDrive)
-- Menghapus akun ke-5 (OneDrive E) sehingga kembali ke 4 akun default
-- ==============================================================================

-- 1. Hapus akun OneDrive E (Akun ke-5)
DELETE FROM accounts 
WHERE id = 'a0000000-0000-0000-0000-000000000005';

-- 2. Pastikan 4 Akun Utama Tetap Terdaftar
INSERT INTO accounts (id, provider, label, account_email, color_code, storage_limit_bytes, is_active)
VALUES 
  ('a0000000-0000-0000-0000-000000000001', 'google_drive', 'Google Drive A (Utama)', 'ag4863017@gmail.com', '#2563eb', 5497558138880, true),
  ('a0000000-0000-0000-0000-000000000002', 'google_drive', 'Google Drive B (Media)', 'rinpattinson98@gmail.com', '#059669', 5497558138880, true),
  ('a0000000-0000-0000-0000-000000000003', 'google_drive', 'Google Drive C (Arsip)', 'jkeluar77@gmail.com', '#d97706', 5497558138880, true),
  ('a0000000-0000-0000-0000-000000000004', 'onedrive', 'OneDrive D (Pribadi)', 'personal@outlook.com', '#0284c7', 107374182400, true)
ON CONFLICT (id) DO UPDATE SET
  label = EXCLUDED.label,
  provider = EXCLUDED.provider,
  account_email = EXCLUDED.account_email,
  color_code = EXCLUDED.color_code,
  storage_limit_bytes = EXCLUDED.storage_limit_bytes,
  is_active = true;
