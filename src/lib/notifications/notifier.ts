import { NotificationItem, ClassificationJob } from '../storage/types';
import { TransferEngine } from '../transfer/transfer-engine';
import { 
  fetchNotificationsFromDb, 
  insertNotificationToDb, 
  markNotificationReadInDb, 
  markAllNotificationsReadInDb,
  fetchClassificationJobsFromDb,
  insertClassificationJobToDb,
  updateClassificationJobInDb 
} from '../supabase';

const DEFAULT_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif_1',
    title: 'Multi-Cloud Hub Siap Digunakan',
    message: '3 akun Google Drive dan 2 akun OneDrive terhubung dalam dashboard terpadu.',
    type: 'info',
    channel: 'in_app',
    isRead: false,
    createdAt: new Date().toISOString(),
  },
];

declare global {
  var __notificationsStore: NotificationItem[] | undefined;
  var __notificationsInitialized: boolean | undefined;
  var __classificationJobsStore: ClassificationJob[] | undefined;
  var __classificationJobsInitialized: boolean | undefined;
}

function getNotificationsStore(): NotificationItem[] {
  if (!global.__notificationsStore) {
    global.__notificationsStore = [...DEFAULT_NOTIFICATIONS];
  }
  return global.__notificationsStore;
}

export function getClassificationJobsStore(): ClassificationJob[] {
  if (!global.__classificationJobsStore) {
    global.__classificationJobsStore = [];
  }
  return global.__classificationJobsStore;
}

export class Notifier {
  public static async initFromDb(): Promise<void> {
    if (!global.__notificationsInitialized) {
      const dbNotifs = await fetchNotificationsFromDb(DEFAULT_NOTIFICATIONS);
      global.__notificationsStore = dbNotifs;
      global.__notificationsInitialized = true;
    }
    if (!global.__classificationJobsInitialized) {
      const dbJobs = await fetchClassificationJobsFromDb();
      if (dbJobs.length > 0) {
        global.__classificationJobsStore = dbJobs;
      }
      global.__classificationJobsInitialized = true;
    }
  }

  public static getNotifications(): NotificationItem[] {
    if (!global.__notificationsInitialized) {
      this.initFromDb().catch(() => {});
    }
    return getNotificationsStore();
  }

  public static getUnreadCount(): number {
    return getNotificationsStore().filter((n) => !n.isRead).length;
  }

  public static markAsRead(id: string): boolean {
    const store = getNotificationsStore();
    const item = store.find((n) => n.id === id);
    if (!item) return false;
    item.isRead = true;
    markNotificationReadInDb(id).catch(() => {});
    return true;
  }

  public static markAllAsRead(): void {
    getNotificationsStore().forEach((n) => {
      n.isRead = true;
    });
    markAllNotificationsReadInDb().catch(() => {});
  }

  public static async notify(item: Omit<NotificationItem, 'id' | 'createdAt' | 'isRead'>): Promise<NotificationItem> {
    const newNotif: NotificationItem = {
      ...item,
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      isRead: false,
      createdAt: new Date().toISOString(),
    };

    getNotificationsStore().unshift(newNotif);
    insertNotificationToDb(newNotif).catch(() => {});

    // If Telegram is configured, send external notification
    if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
      try {
        const text = `🔔 *${newNotif.title}*\n${newNotif.message}`;
        await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: process.env.TELEGRAM_CHAT_ID,
            text,
            parse_mode: 'Markdown',
          }),
        });
      } catch (err) {
        console.error('Failed to send Telegram notification:', err);
      }
    }

    return newNotif;
  }

  /**
   * Executes Undo for an auto-moved or suggested file
   */
  public static async undoClassificationJob(classificationJobId: string): Promise<{ success: boolean; message: string }> {
    const jobs = getClassificationJobsStore();
    const job = jobs.find((j) => j.id === classificationJobId);
    if (!job) {
      return { success: false, message: 'Classification job not found' };
    }

    if (job.action === 'undone') {
      return { success: false, message: 'Job has already been undone' };
    }

    try {
      // Move file back from predicted target account to original account
      await TransferEngine.createTransferJob({
        sourceAccountId: job.predictedTargetAccountId,
        destAccountId: job.originalAccountId,
        sourceFileId: job.originalFileId,
        destParentId: job.originalFolderId,
        operation: 'move',
      });

      job.action = 'undone';
      updateClassificationJobInDb(job.id, { action: 'undone' }).catch(() => {});

      await this.notify({
        title: 'Undo Berhasil',
        message: `File "${job.fileName}" telah dikembalikan ke lokasi asalnya.`,
        type: 'success',
        channel: 'in_app',
      });

      return { success: true, message: `File "${job.fileName}" berhasil dikembalikan.` };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Undo operation failed' };
    }
  }

  /**
   * Approves a suggested organization move
   */
  public static async approveClassificationJob(classificationJobId: string): Promise<{ success: boolean; message: string }> {
    const jobs = getClassificationJobsStore();
    const job = jobs.find((j) => j.id === classificationJobId);
    if (!job) {
      return { success: false, message: 'Classification job not found' };
    }

    try {
      await TransferEngine.createTransferJob({
        sourceAccountId: job.originalAccountId,
        destAccountId: job.predictedTargetAccountId,
        sourceFileId: job.originalFileId,
        destParentId: job.predictedTargetFolderId,
        operation: 'move',
      });

      job.action = 'auto_moved';
      updateClassificationJobInDb(job.id, { action: 'auto_moved' }).catch(() => {});

      await this.notify({
        title: 'Saran Disetujui',
        message: `File "${job.fileName}" telah dipindahkan ke folder "${job.predictedTargetFolderName}".`,
        type: 'success',
        channel: 'in_app',
      });

      return { success: true, message: 'Saran pemindahan berhasil disetujui.' };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Approval failed' };
    }
  }
}
