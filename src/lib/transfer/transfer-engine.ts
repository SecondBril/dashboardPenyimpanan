import { AdapterFactory, DEFAULT_ACCOUNTS } from '../storage/factory';
import { TransferJob, TransferOperation } from '../storage/types';
import { 
  fetchTransferJobsFromDb, 
  insertTransferJobToDb, 
  updateTransferJobInDb 
} from '../supabase';

// Global in-memory transfer job store for active tasks
declare global {
  var __transferJobsStore: TransferJob[] | undefined;
  var __transferJobsInitialized: boolean | undefined;
}

function getJobsStore(): TransferJob[] {
  if (!global.__transferJobsStore) {
    global.__transferJobsStore = [];
  }
  return global.__transferJobsStore;
}

export class TransferEngine {
  public static async initFromDb(): Promise<void> {
    if (!global.__transferJobsInitialized) {
      const dbJobs = await fetchTransferJobsFromDb();
      if (dbJobs.length > 0) {
        global.__transferJobsStore = dbJobs;
      }
      global.__transferJobsInitialized = true;
    }
  }

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
    const cleanDestParentId = options.destParentId && options.destParentId !== 'root' 
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

    // Persist to Supabase
    insertTransferJobToDb(job).catch((err) => console.error('Error inserting transfer job to Supabase:', err));

    // Execute transfer asynchronously
    this.executeJob(job, sourceFile.name, sourceFile.mimeType, sourceFile.isFolder).catch((err) => {
      console.error(`Transfer job ${jobId} failed:`, err);
    });

    return job;
  }

  public static getJob(jobId: string): TransferJob | null {
    return getJobsStore().find((j) => j.id === jobId) || null;
  }

  public static getAllJobs(): TransferJob[] {
    if (!global.__transferJobsInitialized) {
      this.initFromDb().catch(() => {});
    }
    return [...getJobsStore()];
  }

  private static async executeJob(
    job: TransferJob, 
    fileName: string, 
    mimeType: string, 
    isFolder: boolean = false
  ) {
    try {
      const sourceAdapter = AdapterFactory.getAdapter(job.sourceAccountId);
      const destAdapter = AdapterFactory.getAdapter(job.destAccountId);

      if (isFolder) {
        // --- 1. FOLDER TRANSFER ---
        job.status = 'uploading';
        job.updatedAt = new Date().toISOString();
        job.progressPercent = 20;
        updateTransferJobInDb(job.id, { status: 'uploading', bytesTransferred: 0 }).catch(() => {});

        const cleanDestParentId = job.destParentId && job.destParentId !== 'root'
          ? (job.destParentId.includes(':') ? job.destParentId.split(':').slice(1).join(':') : job.destParentId)
          : null;

        // Create the folder on the destination
        const createdFolder = await destAdapter.createFolder(fileName, cleanDestParentId);
        const cleanCreatedFolderId = createdFolder.providerFileId 
          || (createdFolder.id.includes(':') ? createdFolder.id.split(':').slice(1).join(':') : createdFolder.id);
        
        job.progressPercent = 40;

        // Recursively transfer items inside this folder
        await this.transferFolderChildren(
          sourceAdapter,
          destAdapter,
          job.sourceFileId,
          cleanCreatedFolderId,
          job.operation,
          job,
          0
        );

        job.progressPercent = 90;

        // If move operation, delete source folder
        if (job.operation === 'move') {
          await sourceAdapter.deleteFile(job.sourceFileId);
        }

        job.status = 'done';
        job.progressPercent = 100;
        job.updatedAt = new Date().toISOString();
        updateTransferJobInDb(job.id, { status: 'done', bytesTransferred: job.totalBytes }).catch(() => {});
        return;
      }

      // --- 2. SINGLE FILE TRANSFER ---
      // 1. Downloading phase
      job.status = 'downloading';
      job.updatedAt = new Date().toISOString();
      job.progressPercent = 25;
      updateTransferJobInDb(job.id, { status: 'downloading', bytesTransferred: job.bytesTransferred }).catch(() => {});

      const fileData = await sourceAdapter.downloadStream(job.sourceFileId);
      job.bytesTransferred = Math.floor(job.totalBytes * 0.5);
      job.progressPercent = 50;

      // 2. Uploading phase
      job.status = 'uploading';
      job.updatedAt = new Date().toISOString();
      updateTransferJobInDb(job.id, { status: 'uploading', bytesTransferred: job.bytesTransferred }).catch(() => {});

      const cleanSingleDestParentId = job.destParentId && job.destParentId !== 'root'
        ? (job.destParentId.includes(':') ? job.destParentId.split(':').slice(1).join(':') : job.destParentId)
        : null;

      const uploaded = await destAdapter.uploadFile({
        name: fileName,
        mimeType: mimeType || 'application/octet-stream',
        parentId: cleanSingleDestParentId,
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
      updateTransferJobInDb(job.id, { status: 'done', bytesTransferred: job.totalBytes }).catch(() => {});
    } catch (err: any) {
      job.status = 'failed';
      job.errorLog = err?.message || 'Transfer failed';
      job.updatedAt = new Date().toISOString();
      updateTransferJobInDb(job.id, { status: 'failed', errorLog: job.errorLog }).catch(() => {});
    }
  }

  private static async transferFolderChildren(
    sourceAdapter: any,
    destAdapter: any,
    sourceFolderId: string,
    destFolderId: string,
    operation: TransferOperation,
    job?: TransferJob,
    depth: number = 0
  ): Promise<void> {
    const cleanSourceFolderId = sourceFolderId.includes(':') 
      ? sourceFolderId.split(':').slice(1).join(':') 
      : sourceFolderId;
    const cleanDestFolderId = destFolderId && destFolderId !== 'root'
      ? (destFolderId.includes(':') ? destFolderId.split(':').slice(1).join(':') : destFolderId)
      : null;

    const children = await sourceAdapter.listFiles(cleanSourceFolderId);
    if (!children || children.length === 0) return;

    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      const cleanChildId = child.providerFileId || (child.id.includes(':') ? child.id.split(':').slice(1).join(':') : child.id);

      try {
        if (child.isFolder) {
          const newSubFolder = await destAdapter.createFolder(child.name, cleanDestFolderId);
          const newSubFolderId = newSubFolder.providerFileId 
            || (newSubFolder.id.includes(':') ? newSubFolder.id.split(':').slice(1).join(':') : newSubFolder.id);

          await this.transferFolderChildren(
            sourceAdapter,
            destAdapter,
            cleanChildId,
            newSubFolderId,
            operation,
            job,
            depth + 1
          );

          if (operation === 'move') {
            await sourceAdapter.deleteFile(cleanChildId);
          }
        } else {
          const stream = await sourceAdapter.downloadStream(cleanChildId);
          await destAdapter.uploadFile({
            name: child.name,
            mimeType: child.mimeType,
            parentId: cleanDestFolderId,
            content: stream,
            sizeBytes: child.sizeBytes,
          });

          if (operation === 'move') {
            await sourceAdapter.deleteFile(cleanChildId);
          }
        }

        // Incrementally update progress for user feedback
        if (job && depth === 0) {
          const stepPercent = 40 + Math.floor(((i + 1) / children.length) * 50);
          job.progressPercent = Math.min(92, stepPercent);
          job.bytesTransferred = (job.bytesTransferred || 0) + (child.sizeBytes || 1024);
          job.updatedAt = new Date().toISOString();
          updateTransferJobInDb(job.id, {
            progressPercent: job.progressPercent,
            bytesTransferred: job.bytesTransferred,
          }).catch(() => {});
        }
      } catch (childErr: any) {
        console.error(`Gagal mentransfer item "${child.name}" di dalam folder:`, childErr);
        // Continue transferring other files in the folder
      }
    }
  }
}
