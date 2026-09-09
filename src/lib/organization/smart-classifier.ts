import { UnifiedFile, ClassificationJob, SystemSettings } from '../storage/types';
import { RuleEngine } from './rule-engine';
import { TransferEngine } from '../transfer/transfer-engine';
import { Notifier, getClassificationJobsStore } from '../notifications/notifier';
import { DEFAULT_ACCOUNTS } from '../storage/factory';

// Default system settings
declare global {
  var __systemSettingsStore: SystemSettings | undefined;
}

export function getSystemSettings(): SystemSettings {
  if (!global.__systemSettingsStore) {
    global.__systemSettingsStore = {
      autoMoveThreshold: 0.85,
      suggestThreshold: 0.50,
      excludedFolders: [],
      notificationChannels: ['in_app', 'telegram'],
    };
  }
  return global.__systemSettingsStore;
}

export function updateSystemSettings(updates: Partial<SystemSettings>): SystemSettings {
  const current = getSystemSettings();
  global.__systemSettingsStore = { ...current, ...updates };
  return global.__systemSettingsStore;
}

export class SmartClassifier {
  /**
   * Process a new or modified file through two-stage classification (Rules -> AI)
   */
  public static async processFile(file: UnifiedFile): Promise<ClassificationJob | null> {
    const settings = getSystemSettings();

    // Check if parent folder is excluded from auto-organization
    if (file.parentId && settings.excludedFolders.includes(file.parentId)) {
      return null;
    }

    // --- STAGE 1: Rule-Based Evaluation ---
    const matchedRule = RuleEngine.matchFile(file);
    if (matchedRule) {
      const isAlreadyInTarget = 
        file.accountId === matchedRule.targetAccountId && 
        file.parentId === matchedRule.targetFolderId;

      if (!isAlreadyInTarget) {
        const jobId = `cls_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const job: ClassificationJob = {
          id: jobId,
          fileName: file.name,
          method: 'rule',
          predictedTargetAccountId: matchedRule.targetAccountId,
          predictedTargetAccountLabel: matchedRule.targetAccountLabel,
          predictedTargetFolderId: matchedRule.targetFolderId,
          predictedTargetFolderName: matchedRule.targetFolderName,
          confidence: 1.0,
          action: 'auto_moved',
          originalAccountId: file.accountId,
          originalFolderId: file.parentId,
          originalFileId: file.id,
          createdAt: new Date().toISOString(),
        };

        getClassificationJobsStore().unshift(job);

        // Execute move via TransferEngine
        await TransferEngine.createTransferJob({
          sourceAccountId: file.accountId,
          destAccountId: matchedRule.targetAccountId,
          sourceFileId: file.id,
          destParentId: matchedRule.targetFolderId,
          operation: 'move',
        });

        // Notify user with Undo action
        await Notifier.notify({
          classificationJobId: jobId,
          title: '📦 File Otomatis Dipindahkan',
          message: `"${file.name}" dipindahkan ke "${matchedRule.targetFolderName}" (${matchedRule.targetAccountLabel}) sesuai aturan "${matchedRule.name}".`,
          type: 'info',
          channel: 'in_app',
          actionData: {
            canUndo: true,
            classificationJobId: jobId,
          },
        });

        return job;
      }
    }

    // --- STAGE 2: Smart/AI-Based Contextual Classification ---
    const aiPrediction = await this.predictTargetWithAI(file);
    if (!aiPrediction) return null;

    const isAlreadyInTarget = 
      file.accountId === aiPrediction.targetAccountId && 
      file.parentId === aiPrediction.targetFolderId;

    if (isAlreadyInTarget) return null;

    const jobId = `cls_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const action = aiPrediction.confidence >= settings.autoMoveThreshold
      ? 'auto_moved'
      : aiPrediction.confidence >= settings.suggestThreshold
      ? 'suggested'
      : 'ignored';

    const job: ClassificationJob = {
      id: jobId,
      fileName: file.name,
      method: 'ai',
      predictedTargetAccountId: aiPrediction.targetAccountId,
      predictedTargetAccountLabel: aiPrediction.targetAccountLabel,
      predictedTargetFolderId: aiPrediction.targetFolderId,
      predictedTargetFolderName: aiPrediction.targetFolderName,
      confidence: aiPrediction.confidence,
      action,
      originalAccountId: file.accountId,
      originalFolderId: file.parentId,
      originalFileId: file.id,
      createdAt: new Date().toISOString(),
    };

    getClassificationJobsStore().unshift(job);

    if (action === 'auto_moved') {
      await TransferEngine.createTransferJob({
        sourceAccountId: file.accountId,
        destAccountId: aiPrediction.targetAccountId,
        sourceFileId: file.id,
        destParentId: aiPrediction.targetFolderId,
        operation: 'move',
      });

      await Notifier.notify({
        classificationJobId: jobId,
        title: '🤖 Smart Auto-Move Berhasil',
        message: `File "${file.name}" diklasifikasikan ke "${aiPrediction.targetFolderName}" (${aiPrediction.targetAccountLabel}) dengan confidence ${Math.round(aiPrediction.confidence * 100)}%.`,
        type: 'success',
        channel: 'in_app',
        actionData: {
          canUndo: true,
          classificationJobId: jobId,
        },
      });
    } else if (action === 'suggested') {
      await Notifier.notify({
        classificationJobId: jobId,
        title: '💡 Saran Pemindahan File',
        message: `File "${file.name}" sepertinya cocok di "${aiPrediction.targetFolderName}" (${aiPrediction.targetAccountLabel}) [Confidence: ${Math.round(aiPrediction.confidence * 100)}%].`,
        type: 'action_required',
        channel: 'in_app',
        actionData: {
          canApprove: true,
          classificationJobId: jobId,
        },
      });
    }

    return job;
  }

  private static async predictTargetWithAI(file: UnifiedFile): Promise<{
    targetAccountId: string;
    targetAccountLabel: string;
    targetFolderId: string;
    targetFolderName: string;
    confidence: number;
  } | null> {
    // If Gemini API Key is provided, call Gemini API
    const geminiKey = process.env.GEMINI_API_KEY;
    const fileName = file.name.toLowerCase();

    if (geminiKey) {
      try {
        const prompt = `You are a file organization classifier. Classify this file:
Filename: ${file.name}
MIME: ${file.mimeType}
Size: ${file.sizeBytes} bytes

Available Targets:
1. ID: a0000000-0000-0000-0000-000000000001, Folder: gda_fld_1, Name: "Dokumen Proyek PKL" (Work documents, specs, thesis)
2. ID: a0000000-0000-0000-0000-000000000001, Folder: gda_fld_2, Name: "Keuangan & Invoice" (Invoices, receipts, financial records)
3. ID: a0000000-0000-0000-0000-000000000002, Folder: gdb_fld_1, Name: "Foto Dokumentasi PKL" (Photos, event pictures)
4. ID: a0000000-0000-0000-0000-000000000002, Folder: gdb_fld_2, Name: "Asset Banner & Logo" (Design assets, vectors, icons)
5. ID: a0000000-0000-0000-0000-000000000003, Folder: gdc_fld_1, Name: "Database Backups 2026" (SQL, archives, zips)
6. ID: a0000000-0000-0000-0000-000000000004, Folder: odd_fld_1, Name: "Dokumen Penting & Sertifikat" (Official certificates, contracts, personal identity)
7. ID: a0000000-0000-0000-0000-000000000004, Folder: odd_fld_2, Name: "Spreadsheet Finansial" (Excel, sheets, budgets)

Return JSON ONLY in format:
{"targetIndex": 1, "confidence": 0.92}`;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: 'application/json' }
          }),
        });

        if (response.ok) {
          const resData = await response.json();
          const text = resData.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            const parsed = JSON.parse(text);
            const targetMap: Record<number, any> = {
              1: { targetAccountId: 'a0000000-0000-0000-0000-000000000001', targetAccountLabel: 'Google Drive A (Utama)', targetFolderId: 'gda_fld_1', targetFolderName: 'Dokumen Proyek PKL' },
              2: { targetAccountId: 'a0000000-0000-0000-0000-000000000001', targetAccountLabel: 'Google Drive A (Utama)', targetFolderId: 'gda_fld_2', targetFolderName: 'Keuangan & Invoice' },
              3: { targetAccountId: 'a0000000-0000-0000-0000-000000000002', targetAccountLabel: 'Google Drive B (Media)', targetFolderId: 'gdb_fld_1', targetFolderName: 'Foto Dokumentasi PKL' },
              4: { targetAccountId: 'a0000000-0000-0000-0000-000000000002', targetAccountLabel: 'Google Drive B (Media)', targetFolderId: 'gdb_fld_2', targetFolderName: 'Asset Banner & Logo' },
              5: { targetAccountId: 'a0000000-0000-0000-0000-000000000003', targetAccountLabel: 'Google Drive C (Arsip)', targetFolderId: 'gdc_fld_1', targetFolderName: 'Database Backups 2026' },
              6: { targetAccountId: 'a0000000-0000-0000-0000-000000000004', targetAccountLabel: 'OneDrive D (Pribadi)', targetFolderId: 'odd_fld_1', targetFolderName: 'Dokumen Penting & Sertifikat' },
              7: { targetAccountId: 'a0000000-0000-0000-0000-000000000004', targetAccountLabel: 'OneDrive D (Pribadi)', targetFolderId: 'odd_fld_2', targetFolderName: 'Spreadsheet Finansial' },
            };

            const target = targetMap[parsed.targetIndex];
            if (target) {
              return {
                ...target,
                confidence: Number(parsed.confidence || 0.88),
              };
            }
          }
        }
      } catch (err) {
        console.error('Gemini API call error, falling back to heuristic engine:', err);
      }
    }

    // Heuristic Contextual Classifier Fallback
    if (fileName.includes('proposal') || fileName.includes('laporan') || fileName.includes('skripsi') || fileName.includes('tugas') || fileName.includes('srs')) {
      return {
        targetAccountId: 'a0000000-0000-0000-0000-000000000001',
        targetAccountLabel: 'Google Drive A (Utama)',
        targetFolderId: 'gda_fld_1',
        targetFolderName: 'Dokumen Proyek PKL',
        confidence: 0.91,
      };
    }

    if (fileName.includes('tagihan') || fileName.includes('bayar') || fileName.includes('receipt') || fileName.includes('pajak')) {
      return {
        targetAccountId: 'a0000000-0000-0000-0000-000000000001',
        targetAccountLabel: 'Google Drive A (Utama)',
        targetFolderId: 'gda_fld_2',
        targetFolderName: 'Keuangan & Invoice',
        confidence: 0.89,
      };
    }

    if (fileName.endsWith('.xlsx') || fileName.endsWith('.csv') || fileName.includes('budget') || fileName.includes('anggaran')) {
      return {
        targetAccountId: 'a0000000-0000-0000-0000-000000000004',
        targetAccountLabel: 'OneDrive D (Pribadi)',
        targetFolderId: 'odd_fld_2',
        targetFolderName: 'Spreadsheet Finansial',
        confidence: 0.86,
      };
    }

    if (fileName.includes('foto') || fileName.includes('liburan') || fileName.includes('event') || fileName.includes('dokumentasi')) {
      return {
        targetAccountId: 'a0000000-0000-0000-0000-000000000002',
        targetAccountLabel: 'Google Drive B (Media)',
        targetFolderId: 'gdb_fld_1',
        targetFolderName: 'Foto Dokumentasi PKL',
        confidence: 0.88,
      };
    }

    if (fileName.endsWith('.sql') || fileName.endsWith('.tar') || fileName.includes('dump') || fileName.includes('backup')) {
      return {
        targetAccountId: 'a0000000-0000-0000-0000-000000000003',
        targetAccountLabel: 'Google Drive C (Arsip)',
        targetFolderId: 'gdc_fld_1',
        targetFolderName: 'Database Backups 2026',
        confidence: 0.94,
      };
    }

    // Default suggestion with moderate confidence
    if (file.mimeType.startsWith('image/')) {
      return {
        targetAccountId: 'a0000000-0000-0000-0000-000000000002',
        targetAccountLabel: 'Google Drive B (Media)',
        targetFolderId: 'gdb_fld_2',
        targetFolderName: 'Asset Banner & Logo',
        confidence: 0.72,
      };
    }

    return null;
  }
}
