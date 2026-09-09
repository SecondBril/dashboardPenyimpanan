-- =========================================================
-- Multi-Cloud Storage Hub - Seed & Upsert 5 Accounts
-- Supports 3x Google Drive + 2x OneDrive
-- =========================================================

-- Upsert all 5 accounts into the accounts table
INSERT INTO accounts (id, provider, label, account_email, storage_used_bytes, storage_limit_bytes, color_code)
VALUES
    (
        'a0000000-0000-0000-0000-000000000001',
        'google_drive',
        'Google Drive A (Utama / Kerja)',
        'ag4863017@gmail.com',
        24180424704,
        5497558138880,
        '#2563eb'
    ),
    (
        'a0000000-0000-0000-0000-000000000002',
        'google_drive',
        'Google Drive B (Media & Foto)',
        'rinpattinson98@gmail.com',
        10485760,
        5497558138880,
        '#059669'
    ),
    (
        'a0000000-0000-0000-0000-000000000003',
        'google_drive',
        'Google Drive C (Arsip & Backup)',
        'jkeluar77@gmail.com',
        0,
        5497558138880,
        '#d97706'
    ),
    (
        'a0000000-0000-0000-0000-000000000004',
        'onedrive',
        'OneDrive D (Pribadi & Dokumen)',
        'personal@outlook.com',
        21474836480,
        107374182400,
        '#0284c7'
    ),
    (
        'a0000000-0000-0000-0000-000000000005',
        'onedrive',
        'OneDrive E (Proyek & Kantor)',
        'onedrive.work@outlook.com',
        0,
        107374182400,
        '#8b5cf6'
    )
ON CONFLICT (id) DO UPDATE SET
    provider = EXCLUDED.provider,
    label = EXCLUDED.label,
    account_email = EXCLUDED.account_email,
    storage_limit_bytes = EXCLUDED.storage_limit_bytes,
    color_code = EXCLUDED.color_code,
    updated_at = NOW();
