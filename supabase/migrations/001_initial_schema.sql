-- =========================================================
-- Multi-Cloud Storage Hub - Initial Supabase Migration
-- Supports 3x Google Drive + 1x OneDrive
-- =========================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Accounts Table (4 Accounts: 3 Google Drive + 1 OneDrive)
CREATE TABLE IF NOT EXISTS accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider TEXT NOT NULL CHECK (provider IN ('google_drive', 'onedrive')),
    label TEXT NOT NULL,
    account_email TEXT,
    refresh_token_enc TEXT,
    access_token_cache TEXT,
    token_expiry TIMESTAMPTZ,
    storage_used_bytes BIGINT DEFAULT 0,
    storage_limit_bytes BIGINT DEFAULT 16106127360, -- default 15GB in bytes
    color_code TEXT DEFAULT '#3b82f6',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. File Index (Cache and metadata synchronization)
CREATE TABLE IF NOT EXISTS file_index (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    provider_file_id TEXT NOT NULL,
    name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size_bytes BIGINT DEFAULT 0,
    parent_id TEXT, -- Null indicates root
    is_folder BOOLEAN DEFAULT FALSE,
    preview_url TEXT,
    modified_time TIMESTAMPTZ DEFAULT NOW(),
    last_synced_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(account_id, provider_file_id)
);

CREATE INDEX IF NOT EXISTS idx_file_index_account_parent ON file_index(account_id, parent_id);
CREATE INDEX IF NOT EXISTS idx_file_index_name ON file_index(name);

-- 3. Transfer Jobs (Cross-account & cross-provider transfers)
CREATE TABLE IF NOT EXISTS transfer_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    dest_account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    source_provider_file_id TEXT NOT NULL,
    dest_parent_id TEXT,
    file_name TEXT NOT NULL,
    operation TEXT NOT NULL CHECK (operation IN ('copy', 'move')),
    status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'downloading', 'uploading', 'done', 'failed', 'cancelled')),
    bytes_transferred BIGINT DEFAULT 0,
    total_bytes BIGINT DEFAULT 0,
    error_log TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transfer_jobs_status ON transfer_jobs(status);

-- 4. API Tokens (For personal developer access)
CREATE TABLE IF NOT EXISTS api_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token_hash TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    scopes TEXT[] DEFAULT ARRAY['read', 'write'],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);

-- 5. Organization Rules (Rule-based classification)
CREATE TABLE IF NOT EXISTS organization_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    condition_type TEXT NOT NULL CHECK (condition_type IN ('mime_type', 'filename_keyword', 'extension')),
    condition_value TEXT NOT NULL,
    source_folder_filter TEXT,
    target_account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    target_folder_id TEXT NOT NULL,
    target_folder_name TEXT NOT NULL,
    enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Classification Jobs (Tracks auto-organization & supports Undo)
CREATE TABLE IF NOT EXISTS classification_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_index_id UUID REFERENCES file_index(id) ON DELETE SET NULL,
    file_name TEXT NOT NULL,
    method TEXT NOT NULL CHECK (method IN ('rule', 'ai')),
    predicted_target_account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
    predicted_target_folder_id TEXT,
    predicted_target_folder_name TEXT,
    confidence NUMERIC(4, 3) DEFAULT 1.0,
    action TEXT NOT NULL CHECK (action IN ('auto_moved', 'suggested', 'ignored', 'undone')),
    original_account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
    original_folder_id TEXT,
    original_provider_file_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Notifications (In-app, telegram, email)
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    classification_job_id UUID REFERENCES classification_jobs(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'action_required')),
    channel TEXT NOT NULL DEFAULT 'in_app' CHECK (channel IN ('in_app', 'email', 'telegram')),
    is_read BOOLEAN DEFAULT FALSE,
    action_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);

-- 8. System Settings
CREATE TABLE IF NOT EXISTS settings (
    id INT PRIMARY KEY DEFAULT 1,
    auto_move_threshold NUMERIC(3, 2) DEFAULT 0.85,
    suggest_threshold NUMERIC(3, 2) DEFAULT 0.50,
    excluded_folders TEXT[] DEFAULT ARRAY[]::TEXT[],
    notification_channels TEXT[] DEFAULT ARRAY['in_app', 'telegram']::TEXT[],
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default settings if not exists
INSERT INTO settings (id, auto_move_threshold, suggest_threshold, excluded_folders, notification_channels)
VALUES (1, 0.85, 0.50, ARRAY[]::TEXT[], ARRAY['in_app', 'telegram']::TEXT[])
ON CONFLICT (id) DO NOTHING;

-- Seed Data: 4 Accounts (3x Google Drive + 1x OneDrive)
INSERT INTO accounts (id, provider, label, account_email, storage_used_bytes, storage_limit_bytes, color_code)
VALUES
    ('a0000000-0000-0000-0000-000000000001', 'google_drive', 'Google Drive A (Utama / Kerja)', 'work.drive@gmail.com', 8589934592, 16106127360, '#2563eb'),
    ('a0000000-0000-0000-0000-000000000002', 'google_drive', 'Google Drive B (Media & Foto)', 'media.vault@gmail.com', 12884901888, 16106127360, '#059669'),
    ('a0000000-0000-0000-0000-000000000003', 'google_drive', 'Google Drive C (Arsip & Backup)', 'archive.backup@gmail.com', 4294967296, 16106127360, '#d97706'),
    ('a0000000-0000-0000-0000-000000000004', 'onedrive', 'OneDrive D (Pribadi & Dokumen)', 'personal@outlook.com', 21474836480, 107374182400, '#0284c7')
ON CONFLICT (id) DO NOTHING;
