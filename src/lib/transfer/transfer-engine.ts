import { AdapterFactory, DEFAULT_ACCOUNTS } from '../storage/factory';
import { TransferJob, TransferOperation } from '../storage/types';

// Global in-memory transfer job store for active tasks
declare global {
  var __transferJobsStore: TransferJob[] | undefined;
}

function getJobsStore(): TransferJob[] {
  if (!global.__transferJobsStore) {
    global.__transferJobsStore = [];
  }
  return global.__transferJobsStore;
}

export class TransferEngine {
  public static async createTransferJob(options: {
    sourceAccountId: string;
    destAccountId: string;
    sourceFileId: string;
    destParentId?: string | null;
    operation: TransferOperation;
  }): Promise<TransferJob> {
    const sourceAdapter = AdapterFactory.getAdapter(options.sourceAccountId);
    const destAdapter = AdapterFactory.getAdapter(options.destAccountId);

    const cleanSourceFileId = options.sourceFileId.includes(':') 
      ? options.sourceFileId.split(':').slice(1).join(':') 
      : options.sourceFileId;
    const cleanDestParentId = options.destParentId 
      ? (options.destParentId.includes(':') ? options.destParentId.split(':').slice(1).join(':') : options.destParentId)
      : null;

    const sourceFile = await sourceAdapter.getFile(cleanSourceFileId);
    if (!sourceFile) {
      throw new Error(`Source file ${options.sourceFileId} not found in account ${options.sourceAccountId}`);
    }

    const sourceAcc = DEFAULT_ACCOUNTS.find((a) => a.id === options.sourceAccountId);
    const destAcc = DEFAULT_ACCOUNTS.find((a) => a.id === options.destAccountId);

    const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const job: TransferJob = {
      id: jobId,
      sourceAccountId: options.sourceAccountId,
      sourceAccountLabel: sourceAcc?.label || 'Source',
      destAccountId: options.destAccountId,
      destAccountLabel: destAcc?.label || 'Destination',
      sourceFileId: cleanSourceFileId,
      destParentId: cleanDestParentId,
      fileName: sourceFile.name,
      operation: options.operation,
      status: 'queued',
      bytesTransferred: 0,
      totalBytes: sourceFile.sizeBytes || 1024,
      progressPercent: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    getJobsStore().unshift(job);

    // Execute transfer asynchronously
    this.executeJob(job, sourceFile.name, sourceFile.mimeType).catch((err) => {
      console.error(`Transfer job ${jobId} failed:`, err);
    });

    return job;
  }

  public static getJob(jobId: string): TransferJob | null {
    return getJobsStore().find((j) => j.id === jobId) || null;
  }

  public static getAllJobs(): TransferJob[] {
    return [...getJobsStore()];
  }

  private static async executeJob(job: TransferJob, fileName: string, mimeType: string) {
    try {
      const sourceAdapter = AdapterFactory.getAdapter(job.sourceAccountId);
      const destAdapter = AdapterFactory.getAdapter(job.destAccountId);

      // 1. Downloading phase
      job.status = 'downloading';
      job.updatedAt = new Date().toISOString();
      job.progressPercent = 25;

      const fileData = await sourceAdapter.downloadStream(job.sourceFileId);
      job.bytesTransferred = Math.floor(job.totalBytes * 0.5);
      job.progressPercent = 50;

      // 2. Uploading phase
      job.status = 'uploading';
      job.updatedAt = new Date().toISOString();

      const uploaded = await destAdapter.uploadFile({
        name: fileName,
        mimeType: mimeType || 'application/octet-stream',
        parentId: job.destParentId,
        content: fileData,
        sizeBytes: job.totalBytes,
      });

      job.bytesTransferred = job.totalBytes;
      job.progressPercent = 90;

      // 3. If move operation, delete from source
      if (job.operation === 'move' && uploaded) {
        await sourceAdapter.deleteFile(job.sourceFileId);
      }

      job.status = 'done';
      job.progressPercent = 100;
      job.updatedAt = new Date().toISOString();
    } catch (err: any) {
      job.status = 'failed';
      job.errorLog = err?.message || 'Transfer failed';
      job.updatedAt = new Date().toISOString();
    }
  }
}
