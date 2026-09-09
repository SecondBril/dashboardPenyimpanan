import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { 
  AccountInfo, 
  OrganizationRule, 
  TransferJob, 
  NotificationItem, 
  ClassificationJob, 
  SystemSettings 
} from './storage/types';

// Supabase environment keys
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey;

let supabaseInstance: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (supabaseInstance) return supabaseInstance;
  if (!supabaseUrl || !supabaseServiceKey) return null;

  supabaseInstance = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return supabaseInstance;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && (supabaseServiceKey || supabaseAnonKey));
}

// ============================================================================
// ACCOUNTS REPOSITORY
// ============================================================================

export async function fetchAccountsFromDb(defaultFallback: AccountInfo[]): Promise<AccountInfo[]> {
  const client = getSupabase();
  if (!client) return defaultFallback;

  try {
    const { data, error } = await client
      .from('accounts')
      .select('*')
      .order('created_at', { ascending: true });

    if (error || !data || data.length === 0) {
      console.warn('Supabase accounts empty or error, seeding defaults:', error?.message);
      await seedDefaultAccounts(defaultFallback);
      return defaultFallback;
    }

    // If less than 5 accounts exist in DB, ensure 5th account is upserted
    if (data.length < defaultFallback.length) {
      await seedDefaultAccounts(defaultFallback);
      const { data: refetched } = await client
        .from('accounts')
        .select('*')
        .order('created_at', { ascending: true });
      if (refetched && refetched.length > 0) {
        return refetched.map(mapDbAccountToAccountInfo);
      }
    }

    return data.map(mapDbAccountToAccountInfo);
  } catch (err) {
    console.error('Failed to fetch accounts from Supabase:', err);
    return defaultFallback;
  }
}

export async function seedDefaultAccounts(accounts: AccountInfo[]): Promise<void> {
  const client = getSupabase();
  if (!client) return;

  try {
    const records = accounts.map((a) => ({
      id: a.id,
      provider: a.provider,
      label: a.label,
      account_email: a.email,
      storage_used_bytes: a.storageUsedBytes,
      storage_limit_bytes: a.storageLimitBytes,
      color_code: a.colorCode,
      updated_at: new Date().toISOString(),
    }));

    await client.from('accounts').upsert(records, { onConflict: 'id' });
  } catch (err) {
    console.error('Failed to seed default accounts in Supabase:', err);
  }
}

export async function syncAccountQuotaToDb(
  accountId: string, 
  usedBytes: number, 
  limitBytes: number
): Promise<void> {
  const client = getSupabase();
  if (!client) return;

  try {
    await client
      .from('accounts')
      .update({
        storage_used_bytes: usedBytes,
        storage_limit_bytes: limitBytes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', accountId);
  } catch (err) {
    console.error(`Failed to sync storage quota for account ${accountId}:`, err);
  }
}

function mapDbAccountToAccountInfo(row: any): AccountInfo {
  return {
    id: row.id,
    provider: row.provider,
    label: row.label,
    email: row.account_email || '',
    storageUsedBytes: Number(row.storage_used_bytes || 0),
    storageLimitBytes: Number(row.storage_limit_bytes || 16106127360),
    colorCode: row.color_code || '#3b82f6',
    status: 'connected',
  };
}

// ============================================================================
// ORGANIZATION RULES REPOSITORY
// ============================================================================

export async function fetchRulesFromDb(defaultFallback: OrganizationRule[]): Promise<OrganizationRule[]> {
  const client = getSupabase();
  if (!client) return defaultFallback;

  try {
    const { data, error } = await client
      .from('organization_rules')
      .select('*, accounts(label)')
      .order('created_at', { ascending: true });

    if (error || !data || data.length === 0) {
      return defaultFallback;
    }

    return data.map((r: any) => ({
      id: r.id,
      name: r.name,
      conditionType: r.condition_type,
      conditionValue: r.condition_value,
      sourceFolderFilter: r.source_folder_filter,
      targetAccountId: r.target_account_id,
      targetAccountLabel: r.accounts?.label || 'Target Account',
      targetFolderId: r.target_folder_id,
      targetFolderName: r.target_folder_name,
      enabled: r.enabled ?? true,
      createdAt: r.created_at,
    }));
  } catch (err) {
    console.error('Failed to fetch organization rules from Supabase:', err);
    return defaultFallback;
  }
}

export async function insertRuleToDb(
  rule: Omit<OrganizationRule, 'id' | 'createdAt'>
): Promise<OrganizationRule | null> {
  const client = getSupabase();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from('organization_rules')
      .insert({
        name: rule.name,
        condition_type: rule.conditionType,
        condition_value: rule.conditionValue,
        source_folder_filter: rule.sourceFolderFilter || null,
        target_account_id: rule.targetAccountId,
        target_folder_id: rule.targetFolderId,
        target_folder_name: rule.targetFolderName,
        enabled: rule.enabled ?? true,
      })
      .select()
      .single();

    if (error || !data) return null;

    return {
      id: data.id,
      name: data.name,
      conditionType: data.condition_type,
      conditionValue: data.condition_value,
      sourceFolderFilter: data.source_folder_filter,
      targetAccountId: data.target_account_id,
      targetAccountLabel: rule.targetAccountLabel,
      targetFolderId: data.target_folder_id,
      targetFolderName: data.target_folder_name,
      enabled: data.enabled,
      createdAt: data.created_at,
    };
  } catch (err) {
    console.error('Failed to insert rule in Supabase:', err);
    return null;
  }
}

export async function updateRuleInDb(id: string, updates: Partial<OrganizationRule>): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;

  try {
    const payload: any = {};
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.conditionType !== undefined) payload.condition_type = updates.conditionType;
    if (updates.conditionValue !== undefined) payload.condition_value = updates.conditionValue;
    if (updates.enabled !== undefined) payload.enabled = updates.enabled;
    if (updates.targetFolderId !== undefined) payload.target_folder_id = updates.targetFolderId;
    if (updates.targetFolderName !== undefined) payload.target_folder_name = updates.targetFolderName;

    const { error } = await client.from('organization_rules').update(payload).eq('id', id);
    return !error;
  } catch (err) {
    console.error('Failed to update rule in Supabase:', err);
    return false;
  }
}

export async function deleteRuleInDb(id: string): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;

  try {
    const { error } = await client.from('organization_rules').delete().eq('id', id);
    return !error;
  } catch (err) {
    console.error('Failed to delete rule in Supabase:', err);
    return false;
  }
}

// ============================================================================
// TRANSFER JOBS REPOSITORY
// ============================================================================

export async function fetchTransferJobsFromDb(): Promise<TransferJob[]> {
  const client = getSupabase();
  if (!client) return [];

  try {
    const { data, error } = await client
      .from('transfer_jobs')
      .select('*, source:accounts!source_account_id(label), dest:accounts!dest_account_id(label)')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error || !data) return [];

    return data.map((j: any) => ({
      id: j.id,
      sourceAccountId: j.source_account_id,
      sourceAccountLabel: j.source?.label || 'Source',
      destAccountId: j.dest_account_id,
      destAccountLabel: j.dest?.label || 'Destination',
      sourceFileId: j.source_provider_file_id,
      destParentId: j.dest_parent_id,
      fileName: j.file_name,
      operation: j.operation,
      status: j.status,
      bytesTransferred: Number(j.bytes_transferred || 0),
      totalBytes: Number(j.total_bytes || 0),
      progressPercent: j.total_bytes > 0 ? Math.min(100, Math.round((Number(j.bytes_transferred || 0) / Number(j.total_bytes)) * 100)) : (j.status === 'done' ? 100 : 0),
      errorLog: j.error_log,
      createdAt: j.created_at,
      updatedAt: j.updated_at,
    }));
  } catch (err) {
    console.error('Failed to fetch transfer jobs from Supabase:', err);
    return [];
  }
}

export async function insertTransferJobToDb(job: TransferJob): Promise<void> {
  const client = getSupabase();
  if (!client) return;

  try {
    // Only insert if valid UUID or let DB generate UUID if custom
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(job.id);
    const payload: any = {
      source_account_id: job.sourceAccountId,
      dest_account_id: job.destAccountId,
      source_provider_file_id: job.sourceFileId,
      dest_parent_id: job.destParentId || null,
      file_name: job.fileName,
      operation: job.operation,
      status: job.status,
      bytes_transferred: job.bytesTransferred,
      total_bytes: job.totalBytes,
      error_log: job.errorLog || null,
      created_at: job.createdAt,
      updated_at: job.updatedAt,
    };
    if (isUuid) {
      payload.id = job.id;
    }

    const { data } = await client.from('transfer_jobs').insert(payload).select().single();
    if (data?.id) {
      job.id = data.id;
    }
  } catch (err) {
    console.error('Failed to insert transfer job in Supabase:', err);
  }
}

export async function updateTransferJobInDb(jobId: string, updates: Partial<TransferJob>): Promise<void> {
  const client = getSupabase();
  if (!client) return;

  try {
    const payload: any = { updated_at: new Date().toISOString() };
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.bytesTransferred !== undefined) payload.bytes_transferred = updates.bytesTransferred;
    if (updates.totalBytes !== undefined) payload.total_bytes = updates.totalBytes;
    if (updates.errorLog !== undefined) payload.error_log = updates.errorLog;

    await client.from('transfer_jobs').update(payload).eq('id', jobId);
  } catch (err) {
    console.error(`Failed to update transfer job ${jobId} in Supabase:`, err);
  }
}

// ============================================================================
// NOTIFICATIONS REPOSITORY
// ============================================================================

export async function fetchNotificationsFromDb(fallback: NotificationItem[]): Promise<NotificationItem[]> {
  const client = getSupabase();
  if (!client) return fallback;

  try {
    const { data, error } = await client
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(30);

    if (error || !data || data.length === 0) return fallback;

    return data.map((n: any) => ({
      id: n.id,
      title: n.title,
      message: n.message,
      type: n.type,
      channel: n.channel,
      isRead: n.is_read,
      actionData: n.action_data,
      createdAt: n.created_at,
    }));
  } catch (err) {
    console.error('Failed to fetch notifications from Supabase:', err);
    return fallback;
  }
}

export async function insertNotificationToDb(notif: NotificationItem): Promise<void> {
  const client = getSupabase();
  if (!client) return;

  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(notif.id);
    const payload: any = {
      title: notif.title,
      message: notif.message,
      type: notif.type,
      channel: notif.channel,
      is_read: notif.isRead,
      action_data: notif.actionData || null,
      created_at: notif.createdAt,
    };
    if (isUuid) payload.id = notif.id;

    const { data } = await client.from('notifications').insert(payload).select().single();
    if (data?.id) notif.id = data.id;
  } catch (err) {
    console.error('Failed to insert notification in Supabase:', err);
  }
}

export async function markNotificationReadInDb(id: string): Promise<void> {
  const client = getSupabase();
  if (!client) return;

  try {
    await client.from('notifications').update({ is_read: true }).eq('id', id);
  } catch (err) {
    console.error(`Failed to mark notification ${id} read in Supabase:`, err);
  }
}

export async function markAllNotificationsReadInDb(): Promise<void> {
  const client = getSupabase();
  if (!client) return;

  try {
    await client.from('notifications').update({ is_read: true }).eq('is_read', false);
  } catch (err) {
    console.error('Failed to mark all notifications read in Supabase:', err);
  }
}

// ============================================================================
// CLASSIFICATION JOBS REPOSITORY
// ============================================================================

export async function fetchClassificationJobsFromDb(): Promise<ClassificationJob[]> {
  const client = getSupabase();
  if (!client) return [];

  try {
    const { data, error } = await client
      .from('classification_jobs')
      .select('*, predicted:accounts!predicted_target_account_id(label), original:accounts!original_account_id(label)')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error || !data) return [];

    return data.map((j: any) => ({
      id: j.id,
      fileName: j.file_name,
      method: j.method,
      predictedTargetAccountId: j.predicted_target_account_id,
      predictedTargetAccountLabel: j.predicted?.label || 'Target Account',
      predictedTargetFolderId: j.predicted_target_folder_id || '',
      predictedTargetFolderName: j.predicted_target_folder_name || 'Folder',
      confidence: Number(j.confidence || 1),
      action: j.action,
      originalAccountId: j.original_account_id,
      originalAccountLabel: j.original?.label || 'Source Account',
      originalFolderId: j.original_folder_id,
      originalFileId: j.original_provider_file_id || '',
      createdAt: j.created_at,
    }));
  } catch (err) {
    console.error('Failed to fetch classification jobs from Supabase:', err);
    return [];
  }
}

export async function insertClassificationJobToDb(job: ClassificationJob): Promise<void> {
  const client = getSupabase();
  if (!client) return;

  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(job.id);
    const payload: any = {
      file_name: job.fileName,
      method: job.method,
      predicted_target_account_id: job.predictedTargetAccountId,
      predicted_target_folder_id: job.predictedTargetFolderId,
      predicted_target_folder_name: job.predictedTargetFolderName,
      confidence: job.confidence,
      action: job.action,
      original_account_id: job.originalAccountId,
      original_folder_id: job.originalFolderId,
      original_provider_file_id: job.originalFileId,
      created_at: job.createdAt,
      updated_at: new Date().toISOString(),
    };
    if (isUuid) payload.id = job.id;

    const { data } = await client.from('classification_jobs').insert(payload).select().single();
    if (data?.id) job.id = data.id;
  } catch (err) {
    console.error('Failed to insert classification job in Supabase:', err);
  }
}

export async function updateClassificationJobInDb(jobId: string, updates: Partial<ClassificationJob>): Promise<void> {
  const client = getSupabase();
  if (!client) return;

  try {
    const payload: any = { updated_at: new Date().toISOString() };
    if (updates.action !== undefined) payload.action = updates.action;

    await client.from('classification_jobs').update(payload).eq('id', jobId);
  } catch (err) {
    console.error(`Failed to update classification job ${jobId} in Supabase:`, err);
  }
}

// ============================================================================
// SYSTEM SETTINGS REPOSITORY
// ============================================================================

export async function fetchSettingsFromDb(fallback: SystemSettings): Promise<SystemSettings> {
  const client = getSupabase();
  if (!client) return fallback;

  try {
    const { data, error } = await client
      .from('settings')
      .select('*')
      .eq('id', 1)
      .single();

    if (error || !data) return fallback;

    return {
      autoMoveThreshold: Number(data.auto_move_threshold || 0.85),
      suggestThreshold: Number(data.suggest_threshold || 0.50),
      excludedFolders: data.excluded_folders || [],
      notificationChannels: data.notification_channels || ['in_app', 'telegram'],
    };
  } catch (err) {
    console.error('Failed to fetch settings from Supabase:', err);
    return fallback;
  }
}

export async function updateSettingsInDb(settings: SystemSettings): Promise<void> {
  const client = getSupabase();
  if (!client) return;

  try {
    await client
      .from('settings')
      .upsert({
        id: 1,
        auto_move_threshold: settings.autoMoveThreshold,
        suggest_threshold: settings.suggestThreshold,
        excluded_folders: settings.excludedFolders,
        notification_channels: settings.notificationChannels,
        updated_at: new Date().toISOString(),
      });
  } catch (err) {
    console.error('Failed to update settings in Supabase:', err);
  }
}
